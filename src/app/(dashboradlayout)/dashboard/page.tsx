/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SkeletonCard,
  SkeletonGroupCard,
  SkeletonRecentExpenses,
  SkeletonBalanceSummary,
} from "@/components/Skeleton/Skeleton";
import { DollarSign, TrendingUp, Users, Plus } from "lucide-react";
import { GroupCard } from "@/components/dashboard-components/group-card";
import { BalanceSummary } from "@/components/dashboard-components/balance-summary";
import { RecentExpenses } from "@/components/dashboard-components/recent-expenses";
import { ExpenseModal } from "@/components/dashboard-components/expense-modal";
import { SummaryCard } from "@/components/dashboard-components/SummaryCard";
import { toast } from "sonner";
import { CreateExpense, fetchGroups, fetchExpenses } from "@/lib/api";
import {
  PopulatedGroup,
  PopulatedExpense,
  Balance,
  ExpenseFormData,
} from "@/types/type";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

export default function Dashboard() {
  const { user } = useSelector((state: RootState) => state.user);
  const router = useRouter();
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [groups, setGroups] = useState<PopulatedGroup[]>([]);
  const [expenses, setExpenses] = useState<PopulatedExpense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [isLoading, setIsLoading] = useState(true);



  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [groupsData, expensesData] = await Promise.all([
        fetchGroups().catch(() => []),
        fetchExpenses().catch(() => []),
      ]);

      console.log(expensesData);
      
      setGroups(groupsData);
      setExpenses(expensesData as PopulatedExpense[]);
      calculateBalances(expensesData as PopulatedExpense[], groupsData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, [user?._id]);

  const calculateBalances = useCallback(
    (expensesData: PopulatedExpense[], groupsData: PopulatedGroup[]) => {
      const balanceMap = new Map<
        string,
        { amount: number; currency: string }[]
      >();
      const currentUserId = user?._id;



      expensesData.forEach((expense) => {
        const payerId = expense.paidBy._id;
        const isCurrentUserPayer = payerId === currentUserId;
        const currency = expense.currency || "INR";

        const ensureCurrency = (userId: string) => {
          if (!balanceMap.has(userId)) {
            balanceMap.set(userId, []);
          }
          if (!balanceMap.get(userId)!.some((b) => b.currency === currency)) {
            balanceMap.get(userId)!.push({ amount: 0, currency });
          }
        };

        if (isCurrentUserPayer) {
          // Current user paid the expense, others owe them
          expense.splits?.forEach((split) => {
            if (split.userId !== currentUserId) {
              ensureCurrency(split.userId);
              const balances = balanceMap.get(split.userId)!;
              const balance = balances.find((b) => b.currency === currency)!;

              // Only add the split amount if it's greater than 0 (not fully settled)
              if (split.amount > 0.01) {
                balance.amount += split.amount; // They owe you

              }
            }
          });
        } else {
          // Someone else paid, current user owes their split amount
          const currentUserSplit = expense.splits?.find(
            (split) => split.userId === currentUserId
          );
          if (currentUserSplit && currentUserSplit.amount > 0.01) {
            ensureCurrency(payerId);
            const balances = balanceMap.get(payerId)!;
            const balance = balances.find((b) => b.currency === currency)!;
            balance.amount -= currentUserSplit.amount; // You owe them

          }
        }
      });

      const calculatedBalances: Balance[] = [];
      balanceMap.forEach((balances, userId) => {
        const userName =
          groupsData
            .flatMap((group) => group.members)
            .find((member) => member._id === userId)?.name || "Unknown User";
        balances.forEach(({ amount, currency }) => {
          if (Math.abs(amount) > 0.01) {
            calculatedBalances.push({
              name: userName,
              amount: Math.abs(amount),
              type: amount >= 0 ? "owes_you" : "you_owe",
              currency,
            });

          }
        });
      });


      setBalances(calculatedBalances);
    },
    [user?._id]
  );

  const handleAddExpense = useCallback(
    async (expense: ExpenseFormData) => {
      try {
        const response = await CreateExpense(expense);
        if (response.ok) {
          toast.success("Expense added successfully!");
          setIsExpenseModalOpen(false);
          await loadData();
        }
      } catch (error) {
        console.error("Error adding expense:", error);
        toast.error("An error occurred while adding the expense.");
      }
    },
    [loadData]
  );

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user?._id, loadData]);

  useEffect(() => {
    if (!user) router.push("/signin");
  }, [user, router]);

  const totalOwed = useMemo(() => {
    const currencyTotals = new Map<string, number>();
    balances
      .filter((b) => b.type === "you_owe")
      .forEach((b) => {
        currencyTotals.set(
          b.currency,
          (currencyTotals.get(b.currency) || 0) + b.amount
        );
      });
    return currencyTotals;
  }, [balances, user]);

  const totalOwedToYou = useMemo(() => {
    const currencyTotals = new Map<string, number>();
    balances
      .filter((b) => b.type === "owes_you")
      .forEach((b) => {
        currencyTotals.set(
          b.currency,
          (currencyTotals.get(b.currency) || 0) + b.amount
        );
      });
    return currencyTotals;
  }, [balances]);

  if (!user) {
    return (
      <DashboardLayout>
        <div className="min-h-screen w-full flex items-center justify-center px-4">
          <div className="text-center space-y-4">
            <Skeleton className="h-12 w-12 mx-auto rounded-full" />
            <Skeleton className="h-4 w-32 mx-auto" />
            <p className="text-lg text-gray-600 animate-pulse">
              Loading Dashboard...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 px-8 py-5">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
                Dashboard
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base mt-1">
                Track and split expenses with your groups
              </p>
            </div>
            <Button
              onClick={() => setIsExpenseModalOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto shrink-0"
              size="sm"
              disabled={groups.length === 0 || isLoading}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <SummaryCard
                label="Groups"
                value={groups.length}
                icon={<Users />}
              />
              <SummaryCard
                label="You Owe"
                value={
                  Array.from(totalOwed.entries())
                    .map(
                      ([currency, amount]) =>
                        `${currency} ${amount.toFixed(1)}`
                    )
                    .join(", ") || "0.0"
                }
                icon={<DollarSign className="text-red-500" />}
                color="text-red-600"
              />
              <SummaryCard
                label="Owed to You"
                value={
                  Array.from(totalOwedToYou.entries())
                    .map(
                      ([currency, amount]) =>
                        `${currency} ${amount.toFixed(1)}`
                    )
                    .join(", ") || "0.0"
                }
                icon={<DollarSign className="text-green-500" />}
                color="text-green-600"
              />
              <SummaryCard
                label="Net Balance"
                value={
                  Array.from(totalOwedToYou.entries())
                    .map(([currency, amount]) => {
                      const owed = totalOwed.get(currency) || 0;
                      return `${currency} ${(amount - owed).toFixed(1)}`;
                    })
                    .join(", ") || "0.0"
                }
                icon={<TrendingUp />}
                color={
                  Array.from(totalOwedToYou.entries()).some(
                    ([currency, amount]) =>
                      amount - (totalOwed.get(currency) || 0) >= 0
                  )
                    ? "text-green-600"
                    : "text-red-600"
                }
                footer={
                  Array.from(totalOwedToYou.entries()).some(
                    ([currency, amount]) =>
                      amount - (totalOwed.get(currency) || 0) >= 0
                  )
                    ? "You are owed"
                    : "You owe"
                }
              />
            </>
          )}
        </div>

        <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-lg sm:text-xl">
                  Your Groups
                </CardTitle>
                <CardDescription className="text-sm">
                  Manage expenses across different groups
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                {isLoading ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SkeletonGroupCard />
                    <SkeletonGroupCard />
                  </div>
                ) : groups.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No groups found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create or join a group to start tracking expenses
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {groups.map((group: PopulatedGroup) => (
                      <GroupCard
                        key={group._id}
                        group={{
                          _id: group._id,
                          name: group.name,
                          members: group.members.length,
                          totalSpent: group.totalSpent || 0,
                          yourBalance: group.yourBalance || 0,
                          currency: group.currency || "INR",
                          category: group.category,
                        }}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {isLoading ? (
              <SkeletonRecentExpenses />
            ) : (
              <RecentExpenses expenses={expenses} />
            )}
          </div>

          <div className="lg:col-span-1">
            {isLoading ? (
              <SkeletonBalanceSummary />
            ) : (
              <BalanceSummary balances={balances} />
            )}
          </div>
        </div>

        <ExpenseModal
          isOpen={isExpenseModalOpen}
          onClose={() => setIsExpenseModalOpen(false)}
          onSubmit={handleAddExpense}
          groups={groups}
        />
      </div>
    </DashboardLayout>
  );
}