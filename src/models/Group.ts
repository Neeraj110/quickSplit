import mongoose, { Schema, Document, Types, Model } from "mongoose";

export interface IGroup extends Document {
  name: string;
  admin: Types.ObjectId;
  members: Types.ObjectId[];
  expenses: Types.ObjectId[];
  description?: string;
  totalSpent?: number;
  yourBalance?: number;
  createdAt: Date;
  updatedAt: Date;
}

const groupSchema: Schema<IGroup> = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },
    admin: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    description: {
      type: String,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    yourBalance: {
      type: Number,
      default: 0,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    expenses: [
      {
        type: Schema.Types.ObjectId,
        ref: "Expense",
      },
    ],
  },
  {
    timestamps: true,
  }
);

groupSchema.index({ admin: 1, createdAt: -1 });
groupSchema.index({ members: 1, updatedAt: -1 });
groupSchema.index({ name: "text", description: "text" });
groupSchema.index({ createdAt: -1 });
groupSchema.index({ updatedAt: -1 });

export const Group: Model<IGroup> =
  mongoose.models.Group || mongoose.model<IGroup>("Group", groupSchema);
