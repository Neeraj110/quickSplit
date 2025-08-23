import mongoose, { Document, Types, Schema } from "mongoose";

interface ISettlement extends Document {
  groupId: Types.ObjectId;
  payerId: Types.ObjectId;
  receiverId: Types.ObjectId;
  description: string;
  amount: number;
  currency: string;
  paymentMethod:
    | "cash"
    | "bank_transfer"
    | "upi"
    | "paypal"
    | "venmo"
    | "other";
  paymentDate: Date;
  notes?: string;
  transactionId?: string;
  expenseId?: Types.ObjectId[];
  status: "pending" | "settled" | "overdue" | "disputed" | "verified";
  createdAt: Date;
  updatedAt: Date;
}

const settlementSchema = new Schema<ISettlement>(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: [true, "Group ID is required"],
      index: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [200, "Description cannot exceed 200 characters"],
    },
    payerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Payer ID is required"],
      index: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Receiver ID is required"],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0.01, "Amount must be positive"],
    },
    currency: {
      type: String,
      default: "INR",
      enum: {
        values: ["USD", "EUR", "GBP", "INR", "CAD", "AUD", "JPY"],
        message: "{VALUE} is not a supported currency",
      },
    },
    paymentMethod: {
      type: String,
      required: [true, "Payment method is required"],
      enum: {
        values: ["cash", "bank_transfer", "upi", "paypal", "venmo", "other"],
        message: "{VALUE} is not a valid payment method",
      },
    },
    paymentDate: {
      type: Date,
      required: [true, "Payment date is required"],
      default: Date.now,
    },
    notes: {
      type: String,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      trim: true,
    },
    transactionId: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "settled", "overdue", "disputed", "verified"],
        message: "{VALUE} is not a valid status",
      },
      default: "settled",
    },
    expenseId: [
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

// Ensure payer and receiver are different
settlementSchema.pre("save", function (next) {
  if (this.payerId.equals(this.receiverId)) {
    return next(new Error("Payer and receiver cannot be the same person"));
  }
  next();
});

// Compound index for common queries
settlementSchema.index({ groupId: 1, payerId: 1, receiverId: 1, status: 1 });

// Utility method to format amount
settlementSchema.statics.formatAmount = function (
  settlement: ISettlement
): string {
  return `${settlement.currency} ${settlement.amount.toFixed(2)}`;
};

// Utility method to determine settlement direction
settlementSchema.statics.getDirectionFor = function (
  settlement: ISettlement,
  userId: string
): "paid" | "received" {
  return settlement.payerId.toString() === userId ? "paid" : "received";
};

// Optimized method to calculate balance between two users
settlementSchema.statics.calculateBalance = async function (
  groupId: Types.ObjectId,
  user1Id: Types.ObjectId,
  user2Id: Types.ObjectId
): Promise<{
  user1PaidToUser2: number;
  user2PaidToUser1: number;
  netBalance: number;
}> {
  const [user1ToUser2, user2ToUser1] = await Promise.all([
    this.aggregate([
      {
        $match: {
          groupId,
          payerId: user1Id,
          receiverId: user2Id,
          status: "settled",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]),
    this.aggregate([
      {
        $match: {
          groupId,
          payerId: user2Id,
          receiverId: user1Id,
          status: "settled",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amount" },
        },
      },
    ]),
  ]);

  const user1PaidToUser2 = user1ToUser2[0]?.total || 0;
  const user2PaidToUser1 = user2ToUser1[0]?.total || 0;

  return {
    user1PaidToUser2,
    user2PaidToUser1,
    netBalance: user1PaidToUser2 - user2PaidToUser1,
  };
};

export const Settlement =
  mongoose.models.Settlement ||
  mongoose.model<ISettlement>("Settlement", settlementSchema);

export type { ISettlement };
