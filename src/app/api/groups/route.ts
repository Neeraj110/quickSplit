/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/connectDb";
import { User } from "@/models/User";
import { Group } from "@/models/Group";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { z } from "zod";
import { io } from "@/lib/socket";

const MemberSchema = z.object({
  email: z.string().email("Invalid email"),
  name: z.string().optional(),
});

const GroupSchema = z.object({
  name: z.string().min(1, "Group name is required").trim(),
  description: z.string().optional(),
  members: z.array(MemberSchema).min(1, "At least one member is required"),
});

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { name, members, description } = GroupSchema.parse(body);

    const memberEmails = Array.from(
      new Set([...members.map((m) => m.email), user.email])
    );

    const users = await User.find({ email: { $in: memberEmails } });
    if (users.length !== memberEmails.length) {
      return NextResponse.json(
        { error: "One or more members are not registered users" },
        { status: 400 }
      );
    }

    const groupMembers = users.map((u) => u._id);

    const group = new Group({
      name,
      description,
      admin: user._id,
      members: groupMembers,
      expenses: [],
    });

    await group.save();

    await User.updateMany(
      { _id: { $in: groupMembers } },
      { $addToSet: { groups: group._id } }
    );

    const populatedGroup = await Group.findById(group._id)
      .populate("members", "name email")
      .populate("admin", "name email")
      .lean();

    return NextResponse.json(populatedGroup, { status: 201 });
  } catch (error) {
    console.error("Error creating group:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const groups = await Group.aggregate([
      {
        $match: { members: user._id },
      },
      // Lookup full expenses
      {
        $lookup: {
          from: "expenses",
          localField: "expenses",
          foreignField: "_id",
          as: "expenses",
        },
      },
      // Lookup member and admin details
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
      {
        $addFields: {
          admin: { $arrayElemAt: ["$admin", 0] },
          totalSpent: {
            $sum: "$expenses.amount",
          },
        },
      },
      // Calculate your paid total
      {
        $addFields: {
          userPaid: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: "$expenses",
                    as: "exp",
                    cond: { $eq: ["$$exp.payerId", user._id] },
                  },
                },
                as: "paidExp",
                in: "$$paidExp.amount",
              },
            },
          },
        },
      },
      // Calculate your owed total
      {
        $addFields: {
          userOwed: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: {
                      $reduce: {
                        input: "$expenses",
                        initialValue: [],
                        in: { $concatArrays: ["$$value", "$$this.splits"] },
                      },
                    },
                    as: "split",
                    cond: { $eq: ["$$split.userId", user._id] },
                  },
                },
                as: "splitMatch",
                in: "$$splitMatch.amount",
              },
            },
          },
        },
      },
      // Final balance
      {
        $addFields: {
          yourBalance: { $subtract: ["$userPaid", "$userOwed"] },
        },
      },
      {
        $project: {
          name: 1,
          description: 1,
          admin: 1,
          members: 1,
          expenses: 1,
          totalSpent: 1,
          yourBalance: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      },
      { $sort: { updatedAt: -1 } },
    ]);

    return NextResponse.json(groups, { status: 200 });
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch groups" },
      { status: 500 }
    );
  }
}
