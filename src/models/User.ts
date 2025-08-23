import mongoose, { Schema, Document, Types, Model } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  _id: Types.ObjectId | string;
  name: string;
  avatar?: string;
  email: string;
  groups: Types.ObjectId[];
  password?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    },
    password: {
      type: String,
      select: false,
    },
    avatar: {
      type: String,
      default: "",
    },
    groups: [
      {
        type: Schema.Types.ObjectId,
        ref: "Group",
        default: [],
      },
    ],
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ name: 1 });

UserSchema.pre<IUser>("save", async function (next) {
  if (!this.password) return next();
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.comparePassword = async function (password: string) {
  return bcrypt.compare(password, this.password || "");
};

export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
