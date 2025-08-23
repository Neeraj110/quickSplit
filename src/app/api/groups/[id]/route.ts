/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/connectDb";
import { User } from "@/models/User";
import { Group } from "@/models/Group";
import { Expense } from "@/models/Expense";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { Types } from "mongoose";
import { z } from "zod";

const GroupUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Group name is required")
    .max(100, "Group name too long")
    .trim()
    .optional(),
  description: z.string().max(500, "Description too long").trim().optional(),
});

const validateUserSession = async (session: any) => {
  if (!session?.user?.email) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const user = await User.findOne({ email: session.user.email }).select(
    "_id name email"
  );
  if (!user) {
    return {
      error: NextResponse.json({ error: "User not found" }, { status: 404 }),
    };
  }

  return { user };
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDb();
    const session = await getServerSession(authOptions);
    const { user, error } = await validateUserSession(session);

    if (error) return error;

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid group ID format" },
        { status: 400 }
      );
    }

    const groupData = await Group.aggregate([
      { $match: { _id: new Types.ObjectId(id) } },
      {
        $lookup: {
          from: "users",
          localField: "members",
          foreignField: "_id",
          as: "members",
          pipeline: [{ $project: { name: 1, email: 1 } }],
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "admin",
          foreignField: "_id",
          as: "admin",
          pipeline: [{ $project: { name: 1, email: 1 } }],
        },
      },
      { $unwind: "$admin" },
    ]);

    if (!groupData || groupData.length === 0) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const group = groupData[0];

    const isMember = group.members.some((member: any) =>
      member._id.equals(user._id)
    );

    if (!isMember) {
      return NextResponse.json(
        { error: "Access denied: You are not a member of this group" },
        { status: 403 }
      );
    }

    const expenses = await Expense.find({ groupId: id })
      .populate("payerId", "name email")
      .populate("splits.userId", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const totalExpenses = expenses.length;
    const totalAmount = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );

    return NextResponse.json(
      {
        success: true,
        group: {
          _id: group._id,
          name: group.name,
          description: group.description || "",
          admin: group.admin,
          members: group.members,
          memberCount: group.members.length,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
        },
        expenses,
        statistics: {
          totalExpenses,
          totalAmount,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching group:", error);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDb();
    const session = await getServerSession(authOptions);
    const { user, error } = await validateUserSession(session);

    if (error) return error;

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid group ID format" },
        { status: 400 }
      );
    }

    const group = await Group.findById(id);

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (group.admin.toString() !== user._id.toString()) {
      return NextResponse.json(
        { error: "Access denied: Only group admin can update group details" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const validationResult = GroupUpdateSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationResult.error,
        },
        { status: 400 }
      );
    }

    const { name, description } = validationResult.data;

    if (name && name !== group.name) {
      group.name = name;
    }

    if (description !== undefined && description !== group.description) {
      group.description = description;
    }

    await group.save();

    const populatedGroup = await Group.findById(id)
      .populate("members", "name email")
      .populate("admin", "name email")
      .lean();

    return NextResponse.json(
      {
        success: true,
        message: "Group updated successfully",
        group: populatedGroup,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating group:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error,
        },
        { status: 400 }
      );
    }
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDb();
    const session = await getServerSession(authOptions);
    const { user, error } = await validateUserSession(session);

    if (error) return error;

    const { id } = await params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid group ID format" },
        { status: 400 }
      );
    }

    const group = await Group.findById(id);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (!group.admin.equals(user._id)) {
      return NextResponse.json(
        { error: "Access denied: Only group admin can delete the group" },
        { status: 403 }
      );
    }

    const expenseCount = await Expense.countDocuments({ groupId: id });

    const session_db = await Group.startSession();
    session_db.startTransaction();

    try {
      await Expense.deleteMany({ groupId: id }).session(session_db);

      await User.updateMany(
        { _id: { $in: group.members } },
        { $pull: { groups: group._id } }
      ).session(session_db);

      await Group.findByIdAndDelete(id).session(session_db);

      await session_db.commitTransaction();

      return NextResponse.json(
        {
          success: true,
          message: "Group deleted successfully",
          data: {
            deletedExpenses: expenseCount,
            affectedMembers: group.members.length,
          },
        },
        { status: 200 }
      );
    } catch (transactionError) {
      await session_db.abortTransaction();
      throw transactionError;
    } finally {
      session_db.endSession();
    }
  } catch (error) {
    console.error("Error deleting group:", error);
  }
}
