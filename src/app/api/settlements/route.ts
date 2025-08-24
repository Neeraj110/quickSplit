/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/connectDb";
import { User } from "@/models/User";
import { Expense } from "@/models/Expense";
import { Group } from "@/models/Group";
import { Settlement, ISettlement } from "@/models/Settlement";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { Types } from "mongoose";
import { z } from "zod";
import mongoose from "mongoose";
import { ISplit } from "@/types/type";

const SettlementSchema = z.object({
  payerId: z.string().refine((id) => Types.ObjectId.isValid(id), {
    message: "Invalid payer ID format",
  }),
  receiverId: z.string().refine((id) => Types.ObjectId.isValid(id), {
    message: "Invalid receiver ID format",
  }),
  groupId: z.string().refine((id) => Types.ObjectId.isValid(id), {
    message: "Invalid group ID format",
  }),
  amount: z
    .number()
    .positive("Amount must be positive")
    .max(1000000, "Amount too large"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(200, "Description too long"),
  paymentMethod: z.enum([
    "cash",
    "bank_transfer",
    "upi",
    "paypal",
    "venmo",
    "other",
  ]),
  paymentDate: z.string().transform((str) => new Date(str)),
  notes: z.string().optional(),
  expenseIds: z.array(z.string()).optional(),
});

// POST: Create a new settlement
export async function POST(req: NextRequest) {
  let dbSession: mongoose.ClientSession | null = null;

  try {
    await connectDb();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const settlementData = SettlementSchema.parse(body);
    console.log("Creating settlement with data:", settlementData);

    // Verify users and group exist
    const [payer, receiver, group] = await Promise.all([
      User.findById(settlementData.payerId),
      User.findById(settlementData.receiverId),
      Group.findById(settlementData.groupId),
    ]);

    if (!payer || !receiver || !group) {
      return NextResponse.json(
        { error: "Payer, receiver, or group not found" },
        { status: 404 }
      );
    }

    const currentUserId = currentUser._id.toString();
    if (
      currentUserId !== settlementData.payerId &&
      currentUserId !== settlementData.receiverId
    ) {
      return NextResponse.json(
        { error: "You can only create settlements involving yourself" },
        { status: 403 }
      );
    }

    if (
      !group.members.some((m: Types.ObjectId) =>
        m.equals(settlementData.payerId)
      ) ||
      !group.members.some((m: Types.ObjectId) =>
        m.equals(settlementData.receiverId)
      )
    ) {
      return NextResponse.json(
        { error: "Both users must be members of the group" },
        { status: 400 }
      );
    }

    const expenses = await Expense.find({
      groupId: settlementData.groupId,
    }).lean();
    let expenseBalance = 0;
    for (const expense of expenses) {
      const expensePayerId = expense.payerId.toString();
      const splits = expense.splits;

      const payerSplit = splits.find(
        (s: ISplit) => s.userId.toString() === settlementData.payerId
      );
      const receiverSplit = splits.find(
        (s: ISplit) => s.userId.toString() === settlementData.receiverId
      );

      if (expensePayerId === settlementData.payerId && receiverSplit) {
        expenseBalance -= receiverSplit.amount;
      }

      if (expensePayerId === settlementData.receiverId && payerSplit) {
        expenseBalance += payerSplit.amount;
      }
    }

    // Get existing settlements between these users (force fresh query)
    const { netBalance } = await Settlement.calculateBalance(
      new Types.ObjectId(settlementData.groupId),
      new Types.ObjectId(settlementData.payerId),
      new Types.ObjectId(settlementData.receiverId)
    );

    const outstandingBalance = expenseBalance - netBalance;

    if (outstandingBalance <= 0) {
      return NextResponse.json(
        {
          error:
            outstandingBalance < 0
              ? `Invalid settlement direction. ${receiver.name} owes ${
                  payer.name
                } ₹${Math.abs(outstandingBalance).toFixed(
                  2
                )}, not the other way around.`
              : "No outstanding balance between these users",
          suggestedDirection:
            outstandingBalance < 0
              ? {
                  correctPayerId: settlementData.receiverId,
                  correctReceiverId: settlementData.payerId,
                  amount: Math.abs(outstandingBalance),
                }
              : null,
        },
        { status: 400 }
      );
    }

    const maxSettlementAmount = outstandingBalance;

    if (settlementData.amount > maxSettlementAmount + 0.01) {
      return NextResponse.json(
        {
          error: `Settlement amount (₹${settlementData.amount.toFixed(
            2
          )}) exceeds outstanding balance (₹${maxSettlementAmount.toFixed(2)})`,
          maxAmount: maxSettlementAmount,
          details: {
            expenseBalance,
            existingSettlements: netBalance,
            outstandingBalance,
          },
        },
        { status: 400 }
      );
    }

    if (maxSettlementAmount < 0.01) {
      return NextResponse.json(
        {
          error: "No outstanding balance to settle between these users",
          maxAmount: 0,
        },
        { status: 400 }
      );
    }

    dbSession = await mongoose.startSession();
    let createdSettlement: ISettlement | undefined;
    await dbSession.withTransaction(async () => {
      const settlement = new Settlement({
        groupId: settlementData.groupId,
        payerId: settlementData.payerId,
        receiverId: settlementData.receiverId,
        amount: settlementData.amount,
        description: settlementData.description,
        currency: "INR",
        paymentMethod: settlementData.paymentMethod,
        paymentDate: settlementData.paymentDate,
        notes: settlementData.notes,
        status: "settled",
        expenseId: settlementData.expenseIds || [],
      });

      await settlement.save({ session: dbSession });
      if (settlementData.expenseIds && settlementData.expenseIds.length > 0) {
        let remainingAmount = settlementData.amount;

        for (const expId of settlementData.expenseIds) {
          if (remainingAmount <= 0) break;

          const expense = await Expense.findById(expId).session(dbSession);
          if (!expense) continue;

          expense.splits = expense.splits.map((split: ISplit) => {
            if (
              split.userId.toString() === settlementData.payerId.toString() &&
              remainingAmount > 0
            ) {
              const reduceAmt = Math.min(split.amount, remainingAmount);
              split.amount -= reduceAmt;
              remainingAmount -= reduceAmt;
            }
            return split;
          });

          await expense.save({ session: dbSession });
        }
      }
      createdSettlement = settlement;
    });

    if (!createdSettlement) {
      throw new Error("Settlement creation failed");
    }

    const populatedSettlement = await Settlement.findById(createdSettlement._id)
      .populate("payerId", "name email")
      .populate("receiverId", "name email")
      .populate("groupId", "name")
      .lean();

    if (!populatedSettlement) {
      throw new Error("Failed to populate settlement data");
    }

    return NextResponse.json(
      {
        settlement: populatedSettlement,
        message: `Settlement of ₹${settlementData.amount.toFixed(
          2
        )} recorded successfully via ${settlementData.paymentMethod}`,
        remainingBalance: Math.max(
          0,
          maxSettlementAmount - settlementData.amount
        ),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating settlement:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create settlement",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  } finally {
    if (dbSession) await dbSession.endSession();
  }
}

// Add these interfaces at the top of your file
interface PopulatedUser {
  _id: string;
  name: string;
  email: string;
}

interface PopulatedGroup {
  _id: string;
  name: string;
}

interface PopulatedSettlement {
  _id: string;
  payerId: PopulatedUser;
  receiverId: PopulatedUser;
  groupId: PopulatedGroup;
  amount: number;
  description: string;
  paymentMethod: string;
  paymentDate: string;
  notes?: string;
  status: string;
  expenseId: string[];
  createdAt: string;
  updatedAt: string;
}

// Fix the GET function - replace the formattedSettlements mapping
export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");
    const status = searchParams.get("status");

    const query: any = {
      $or: [{ payerId: currentUser._id }, { receiverId: currentUser._id }],
    };
    if (groupId) query.groupId = groupId;
    if (status) query.status = status;

    const [settlements, userGroups] = await Promise.all([
      Settlement.find(query)
        .populate("payerId", "name email")
        .populate("receiverId", "name email")
        .populate("groupId", "name")
        .sort({ createdAt: -1 })
        .lean(),
      Group.find({ members: currentUser._id })
        .select("_id name members")
        .lean(),
    ]);

    // Type the settlements properly
    const typedSettlements = settlements as unknown as PopulatedSettlement[];

    // Calculate outstanding balances
    const balancesByGroup = new Map();
    for (const group of userGroups) {
      const balances = [];
      for (const memberId of group.members) {
        if (memberId.toString() === currentUser._id.toString()) continue;
        const member = await User.findById(memberId)
          .select("name email")
          .lean();
        if (!member) continue;

        const expenses = await Expense.find({ groupId: group._id }).lean();
        let user1OwesUser2 = 0;
        for (const expense of expenses) {
          const payerId =
            expense.payerId?.toString() || expense.paidBy?.toString();
          if (!payerId) continue;

          const splits = expense.splits;
          const user1Split = splits.find(
            (s: ISplit) => s.userId.toString() === currentUser._id.toString()
          );
          const user2Split = splits.find(
            (s: ISplit) => s.userId.toString() === memberId.toString()
          );

          if (payerId === currentUser._id.toString() && user2Split) {
            user1OwesUser2 -= user2Split.amount;
          } else if (payerId === memberId.toString() && user1Split) {
            user1OwesUser2 += user1Split.amount;
          }
        }

        const { netBalance } = await Settlement.calculateBalance(
          new Types.ObjectId(group._id as string),
          new Types.ObjectId(currentUser._id),
          memberId
        );
        const balance = user1OwesUser2 - netBalance;

        if (Math.abs(balance) > 0.01) {
          const relatedExpenses = expenses
            .filter((expense) => {
              const payerId = expense.payerId?.toString();
              return (
                payerId === currentUser._id.toString() ||
                payerId === memberId.toString()
              );
            })
            .map((expense) => expense._id);

          balances.push({
            type: balance > 0 ? "you_owe" : "owes_you",
            person: member.name,
            personId: memberId,
            amount: Math.abs(balance),
            group: group.name,
            groupId: group._id,
            expenseIds: relatedExpenses,
          });
        }
      }
      if (balances.length > 0) {
        balancesByGroup.set(group._id.toString(), balances);
      }
    }

    // Fixed: Properly format settlements with all required fields
    const formattedSettlements = typedSettlements.map((settlement) => {
      const isCurrentUserPayer =
        settlement.payerId._id.toString() === currentUser._id.toString();

      return {
        _id: settlement._id,
        type: isCurrentUserPayer ? "you_paid" : "paid_you",
        person: isCurrentUserPayer
          ? settlement.receiverId.name
          : settlement.payerId.name, // Added missing field
        personId: isCurrentUserPayer
          ? settlement.receiverId._id
          : settlement.payerId._id,
        amount: settlement.amount,
        group: settlement.groupId.name, // Added missing field
        groupId: settlement.groupId._id,
        expenseId: settlement.expenseId,
        description: settlement.description,
        paymentMethod: settlement.paymentMethod,
        paymentDate: settlement.paymentDate,
        notes: settlement.notes,
        status: settlement.status,
        createdAt: settlement.createdAt,
        updatedAt: settlement.updatedAt,
      };
    });

    const outstandingBalances = Array.from(balancesByGroup.values()).flat();

    return NextResponse.json(
      {
        settlements: formattedSettlements,
        outstandingBalances,
        summary: {
          totalOwed: outstandingBalances
            .filter((b) => b.type === "owes_you")
            .reduce((sum, b) => sum + b.amount, 0),
          totalOwing: outstandingBalances
            .filter((b) => b.type === "you_owe")
            .reduce((sum, b) => sum + b.amount, 0),
          settledCount: formattedSettlements.filter(
            (s) => s.status === "settled"
          ).length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching settlements:", error);
    return NextResponse.json(
      { error: "Failed to fetch settlements" },
      { status: 500 }
    );
  }
}
