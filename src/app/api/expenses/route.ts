import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/connectDb";
import { User } from "@/models/User";
import { Expense } from "@/models/Expense";
import { Group } from "@/models/Group";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { Types } from "mongoose";
import { uploadReceipt } from "@/lib/cloudinary";
import { z } from "zod";
import mongoose from "mongoose";

interface ISplit {
  userId: Types.ObjectId;
  amount: number;
}

const SplitSchema = z.object({
  userId: z.string().refine((id) => Types.ObjectId.isValid(id), {
    message: "Invalid user ID format",
  }),
  amount: z
    .number()
    .positive("Split amount must be positive")
    .max(1000000, "Split amount too large"),
});

const ExpenseFormSchema = z.object({
  groupId: z.string().refine((id) => Types.ObjectId.isValid(id), {
    message: "Invalid group ID format",
  }),
  payerId: z.string().refine((id) => Types.ObjectId.isValid(id), {
    message: "Invalid payer ID format",
  }),
  amount: z
    .number()
    .positive("Amount must be positive")
    .max(1000000, "Amount too large"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(200, "Description must be less than 200 characters")
    .transform((str) => str.trim().replace(/[<>]/g, "")),
  category: z
    .enum([
      "Food",
      "Transport",
      "Entertainment",
      "Utilities",
      "Shopping",
      "Health",
      "General",
    ])
    .default("General"),
  currency: z
    .enum(["USD", "EUR", "GBP", "INR", "CAD", "AUD", "JPY"])
    .default("INR"),
  splitType: z.enum(["equal", "custom"]).default("equal"),
  splits: z.array(SplitSchema).optional(),
});

const FileSchema = z.object({
  size: z.number().max(5 * 1024 * 1024, "File size must be less than 5MB"),
  type: z
    .enum(["image/jpeg", "image/png", "image/webp"])
    .refine((val) => ["image/jpeg", "image/png", "image/webp"].includes(val), {
      message: "Only JPEG, PNG, WebP files are allowed",
    }),
});

export async function POST(req: NextRequest) {
  let dbSession: mongoose.ClientSession | null = null;
  try {
    await connectDb();

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();
    const receiptFile = form.get("receipt") as File | null;

    let rawSplits: ISplit[] = [];
    const rawSplitsStr = form.get("splits") as string;
    if (rawSplitsStr && rawSplitsStr.trim() !== "") {
      try {
        rawSplits = JSON.parse(rawSplitsStr);
        if (!Array.isArray(rawSplits)) {
          return NextResponse.json(
            { error: "Splits must be an array" },
            { status: 400 }
          );
        }
      } catch (error) {
        return NextResponse.json(
          { error: "Invalid splits JSON format", details: error },
          { status: 400 }
        );
      }
    }

    const rawData = {
      groupId: form.get("groupId") as string,
      payerId: form.get("payerId") as string,
      amount: parseFloat(form.get("amount") as string),
      description: form.get("description") as string,
      category: (form.get("category") as string) || "General",
      currency: (form.get("currency") as string) || "INR",
      splitType: form.get("splitType") as string,
      splits: rawSplits.length > 0 ? rawSplits : undefined,
    };

    // Additional validation for required fields
    if (!rawData.payerId || rawData.payerId.trim() === "") {
      return NextResponse.json(
        { error: "Payer ID is required" },
        { status: 400 }
      );
    }

    if (!rawData.groupId || rawData.groupId.trim() === "") {
      return NextResponse.json(
        { error: "Group ID is required" },
        { status: 400 }
      );
    }

    let formData;
    try {
      formData = ExpenseFormSchema.parse(rawData);
    } catch (error) {
      console.error("Validation error:", error);
      return NextResponse.json(
        { error: "Validation failed", details: error },
        { status: 400 }
      );
    }

    if (
      formData.splitType === "custom" &&
      (!formData.splits || formData.splits.length === 0)
    ) {
      return NextResponse.json(
        { error: "Custom splits are required when split type is 'custom'" },
        { status: 400 }
      );
    }

    if (receiptFile && receiptFile.size > 0) {
      try {
        FileSchema.parse({
          size: receiptFile.size,
          type: receiptFile.type,
        });
      } catch (error) {
        console.error("File validation error:", error);
        return NextResponse.json({ error: error }, { status: 400 });
      }
    }

    // Get the current user (person creating the expense)
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify the group exists and current user is a member
    const group = await Group.findById(formData.groupId);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (!group.members.includes(currentUser._id as Types.ObjectId)) {
      return NextResponse.json(
        { error: "You are not a member of this group" },
        { status: 403 }
      );
    }

    // Verify the specified payer is a member of the group
    const payerObjectId = new Types.ObjectId(formData.payerId);
    if (!group.members.some((member) => member.equals(payerObjectId))) {
      return NextResponse.json(
        { error: "Specified payer is not a member of this group" },
        { status: 400 }
      );
    }

    // Verify the payer exists in the database
    const payer = await User.findById(payerObjectId);
    if (!payer) {
      return NextResponse.json(
        { error: "Specified payer not found" },
        { status: 404 }
      );
    }

    const totalAmount = formData.amount;
    let finalSplits: { userId: Types.ObjectId; amount: number }[] = [];

    if (formData.splitType === "equal") {
      // Include ALL group members in equal split
      const memberCount = group.members.length;
      if (memberCount === 0) {
        return NextResponse.json(
          { error: "No members in group" },
          { status: 400 }
        );
      }

      const equalShare = parseFloat((totalAmount / memberCount).toFixed(2));

      // Calculate splits for all members
      finalSplits = group.members.map(
        (memberId: Types.ObjectId, index: number) => {
          // For the last member, adjust for rounding differences
          const amount =
            index === memberCount - 1
              ? parseFloat(
                  (totalAmount - equalShare * (memberCount - 1)).toFixed(2)
                )
              : equalShare;

          return {
            userId: memberId,
            amount: amount,
          };
        }
      );
    } else if (formData.splitType === "custom") {
      const customSplits = formData.splits!;
      const totalSplit = customSplits.reduce(
        (sum, split) => sum + split.amount,
        0
      );

      if (Math.abs(totalSplit - totalAmount) > 0.01) {
        return NextResponse.json(
          {
            error: `Custom split total (${totalSplit}) does not match expense amount (${totalAmount})`,
            splitTotal: totalSplit,
            expenseAmount: totalAmount,
            difference: Math.abs(totalSplit - totalAmount),
          },
          { status: 400 }
        );
      }

      // Validate all custom splits
      for (const split of customSplits) {
        const splitUserId = new Types.ObjectId(split.userId);

        if (!group.members.some((member) => member.equals(splitUserId))) {
          console.error(`Validation failed: User ${split.userId} not in group`);
          return NextResponse.json(
            { error: `User ${split.userId} is not a member of this group` },
            { status: 400 }
          );
        }

        if (split.amount <= 0) {
          console.error(
            `Validation failed: Non-positive split amount for user ${split.userId}`
          );
          return NextResponse.json(
            { error: `Split amount must be positive for user ${split.userId}` },
            { status: 400 }
          );
        }
      }

      // Store all custom splits
      finalSplits = customSplits.map((split) => ({
        userId: new Types.ObjectId(split.userId),
        amount: split.amount,
      }));
    }

    if (finalSplits.length === 0) {
      return NextResponse.json(
        { error: "No valid splits generated" },
        { status: 500 }
      );
    }

    let receiptUrl: string | undefined;
    if (receiptFile && receiptFile.size > 0) {
      try {
        receiptUrl = await uploadReceipt(receiptFile);
      } catch (error) {
        return NextResponse.json(
          { error: error || "Failed to upload receipt. Please try again." },
          { status: 500 }
        );
      }
    }

    dbSession = await mongoose.startSession();

    let createdExpense;
    await dbSession.withTransaction(async () => {
      const expenseData = {
        groupId: formData.groupId,
        amount: totalAmount,
        currency: formData.currency,
        description: formData.description,
        category: formData.category,
        payerId: payerObjectId, // Use the specified payer, not the current user
        createdBy: currentUser._id, // Track who created the expense
        splits: finalSplits,
        splitType: formData.splitType,
        receiptUrl,
      };

      const expense = new Expense(expenseData);
      await expense.save({ session: dbSession });

      await Group.findByIdAndUpdate(
        formData.groupId,
        {
          $push: { expenses: expense._id },
          $inc: { totalSpent: totalAmount },
        },
        { session: dbSession }
      );

      createdExpense = expense;
    });

    return NextResponse.json(
      {
        ...createdExpense!.toObject(),
        message: `Expense created successfully with ${formData.splitType} split. ${payer.name} was set as the payer.`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating expense:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error,
          message: "Please check your input data",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 }
    );
  } finally {
    if (dbSession) await dbSession.endSession();
  }
}

export async function GET() {
  try {
    await connectDb();
    const session = await getServerSession(authOptions);
    if (!session?.user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await User.findOne({ email: session.user.email });
    if (!user)
      return NextResponse.json({ error: "User not found" }, { status: 404 });

    const groupIds = (
      await Group.find({ members: user._id }).select("_id").lean()
    ).map((g) => g._id);

    const expenses = await Expense.find({ groupId: { $in: groupIds } })
      .populate("payerId", "name email")
      .populate("groupId", "name _id")
      .populate("splits.userId", "name email")
      .lean();

    const formatted = expenses.map((e) => ({
      _id: e._id,
      groupId: e.groupId._id,
      groupName: e.groupId.name,
      amount: e.amount,
      description: e.description,
      category: e.category,
      currency: e.currency,
      paidBy: e.payerId,
      splitType: e.splitType,
      splits: e.splits.map((s: ISplit) => ({
        userId: s.userId._id,
        user: s.userId,
        amount: s.amount,
      })),
      receipt: e.receiptUrl,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    }));

    return NextResponse.json(formatted, { status: 200 });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}
