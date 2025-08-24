import { Types } from "mongoose";

export interface BaseDocument {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

export interface IUser extends BaseDocument {
  name: string;
  email: string;
  groups: string[];
}

export interface ExpenseSplit {
  userId: string;
  amount: number;
}

export interface PopulatedExpenseSplit extends ExpenseSplit {
  user?: PopulatedUser;
}

export interface ISplit extends BaseDocument {
  userId: string;
  user?: PopulatedUser;
  amount: number;
}

export const EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Entertainment",
  "Utilities",
  "Shopping",
  "Health",
  "General",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface PopulatedUser {
  _id: string;
  name: string;
  email: string;
}

export interface GroupMember {
  _id?: string;
  email: string;
  name?: string;
}

export interface IGroup extends BaseDocument {
  name: string;
  admin: string;
  members: string[];
  expenses: string[];
  description?: string;
}

export interface PopulatedGroup extends BaseDocument {
  [x: string]: unknown;
  name: string;
  admin: PopulatedUser;
  members: PopulatedUser[];
  expenses: string[];
  description?: string;
  totalSpent?: number;
  yourBalance?: number;
  currency?: string;
  category?: string;
}

export interface IExpense extends BaseDocument {
  groupId: string;
  amount: number;
  description: string;
  category: string;
  currency: string;
  paidBy: string;
  splitType: "equal" | "custom";
  splits: Array<{
    userId: string;
    amount: number;
  }>;
  receipt?: string;
}

export interface PopulatedExpense extends BaseDocument {
  groupName: string;
  groupId: string;
  amount: number;
  description: string;
  category: string;
  currency: string;
  paidBy: PopulatedUser;
  splitType: "equal" | "custom";
  splits: Array<{
    userId: string;
    user?: PopulatedUser;
    amount: number;
  }>;
  receipt?: string;
}

export interface GroupFormData {
  name: string;
  description?: string;
  members: GroupMember[];
}

export interface ExpenseFormData {
  groupId: string;
  payerId: string;
  amount: number;
  description: string;
  category: string;
  currency: string;
  splitType: "equal" | "custom";
  splits?: Array<{
    userId: string;
    amount: number;
  }>;
  receipt?: File | null;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
  members: Array<{
    email: string;
    name?: string;
  }>;
}

export type GetGroupsResponse = PopulatedGroup[];

export interface CreateExpenseRequest {
  groupId: string;
  amount: number;
  description: string;
  category: string;
  currency: string;
  splitType: "equal" | "custom";
  splits?: Array<{
    userId: string;
    amount: number;
  }>;
  receipt?: File | null;
}

export interface GroupCardData {
  _id: string;
  name: string;
  members: number;
  totalSpent: number;
  yourBalance: number;
  currency?: string;
  category?: string;
}

export interface Balance {
  name: string;
  amount: number;
  type: "owes_you" | "you_owe";
  currency: string;
}

export interface DashboardStats {
  totalGroups: number;
  totalMembers: number;
  totalSpent: number;
  yourTotalBalance: number;
}

export type GroupWithComputedFields = PopulatedGroup & {
  totalSpent: number;
  yourBalance: number;
  currency: string;
};

export type ExpenseWithRelations = PopulatedExpense;

export type MemberInput = {
  email: string;
  name?: string;
};

export const MemberValidation = {
  email: "string().email()",
  name: "string().optional()",
} as const;

export const GroupValidation = {
  name: "string().min(1).trim()",
  description: "string().optional()",
  members: "array().min(1)",
} as const;

export const ExpenseValidation = {
  groupId: "string().min(1)",
  amount: "number().positive()",
  description: "string().min(1)",
  category: "string().min(1)",
  currency: "string().length(3)",
  splitType: "enum(['equal', 'custom'])",
} as const;

export interface GroupsPageState {
  groups: PopulatedGroup[];
  isCreateModalOpen: boolean;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
}

export interface CreateGroupModalState {
  step: number;
  isSubmitting: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, null>;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface FilterState {
  searchQuery: string;
  categoryFilter: string;
  groupFilter: string;
  statusFilter: string;
  sortBy: string;
  dateRange: {
    from: Date;
    to: Date;
  };
}

export interface PopulatedSettlement {
  _id: string;
  payerId: Types.ObjectId;
  receiverId: Types.ObjectId;
  groupId: Types.ObjectId;
  amount: number;
  description: string;
  paymentMethod: string;
  paymentDate: string;
  notes?: string;
  status: string;
  expenseId: string[];
  createdAt: string;
  updatedAt: string;
}

export type GroupToCardData = (group: PopulatedGroup) => GroupCardData;

export type FormDataToRequest<T, U> = (formData: T) => U;
