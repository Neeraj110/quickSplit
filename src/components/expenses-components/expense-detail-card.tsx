"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Receipt,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Download,
  Users,
  Calendar,
  Tag,
  User,
  ExternalLink,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  PopulatedExpense,
  PopulatedExpenseSplit,
  IUser,
  ExpenseCategory,
} from "@/types/type";

interface ExpenseDetailCardProps {
  expense: PopulatedExpense;
  currentUser?: IUser | null;
  onEdit?: (expense: PopulatedExpense) => void;
  onDelete?: (expense: PopulatedExpense) => void;
}

const categoryColors: Record<ExpenseCategory, string> = {
  Food: "bg-orange-100 text-orange-800 border-orange-200",
  Transport: "bg-blue-100 text-blue-800 border-blue-200",
  Entertainment: "bg-purple-100 text-purple-800 border-purple-200",
  Utilities: "bg-green-100 text-green-800 border-green-200",
  Shopping: "bg-pink-100 text-pink-800 border-pink-200",
  Health: "bg-red-100 text-red-800 border-red-200",
  General: "bg-gray-100 text-gray-800 border-gray-200",
};

const categoryIcons: Record<ExpenseCategory, string> = {
  Food: "🍽️",
  Transport: "🚗",
  Entertainment: "🎬",
  Utilities: "⚡",
  Shopping: "🛍️",
  Health: "🏥",
  General: "📝",
};

const getCategoryColor = (category: string): string => {
  return categoryColors[category as ExpenseCategory] || categoryColors.General;
};

const getCategoryIcon = (category: string): string => {
  return categoryIcons[category as ExpenseCategory] || categoryIcons.General;
};

export function ExpenseDetailCard({
  expense,
  currentUser,
  onEdit,
  onDelete,
}: ExpenseDetailCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const isCurrentUserPayer = currentUser?._id === expense.paidBy._id;

  const currentUserSplit = expense.splits.find(
    (split) => split.userId === currentUser?._id
  );

  const canEdit = isCurrentUserPayer;
  const canDelete = isCurrentUserPayer;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const formatCurrency = (amount: number, currency: string = "INR") => {
    const symbol = currency === "INR" ? "₹" : "$";
    return `${symbol}${amount.toFixed(2)}`;
  };

  const downloadReceipt = () => {
    if (expense?.receipt) {
      window.open(expense.receipt, "_blank");
    }
  };

  const getSplitUserName = (split: PopulatedExpenseSplit): string => {
    return split.user?.name || "Unknown User";
  };

  const getSplitUserEmail = (split: PopulatedExpenseSplit): string => {
    return split.user?.email || "";
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start space-x-3 flex-1">
            <div className="flex-shrink-0 text-2xl">
              {getCategoryIcon(expense.category)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-base sm:text-lg font-semibold truncate">
                  {expense.description}
                </h3>
                {expense.receipt && (
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>
                  {format(
                    parseISO(expense.createdAt),
                    "MMM dd, yyyy 'at' h:mm a"
                  )}
                </span>
                <Separator orientation="vertical" className="h-3" />
                <Users className="h-3 w-3" />
                <span>{expense.groupName}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center sm:items-start gap-2 flex-shrink-0">
            <div className="text-right">
              <div className="text-lg sm:text-xl font-bold">
                {formatCurrency(expense.amount, expense.currency)}
              </div>
              {currentUserSplit && (
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Your share:{" "}
                  {formatCurrency(currentUserSplit.amount, expense.currency)}
                </div>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setShowDetails(true)} className="py-2 text-sm">
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                {expense.receipt && (
                  <DropdownMenuItem onClick={downloadReceipt} className="py-2 text-sm">
                    <Download className="mr-2 h-4 w-4" />
                    View Receipt
                  </DropdownMenuItem>
                )}
                {canEdit && onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(expense)} className="py-2 text-sm">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                {canDelete && onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(expense)}
                    className="py-2 text-sm text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Badge
                variant="secondary"
                className={getCategoryColor(expense.category)}
              >
                <Tag className="h-3 w-3 mr-1" />
                {expense.category}
              </Badge>
              <Badge variant="outline">
                {expense.splitType === "equal" ? "Equal Split" : "Custom Split"}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <User className="h-3 w-3" />
              <span>
                Paid by{" "}
                <span
                  className={
                    isCurrentUserPayer
                      ? "font-semibold text-green-600"
                      : "font-medium"
                  }
                >
                  {isCurrentUserPayer ? "You" : expense.paidBy.name}
                </span>
              </span>
            </div>
          </div>

          {/* Split preview */}
          <div className="mt-3 pt-3 border-t hidden sm:block">
            <div className="flex items-center justify-between">
              <div className="flex -space-x-2">
                {expense.splits.slice(0, 4).map((split, index) => (
                  <Avatar
                    key={`${split.userId}-${index}`}
                    className="h-6 w-6 border-2 border-background"
                  >
                    <AvatarFallback className="text-xs">
                      {getInitials(getSplitUserName(split))}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {expense.splits.length > 4 && (
                  <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs text-muted-foreground">
                    +{expense.splits.length - 4}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(true)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                View Split Details
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[80vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <span className="text-xl sm:text-2xl">
                {getCategoryIcon(expense.category)}
              </span>
              {expense.description}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Expense details and split breakdown
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Amount
                </label>
                <div className="text-2xl font-bold">
                  {formatCurrency(expense.amount, expense.currency)}
                </div>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Category
                </label>
                <div className="mt-1">
                  <Badge className={getCategoryColor(expense.category)}>
                    <Tag className="h-3 w-3 mr-1" />
                    {expense.category}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Date
                </label>
                <div className="text-xs sm:text-sm">
                  {format(
                    parseISO(expense.createdAt),
                    "MMMM dd, yyyy 'at' h:mm a"
                  )}
                </div>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Group
                </label>
                <div className="text-xs sm:text-sm">{expense.groupName}</div>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Paid By
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {getInitials(expense.paidBy.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs sm:text-sm">
                    {expense.paidBy.name}
                    {isCurrentUserPayer && " (You)"}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Split Type
                </label>
                <div className="mt-1">
                  <Badge variant="outline">
                    {expense.splitType === "equal"
                      ? "Equal Split"
                      : "Custom Split"}
                  </Badge>
                </div>
              </div>
            </div>

            {expense.receipt && (
              <div>
                <label className="text-xs sm:text-sm font-medium text-muted-foreground">
                  Receipt
                </label>
                <Button
                  variant="outline"
                  onClick={downloadReceipt}
                  className="w-full mt-2 px-4 py-2"
                >
                  <Receipt className="mr-2 h-4 w-4" />
                  View Receipt
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Split Details */}
            <div>
              <label className="text-xs sm:text-sm font-medium text-muted-foreground mb-3 block">
                Split Breakdown ({expense.splits.length} people)
              </label>
              <div className="space-y-2">
                {expense.splits.map((split: PopulatedExpenseSplit, index) => (
                  <div
                    key={`${split.userId}-${index}`}
                    className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border ${split.userId === currentUser?._id
                        ? " border-green-200"
                        : ""
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {getInitials(getSplitUserName(split))}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {getSplitUserName(split)}
                          {split.userId === currentUser?._id && " (You)"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {getSplitUserEmail(split)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(split.amount, expense.currency)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {expense.amount > 0
                          ? `${((split.amount / expense.amount) * 100).toFixed(
                            1
                          )}%`
                          : "0%"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    Total Split Amount:
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(
                      expense.splits.reduce(
                        (sum, split) => sum + split.amount,
                        0
                      ),
                      expense.currency
                    )}
                  </span>
                </div>
                {currentUserSplit && (
                  <div className="flex justify-between items-center mt-1 text-green-600">
                    <span className="text-sm font-medium">Your Share:</span>
                    <span className="font-semibold">
                      {formatCurrency(
                        currentUserSplit.amount,
                        expense.currency
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {(canEdit || canDelete) && (
              <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                {canEdit && onEdit && (
                  <Button
                    onClick={() => {
                      setShowDetails(false);
                      onEdit(expense);
                    }}
                    className="flex-1 px-4 py-2"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Expense
                  </Button>
                )}
                {canDelete && onDelete && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setShowDetails(false);
                      onDelete(expense);
                    }}
                    className="flex-1 px-4 py-2"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Expense
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}