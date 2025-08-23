import mongoose, { Schema, model, Document, Types } from "mongoose";

interface ISplit {
  userId: Types.ObjectId;
  amount: number;
}

export interface IExpense extends Document {
  groupId: Types.ObjectId;
  amount: number;
  currency: string;
  description: string;
  category: string;
  payerId: Types.ObjectId;
  splits: ISplit[];
  splitType: "equal" | "custom";
  receiptUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: "General",
    },
    payerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    splits: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        amount: { type: Number, required: true },
      },
    ],
    splitType: {
      type: String,
      enum: ["equal", "custom"],
      default: "equal",
    },
    receiptUrl: { type: String },
  },
  { timestamps: true }
);

export const Expense =
  mongoose.models.Expense || model<IExpense>("Expense", expenseSchema);
