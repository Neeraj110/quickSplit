import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/connectDb";
import { User } from "@/models/User";
import { Group } from "@/models/Group";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { Types } from "mongoose";
import { z } from "zod";

const removeMembersSchema = z.object({
  userIds: z
    .array(
      z.string().refine((id) => Types.ObjectId.isValid(id), {
        message: "Invalid user ID",
      })
    )
    .min(1, "At least one user ID is required"),
});

const addMembersSchema = z.object({
  emails: z.array(z.string().email()).min(1, "At least one email is required"),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
    }

    await connectDb();

    const user = await User.findOne({ email: session.user.email }).select(
      "_id"
    );
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const group = await Group.findById(id)
      .populate("members", "name email")
      .populate("admin", "name email")
      .populate("expenses")
      .lean();

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (!group.members.some((member) => member._id.equals(user._id))) {
      return NextResponse.json(
        { error: "Forbidden: Not a group member" },
        { status: 403 }
      );
    }

    return NextResponse.json(group, { status: 200 });
  } catch (error) {
    console.error("Error in GET /groups/[id]/members:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
    }
    const body = await req.json();
    const validation = addMembersSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { emails } = validation.data;
    await connectDb();
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const group = await Group.findById(id);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }
    if (!group.admin.equals(user._id)) {
      return NextResponse.json(
        { error: "Forbidden: Only group admin can add members" },
        { status: 403 }
      );
    }
    const newMembers = await User.find({ email: { $in: emails } }).select(
      "_id name email"
    );
    if (newMembers.length === 0) {
      return NextResponse.json(
        { error: "No valid users found for the provided emails" },
        { status: 400 }
      );
    }
    const existingMemberIds = group.members.map((m: Types.ObjectId) =>
      m.toString()
    );
    const newMemberIds = newMembers
      .filter((m) => !existingMemberIds.includes(m._id.toString()))
      .map((m) => m._id);
    if (newMemberIds.length === 0) {
      return NextResponse.json(
        { error: "All provided users are already group members" },
        { status: 400 }
      );
    }
    group.members.push(...newMemberIds.map((id) => new Types.ObjectId(id)));
    await group.save();
    const updatedGroup = await Group.findById(id)
      .populate("members", "name email")
      .populate("admin", "name email")
      .populate("expenses")
      .lean();

    return NextResponse.json(
      {
        message: "Members added successfully",
        group: updatedGroup,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in POST /groups/[id]/members:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
    }

    const body = await req.json();
    const validation = removeMembersSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { userIds } = validation.data;

    await connectDb();

    const [user, group] = await Promise.all([
      User.findOne({ email: session.user.email }).select("_id"),
      Group.findById(id).populate("admin", "name email"),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    if (!group.admin.equals(user._id)) {
      return NextResponse.json(
        { error: "Forbidden: Only group admin can remove members" },
        { status: 403 }
      );
    }

    const validUserIds = userIds.filter((id) => Types.ObjectId.isValid(id));
    if (validUserIds.length === 0) {
      return NextResponse.json(
        { error: "No valid user IDs provided" },
        { status: 400 }
      );
    }

    const memberIdsStr = group.members.map((m: Types.ObjectId) => m.toString());
    const invalidMembers = validUserIds.filter(
      (id) => !memberIdsStr.includes(id)
    );
    if (invalidMembers.length > 0) {
      return NextResponse.json(
        { error: "Some users are not group members" },
        { status: 400 }
      );
    }

    const adminIdStr = group.admin.toString();
    if (validUserIds.includes(adminIdStr)) {
      return NextResponse.json(
        { error: "Cannot remove the group admin" },
        { status: 400 }
      );
    }
    if (group.members.length <= validUserIds.length) {
      return NextResponse.json(
        { error: "Cannot remove all members" },
        { status: 400 }
      );
    }

    group.members = group.members.filter(
      (member: Types.ObjectId) => !validUserIds.includes(member.toString())
    );
    await group.save();

    const removedUsers = await User.find({
      _id: { $in: validUserIds },
    }).select("name email");

    const updatedGroup = await Group.findById(id)
      .populate("members", "name email")
      .populate("admin", "name email")
      .populate("expenses")
      .lean();

    return NextResponse.json(
      {
        message: "Members removed successfully",
        group: updatedGroup,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in DELETE /groups/[id]/members:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
