import { NextRequest, NextResponse } from "next/server";
import connectDb from "@/lib/connectDb";
import { User } from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { z } from "zod";
import {
  uploadReceipt as uploadAvatar,
  deleteReceipt as deleteAvatar,
} from "@/lib/cloudinary";

const FileSchema = z
  .instanceof(File)
  .optional()
  .nullable()
  .refine(
    (file) => !file || file.size <= 5 * 1024 * 1024,
    "File size must be less than 5MB"
  )
  .refine(
    (file) =>
      !file || ["image/jpeg", "image/png", "image/webp"].includes(file.type),
    "Only JPEG, PNG, or WebP files are allowed"
  );

const UserSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .transform((str) => str.trim().replace(/[<>]/g, "")),
  email: z.string().email("Invalid email address"),
  avatar: FileSchema,
});

interface UserUpdateData {
  name?: string;
  email?: string;
  avatar?: File | null;
}

async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  return User.findOne({ email: session.user.email }).select("-password").lean();
}

export async function GET() {
  try {
    await connectDb();
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized or user not found" },
        { status: 401 }
      );
    }
    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await connectDb();
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized or user not found" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const body: UserUpdateData = {
      name: formData.get("name")?.toString(),
      email: formData.get("email")?.toString(),
      avatar: formData.get("avatar") as File | null,
    };

    const parsed = UserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, email, avatar } = parsed.data;

    let avatarUrl = user.avatar;
    if (avatar) {
      try {
        if (user.avatar) {
          await deleteAvatar(user.avatar);
        }
        avatarUrl = await uploadAvatar(avatar);
      } catch (error) {
        console.error("Avatar upload error:", error);
        return NextResponse.json(
          { error: "Failed to upload avatar. Please try again." },
          { status: 500 }
        );
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { name, email, avatar: avatarUrl },
      { new: true, runValidators: true }
    )
      .select("-password")
      .lean();

    if (!updatedUser) {
      return NextResponse.json(
        { error: "Failed to update user" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "User updated successfully",
        user: updatedUser,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error },
      { status: 500 }
    );
  }
}
