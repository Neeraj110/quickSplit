import { User } from "@/models/User";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import connectDb from "@/lib/connectDb";

const signupSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must be less than 50 characters"),
  email: z.string().email("Invalid email format").toLowerCase(),
  password: z.string().min(4, "Password must be at least 6 characters"),
  
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsedData = signupSchema.parse(body);

    await connectDb();

    const existingUser = await User.findOne({ email: parsedData.email }).lean();
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    const newUser = new User({
      name: parsedData.name,
      email: parsedData.email,
      password: parsedData.password,
    });

    await newUser.save();

    return NextResponse.json(
      { message: "User created successfully" },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
