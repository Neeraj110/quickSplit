// src/app/api/expenses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/connectDb";
import { User } from "@/models/User";
import { Expense } from "@/models/Expense";
import { Group } from "@/models/Group";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { Types } from "mongoose";
import { deleteReceipt, uploadReceipt } from "@/lib/cloudinary";
import { z } from "zod";
import mongoose from "mongoose";

const SplitSchema = z.object({
  userId: z.string().refine((val) => Types.ObjectId.isValid(val), {
    message: "Invalid user ID format",
  }),
  amount: z
    .number()
    .positive("Split amount must be positive")
    .max(1000000, "Split amount too large"),
});

// Move FileSchema inside the function scope or make it internal
const FileSchema = z.object({
  size: z.number().max(5 * 1024 * 1024, "File size must be less than 5MB"),
  type: z
    .enum(["image/jpeg", "image/png", "image/webp"])
    .refine((val) => ["image/jpeg", "image/png", "image/webp"].includes(val), {
      message: "Only JPEG, PNG, WebP files are allowed",
    }),
});

const ExpenseUpdateSchema = z.object({
  amount: z
    .number()
    .positive("Amount must be positive")
    .max(1000000, "Amount too large"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(200, "Description must be less than 200 characters")
    .transform((str) => str.trim().replace(/[<>]/g, "")),
  groupId: z.string().refine((val) => Types.ObjectId.isValid(val), {
    message: "Invalid group ID format",
  }),
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
  receipt: z
    .object({
      size: z.number().max(5 * 1024 * 1024, "File size must be less than 5MB"),
      type: z
        .enum(["image/jpeg", "image/png", "image/webp"])
        .refine(
          (val) => ["image/jpeg", "image/png", "image/webp"].includes(val),
          {
            message: "Only JPEG, PNG, WebP files are allowed",
          }
        ),
    })
    .optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let dbSession: mongoose.ClientSession | null = null;

  try {
    await connectDb();

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid expense ID format" },
        { status: 400 }
      );
    }

    const [user, expense] = await Promise.all([
      User.findOne({ email: session.user.email }),
      Expense.findById(id),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const group = await Group.findById(expense.groupId);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (!expense.payerId.equals(user._id) && !group.admin.equals(user._id)) {
      return NextResponse.json(
        {
          error:
            "Access denied: Only expense payer or group admin can update this expense",
        },
        { status: 403 }
      );
    }

    let formData;
    try {
      const body = await req.json();
      formData = ExpenseUpdateSchema.parse(body);
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

    if (
      formData.splitType === "equal" &&
      formData.splits &&
      formData.splits.length > 0
    ) {
      return NextResponse.json(
        { error: "Splits should not be provided when split type is 'equal'" },
        { status: 400 }
      );
    }

    const targetGroup = await Group.findById(formData.groupId);
    if (!targetGroup) {
      return NextResponse.json(
        { error: "Target group not found" },
        { status: 404 }
      );
    }

    if (
      !targetGroup.members.some((member: Types.ObjectId) =>
        member.equals(user._id)
      )
    ) {
      return NextResponse.json(
        { error: "Access denied: Not a member of target group" },
        { status: 403 }
      );
    }

    const totalAmount = formData.amount;
    let finalSplits: { userId: Types.ObjectId; amount: number }[] = [];

    if (formData.splitType === "equal") {
      const memberCount = targetGroup.members.length;
      if (memberCount === 0) {
        return NextResponse.json(
          { error: "No members in target group" },
          { status: 400 }
        );
      }

      const equalShare = parseFloat((totalAmount / memberCount).toFixed(2));

      finalSplits = targetGroup.members.map(
        (memberId: Types.ObjectId, index: number) => {
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

      for (const split of customSplits) {
        const splitUserId = new Types.ObjectId(split.userId);

        if (!targetGroup.members.some((member) => member.equals(splitUserId))) {
          console.error(
            `Validation failed: User ${split.userId} not in target group`
          );
          return NextResponse.json(
            {
              error: `User ${split.userId} is not a member of the target group`,
            },
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

    let receiptUrl: string | undefined = expense.receiptUrl;
    if (formData.receipt) {
      try {
        FileSchema.parse({
          size: formData.receipt.size,
          type: formData.receipt.type,
        });

        if (expense.receiptUrl) {
          await deleteReceipt(expense.receiptUrl);
        }

        const receiptFile = new File([new Blob()], "receipt", {
          type: formData.receipt.type,
        });
        receiptUrl = await uploadReceipt(receiptFile);
      } catch (error) {
        console.error("Receipt upload error:", error);
        return NextResponse.json(
          { error: "Failed to upload receipt. Please try again." },
          { status: 500 }
        );
      }
    }

    dbSession = await mongoose.startSession();

    await dbSession.withTransaction(async () => {
      const oldGroupId = expense.groupId;
      const oldAmount = expense.amount;

      expense.description = formData.description;
      expense.amount = totalAmount;
      expense.category = formData.category;
      expense.currency = formData.currency;
      expense.splitType = formData.splitType;
      expense.splits = finalSplits;

      if (receiptUrl !== undefined) {
        expense.receiptUrl = receiptUrl;
      }

      // Handle group change
      if (!oldGroupId.equals(formData.groupId)) {
        // Remove from old group
        await Group.findByIdAndUpdate(
          oldGroupId,
          {
            $pull: { expenses: expense._id },
            $inc: { totalSpent: -oldAmount },
          },
          { session: dbSession }
        );

        // Add to new group
        expense.groupId = new Types.ObjectId(formData.groupId);
        await Group.findByIdAndUpdate(
          formData.groupId,
          {
            $push: { expenses: expense._id },
            $inc: { totalSpent: totalAmount },
          },
          { session: dbSession }
        );
      } else {
        // Same group, just update total spent
        const amountDifference = totalAmount - oldAmount;
        if (amountDifference !== 0) {
          await Group.findByIdAndUpdate(
            formData.groupId,
            { $inc: { totalSpent: amountDifference } },
            { session: dbSession }
          );
        }
      }

      await expense.save({ session: dbSession });
    });

    const populatedExpense = await Expense.findById(id)
      .populate("payerId", "name email")
      .populate("groupId", "name")
      .populate("splits.userId", "name email")
      .lean();

    return NextResponse.json(
      {
        message: `Expense updated successfully with ${formData.splitType} split`,
        expense: populatedExpense,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating expense:", error);

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
      { error: "Failed to update expense" },
      { status: 500 }
    );
  } finally {
    if (dbSession) await dbSession.endSession();
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let dbSession: mongoose.ClientSession | null = null;

  try {
    await connectDb();

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid expense ID format" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const expense = await Expense.findById(id);
    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const group = await Group.findById(expense.groupId);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Authorization check: Only payer or group admin can delete
    if (!expense.payerId.equals(user._id) && !group.admin.equals(user._id)) {
      return NextResponse.json(
        {
          error:
            "Access denied: Only expense payer or group admin can delete this expense",
        },
        { status: 403 }
      );
    }

    // Start database transaction
    dbSession = await mongoose.startSession();

    await dbSession.withTransaction(async () => {
      // Delete receipt from cloudinary if exists
      if (expense.receiptUrl) {
        try {
          await deleteReceipt(expense.receiptUrl);
        } catch (error) {
          console.error("Error deleting receipt from cloudinary:", error);
          // Continue with expense deletion even if receipt deletion fails
        }
      }

      // Remove expense from group and update total spent
      await Group.findByIdAndUpdate(
        expense.groupId,
        {
          $pull: { expenses: expense._id },
          $inc: { totalSpent: -expense.amount },
        },
        { session: dbSession }
      );

      // Delete the expense
      await Expense.findByIdAndDelete(id, { session: dbSession });
    });

    return NextResponse.json(
      { message: "Expense deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting expense:", error);
    return NextResponse.json(
      { error: "Failed to delete expense" },
      { status: 500 }
    );
  } finally {
    if (dbSession) await dbSession.endSession();
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDb();

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid expense ID format" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const expense = await Expense.findById(id)
      .populate("payerId", "name email")
      .populate("groupId", "name")
      .populate("splits.userId", "name email")
      .lean();

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const group = await Group.findById(
      Array.isArray(expense) ? undefined : expense?.groupId
    );
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (
      !group.members.some((member: Types.ObjectId) => member.equals(user._id))
    ) {
      return NextResponse.json(
        { error: "Access denied: Not a group member" },
        { status: 403 }
      );
    }

    return NextResponse.json(expense, { status: 200 });
  } catch (error) {
    console.error("Error fetching expense:", error);
    return NextResponse.json(
      { error: "Failed to fetch expense" },
      { status: 500 }
    );
  }
}
