/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/connectDb";
import { User } from "@/models/User";
import { Group } from "@/models/Group";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { z } from "zod";


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

    const dbGroups = await Group.find({ members: user._id })
      .populate("members", "name email")
      .populate("admin", "name email")
      .populate({
        path: "expenses",
        select: "amount payerId splits",
      })
      .lean()
      .sort({ updatedAt: -1 });

    const groups = dbGroups.map((group: any) => {
      let totalSpent = 0;
      let userPaid = 0;
      let userOwed = 0;

      if (group.expenses && Array.isArray(group.expenses)) {
        group.expenses.forEach((exp: any) => {
          totalSpent += exp.amount || 0;
          
          if (exp.payerId && exp.payerId.toString() === user._id.toString()) {
            userPaid += exp.amount || 0;
          }
          
          if (exp.splits && Array.isArray(exp.splits)) {
            const mySplit = exp.splits.find(
              (s: any) => s.userId && s.userId.toString() === user._id.toString()
            );
            if (mySplit) {
              userOwed += mySplit.amount || 0;
            }
          }
        });
      }

      return {
        _id: group._id,
        name: group.name,
        description: group.description,
        admin: group.admin,
        members: group.members,
        expenses: group.expenses,
        totalSpent,
        yourBalance: userPaid - userOwed,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
      };
    });

    return NextResponse.json(groups, { status: 200 });
  } catch (error) {
    console.error("Error fetching groups:", error);
    return NextResponse.json(
      { error: "Failed to fetch groups" },
      { status: 500 }
    );
  }
}
