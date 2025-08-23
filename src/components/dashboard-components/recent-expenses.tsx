"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoreHorizontal, Eye } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PopulatedExpense } from "@/types/type";
import Link from "next/link";

interface RecentExpensesProps {
  expenses: PopulatedExpense[];
}

const categoryColors: Record<string, string> = {
  Food: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
  Transport: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  Entertainment:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
  Utilities:
    "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  General: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
};

export function RecentExpenses({ expenses }: RecentExpensesProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Expenses</CardTitle>
          <Link href={"/expenses/recent"}>
            <Button variant="outline" size="sm">
              <Eye className="w-4 h-4 mr-2" />
              View All
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Paid By</TableHead>
              <TableHead>Group</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense._id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{expense.description}</span>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${
                        categoryColors[expense.category] ||
                        categoryColors.General
                      }`}
                    >
                      {expense.category}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="font-semibold">
                  {expense.currency} {expense.amount.toFixed(2)}
                </TableCell>
                <TableCell>
                  <span className="font-medium text-green-600">
                    {expense.paidBy.name || "Unknown"}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{expense?.groupName || ""}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(expense.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Edit Expense</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        Delete Expense
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
