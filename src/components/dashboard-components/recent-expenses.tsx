"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PopulatedExpense } from "@/types/type";
import Link from "next/link";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

interface RecentExpensesProps {
  expenses: PopulatedExpense[];
}

const categoryIcons: Record<string, string> = {
  Food: "🍽️",
  Transport: "🚗",
  Entertainment: "🎬",
  Utilities: "⚡",
  Shopping: "🛒",
  General: "📦",
  Accommodation: "🏨",
  Travel: "✈️",
};

export function RecentExpenses({ expenses }: RecentExpensesProps) {
  const { user } = useSelector((state: RootState) => state.user);
  const currentUserId = user?._id;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-on-surface">Recent Activity</h2>
        <Link href={"/expenses/recent"} className="text-sm font-semibold text-primary hover:underline">
          View All
        </Link>
      </div>
      <div className="flex flex-col gap-3">
        {expenses.length === 0 ? (
          <Card className="border-none shadow-ambient bg-surface-bright">
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground text-sm">No recent activity found.</p>
            </CardContent>
          </Card>
        ) : (
          expenses.slice(0, 5).map((expense) => {
            const isPayer = expense.paidBy._id === currentUserId;
            const userSplit = expense.splits?.find(s => s.userId === currentUserId);
            const userShare = userSplit?.amount || 0;

            // Determine accent bar color and status text
            let accentColor = "bg-primary"; // green = you get back
            let statusText = "";
            let statusColor = "text-primary";

            if (isPayer) {
              const othersOwe = expense.amount - userShare;
              if (othersOwe > 0.01) {
                statusText = `You get back ${expense.currency} ${othersOwe.toFixed(2)}`;
                accentColor = "bg-primary";
                statusColor = "text-primary";
              }
            } else {
              if (userShare > 0.01) {
                statusText = `You owe ${expense.currency} ${userShare.toFixed(2)}`;
                accentColor = "bg-tertiary";
                statusColor = "text-tertiary";
              }
            }

            const icon = categoryIcons[expense.category] || categoryIcons.General;

            return (
              <div
                key={expense._id}
                className="bg-surface-bright rounded-2xl p-5 shadow-ambient relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                {/* Left accent bar per DESIGN.md */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-r-full ${accentColor}`} />
                
                <div className="flex items-start justify-between pl-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-container-high flex items-center justify-center shrink-0 text-lg">
                      {icon}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-on-surface text-base leading-tight">
                        {expense.description}
                      </span>
                      <span className="text-xs text-muted-foreground mt-1">
                        Paid by <strong className="text-on-surface">{isPayer ? "You" : expense.paidBy.name}</strong> • {new Date(expense.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end text-right shrink-0 ml-4">
                    <span className="font-bold text-lg text-on-surface">
                      {expense.currency} {expense.amount.toFixed(2)}
                    </span>
                    {statusText && (
                      <span className={`text-[11px] font-bold tracking-wide uppercase mt-0.5 ${statusColor}`}>
                        {statusText}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
