/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import connectDb from "@/lib/connectDb";
import { Expense } from "@/models/Expense";
import { User } from "@/models/User";
import { Group } from "@/models/Group";

interface MonthlyData {
  month: string;
  total: number;
  expenses: number;
}

interface CategoryData {
  name: string;
  value: number;
}

interface ReportResponse {
  totalExpenses: number; // number of expenses user is part of
  totalSpent: number; // user ka actual kharcha
  avgExpense: number; // user ka avg
  totalGroups: number; 
  categoryBreakdown: CategoryData[];
  monthlyBreakdown: MonthlyData[];
}

export async function POST(request: Request) {
  try {
    await connectDb();

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const [groups, expenses] = await Promise.all([
      Group.find({ members: userId }).lean(),
      Expense.find({ "splits.userId": userId }).lean(),
    ]);

    if (!expenses || expenses.length === 0) {
      return NextResponse.json({
        totalExpenses: 0,
        totalSpent: 0,
        avgExpense: 0,
        totalGroups: groups.length,
        categoryBreakdown: [],
        monthlyBreakdown: generateEmptyMonthlyBreakdown(),
      });
    }

    // --- Calculate user-specific expense ---
    let totalSpent = 0;
    expenses.forEach((exp) => {
      const split = exp.splits.find(
        (s: any) => s.userId.toString() === userId.toString()
      );
      if (split) totalSpent += split.amount; // user ka share
    });

    const totalExpenses = expenses.length;
    const avgExpense = totalSpent / totalExpenses;
    const totalGroups = groups.length;

    const categoryBreakdown = generateCategoryBreakdown(expenses, userId);
    const monthlyBreakdown = generateMonthlyBreakdown(expenses, userId);

    const response: ReportResponse = {
      totalExpenses,
      totalSpent: Math.round(totalSpent * 100) / 100,
      avgExpense: Math.round(avgExpense * 100) / 100,
      totalGroups,
      categoryBreakdown,
      monthlyBreakdown,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}

/**
 * Category-wise breakdown (user ka kharcha)
 */
function generateCategoryBreakdown(
  expenses: any[],
  userId: string
): CategoryData[] {
  const categoryMap: Record<string, number> = {};

  expenses.forEach((exp) => {
    const split = exp.splits.find(
      (s: any) => s.userId.toString() === userId.toString()
    );
    if (split) {
      const category = exp.category || "Uncategorized";
      categoryMap[category] = (categoryMap[category] || 0) + split.amount;
    }
  });

  return Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Monthly breakdown (user ka kharcha per month)
 */
function generateMonthlyBreakdown(
  expenses: any[],
  userId: string
): MonthlyData[] {
  const monthlyData: MonthlyData[] = [];
  const now = new Date();

  for (let i = 2; i >= 0; i--) {
    
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = monthDate.toLocaleString("default", {
      month: "short",
      year: "numeric",
    });

    const monthExpenses = expenses.filter((exp) => {
      const expDate = new Date(exp.date);
      return (
        expDate.getMonth() === monthDate.getMonth() &&
        expDate.getFullYear() === monthDate.getFullYear()
      );
    });

    let monthTotal = 0;
    monthExpenses.forEach((exp) => {
      const split = exp.splits.find(
        (s: any) => s.userId.toString() === userId.toString()
      );
      if (split) monthTotal += split.amount;
    });

    monthlyData.push({
      month: monthKey,
      total: Math.round(monthTotal * 100) / 100,
      expenses: monthExpenses.length,
    });
  }

  return monthlyData;
}

function generateEmptyMonthlyBreakdown(): MonthlyData[] {
  const monthlyData: MonthlyData[] = [];
  const now = new Date();

  for (let i = 4; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = monthDate.toLocaleString("default", {
      month: "short",
      year: "numeric",
    });

    monthlyData.push({
      month: monthKey,
      total: 0,
      expenses: 0,
    });
  }

  return monthlyData;
}
