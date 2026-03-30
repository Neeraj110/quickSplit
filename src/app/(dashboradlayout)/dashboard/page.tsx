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
import { CreateExpense, fetchGroups, fetchExpenses, fetchSettlements } from "@/lib/api";
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
      const [groupsData, expensesData, settlementsData] = await Promise.all([
        fetchGroups().catch(() => []),
        fetchExpenses().catch(() => []),
        fetchSettlements().catch(() => ({ settlements: [], outstandingBalances: [] })),
      ]);

      setGroups(groupsData);
      setExpenses(expensesData as PopulatedExpense[]);
      calculateBalances(
        expensesData as PopulatedExpense[],
        groupsData,
        settlementsData?.settlements || []
      );
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, [user?._id]);

  const calculateBalances = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (expensesData: PopulatedExpense[], groupsData: PopulatedGroup[], settlements: any[]) => {
      const balanceMap = new Map<
        string,
        { amount: number; currency: string }[]
      >();
      const currentUserId = user?._id;

      const ensureCurrency = (userId: string, currency: string) => {
        if (!balanceMap.has(userId)) {
          balanceMap.set(userId, []);
        }
        if (!balanceMap.get(userId)!.some((b) => b.currency === currency)) {
          balanceMap.get(userId)!.push({ amount: 0, currency });
        }
      };

      // Step 1: Calculate balances from expenses
      expensesData.forEach((expense) => {
        const payerId = expense.paidBy._id;
        const isCurrentUserPayer = payerId === currentUserId;
        const currency = expense.currency || "INR";

        if (isCurrentUserPayer) {
          expense.splits?.forEach((split) => {
            if (split.userId !== currentUserId) {
              ensureCurrency(split.userId, currency);
              const balances = balanceMap.get(split.userId)!;
              const balance = balances.find((b) => b.currency === currency)!;
              if (split.amount > 0.01) {
                balance.amount += split.amount; // They owe you
              }
            }
          });
        } else {
          const currentUserSplit = expense.splits?.find(
            (split) => split.userId === currentUserId
          );
          if (currentUserSplit && currentUserSplit.amount > 0.01) {
            ensureCurrency(payerId, currency);
            const balances = balanceMap.get(payerId)!;
            const balance = balances.find((b) => b.currency === currency)!;
            balance.amount -= currentUserSplit.amount; // You owe them
          }
        }
      });

      // Step 2: Subtract settlements from balances
      settlements.forEach((settlement) => {
        if (settlement.status !== "settled") return;
        const currency = "INR"; // settlements default to INR
        const payerId = settlement.payerId?._id || settlement.payerId;
        const receiverId = settlement.receiverId?._id || settlement.receiverId;
        const payerIdStr = typeof payerId === "object" ? payerId.toString() : payerId;
        const receiverIdStr = typeof receiverId === "object" ? receiverId.toString() : receiverId;

        if (payerIdStr === currentUserId) {
          // Current user paid someone → reduce what current user owes them
          ensureCurrency(receiverIdStr, currency);
          const balances = balanceMap.get(receiverIdStr)!;
          const balance = balances.find((b) => b.currency === currency)!;
          balance.amount += settlement.amount; // Offsets negative (you_owe)
        } else if (receiverIdStr === currentUserId) {
          // Someone paid current user → reduce what they owe current user
          ensureCurrency(payerIdStr, currency);
          const balances = balanceMap.get(payerIdStr)!;
          const balance = balances.find((b) => b.currency === currency)!;
          balance.amount -= settlement.amount; // Offsets positive (owes_you)
        }
      });

      // Step 3: Build final balance list
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

  const netBalances = useMemo(() => {
    const totals = new Map<string, number>();
    const allCurrencies = new Set([...totalOwed.keys(), ...totalOwedToYou.keys()]);
    allCurrencies.forEach((currency) => {
      const owedToYou = totalOwedToYou.get(currency) || 0;
      const youOwe = totalOwed.get(currency) || 0;
      totals.set(currency, owedToYou - youOwe);
    });
    return totals;
  }, [totalOwed, totalOwedToYou]);

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
      <div className="space-y-8 px-6 sm:px-8 py-6 pb-24">
        {/* Header Row */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-on-surface">
              Welcome back, {user.name?.split(' ')[0] || 'User'}.
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Your financial overview at a glance.
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-[10px] font-bold tracking-widest text-primary uppercase">
              Total Group Spend
            </span>
            <span className="text-3xl sm:text-4xl font-bold text-on-surface tracking-tight" style={{ fontFamily: 'var(--font-manrope)' }}>
              {(() => {
                const total = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
                const currency = expenses[0]?.currency || "INR";
                return `${currency} ${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
              })()}
            </span>
          </div>
        </div>

        {/* Summary Cards Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {isLoading ? (
            <>
              <div className="lg:col-span-2"><SkeletonCard /></div>
              <div className="flex flex-col gap-4"><SkeletonCard /><SkeletonCard /></div>
            </>
          ) : (
            <>
              {/* Net Balance Hero Card */}
              <Card className="lg:col-span-2 relative overflow-hidden bg-surface-bright border-none pt-8 px-8 pb-6 shadow-ambient">
                <div className="absolute -right-24 -bottom-24 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
                <div className="flex flex-col h-full justify-between relative z-10">
                  <div>
                    <h2 className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase mb-3">
                      Total Net Balance
                    </h2>
                    <p className="text-5xl sm:text-6xl font-bold text-on-surface tracking-tight" style={{ fontFamily: 'var(--font-manrope)' }}>
                      {Array.from(netBalances.entries())
                        .map(([currency, amount]) => `${currency} ${Math.abs(amount).toFixed(2)}`)
                        .join(", ") || "₹0.00"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 mt-8">
                    <div className="flex flex-col px-4 py-2 rounded-lg bg-surface-container-high/60">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">Groups</span>
                      <span className="text-sm font-bold text-on-surface">{groups.length} Active</span>
                    </div>
                    <div className="flex flex-col px-4 py-2 rounded-lg bg-surface-container-high/60">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider mb-0.5">Expenses</span>
                      <span className="text-sm font-bold text-on-surface">{expenses.length} Total</span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Credit / Debt Stacked Cards */}
              <div className="flex flex-col gap-4">
                <Card className="flex flex-col justify-center px-6 py-5 relative overflow-hidden border-none shadow-ambient h-full bg-surface-bright">
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-primary" />
                  <div className="flex justify-between items-center mb-3 pl-3">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <span className="text-[10px] font-bold tracking-widest bg-primary/10 text-primary px-2 py-0.5 rounded">CREDIT</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mb-1 pl-3">You are owed</p>
                  <p className="text-2xl font-bold text-primary pl-3">
                    {Array.from(totalOwedToYou.entries())
                      .map(([currency, amount]) => `${currency} ${amount.toFixed(2)}`)
                      .join(", ") || "₹0.00"}
                  </p>
                </Card>
                
                <Card className="flex flex-col justify-center px-6 py-5 relative overflow-hidden border-none shadow-ambient h-full bg-surface-bright">
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full bg-tertiary" />
                  <div className="flex justify-between items-center mb-3 pl-3">
                    <DollarSign className="w-5 h-5 text-tertiary" />
                    <span className="text-[10px] font-bold tracking-widest bg-tertiary/10 text-tertiary px-2 py-0.5 rounded">DEBT</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mb-1 pl-3">You owe</p>
                  <p className="text-2xl font-bold text-tertiary pl-3">
                    {Array.from(totalOwed.entries())
                      .map(([currency, amount]) => `${currency} ${amount.toFixed(2)}`)
                      .join(", ") || "₹0.00"}
                  </p>
                </Card>
              </div>
            </>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="space-y-8 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-6">
          <div className="lg:col-span-2 space-y-8">
            {/* Groups Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-on-surface">Your Groups</h2>
                <span className="text-xs text-muted-foreground">{groups.length} groups</span>
              </div>
              {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <SkeletonGroupCard />
                  <SkeletonGroupCard />
                </div>
              ) : groups.length === 0 ? (
                <Card className="border-none shadow-ambient bg-surface-bright">
                  <CardContent className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No groups found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create or join a group to start tracking expenses
                    </p>
                  </CardContent>
                </Card>
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
            </div>

            {/* Recent Activity */}
            {isLoading ? (
              <SkeletonRecentExpenses />
            ) : (
              <RecentExpenses expenses={expenses} />
            )}
          </div>

          {/* Balances Sidebar */}
          <div className="lg:col-span-1">
            {isLoading ? (
              <SkeletonBalanceSummary />
            ) : (
              <BalanceSummary balances={balances} />
            )}
          </div>
        </div>
      </div>

      {/* Floating Add Expense Button - bottom left per reference */}
      <button
        onClick={() => setIsExpenseModalOpen(true)}
        disabled={groups.length === 0 || isLoading}
        className="fixed bottom-8 left-8 lg:left-[calc(14.5rem+2rem)] z-50 flex items-center gap-2 px-6 py-3 rounded-full text-white font-bold text-sm shadow-lg transition-all hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-container) 100%)',
        }}
      >
        <Plus className="w-4 h-4" />
        Add Expense
      </button>

      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSubmit={handleAddExpense}
        groups={groups}
      />
    </DashboardLayout>
  );
}