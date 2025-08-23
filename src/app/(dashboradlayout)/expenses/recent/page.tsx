/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { ExpenseDetailCard } from "@/components/expenses-components/expense-detail-card";
import { UpdateExpenseModal } from "@/components/expenses-components/update-expenses-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Download,
  Receipt,
  DollarSign,
  TrendingUp,
  Users,
  Trash2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import {
  fetchGroups as apifetchGroups,
  fetchExpenses as apifetchExpenses,
  updateExpense as apiUpdateExpense,
  deleteExpense as apiDeleteExpense,
} from "@/lib/api";
import {
  PopulatedExpense,
  PopulatedGroup,
  IUser,
  EXPENSE_CATEGORIES,
  ExpenseCategory,
} from "@/types/type";
import { debounce } from "lodash";



interface ExpenseFilters {
  search: string;
  category: string;
  group: string;
  sortBy: string;
  dateRange: {
    from: Date;
    to: Date;
  };
}

interface ExpenseStats {
  total: number;
  yourShare: number;
  groups: number;
  count: number;
}

interface UpdateExpenseData {
  description?: string;
  amount?: number;
  groupId?: string;
  category?: ExpenseCategory;
  currency?: string;
  splitType?: "equal" | "custom";
  splits?: Array<{
    userId: string;
    amount: number;
  }>;
  receipt?: File | null;
}


const categories = ["All", ...EXPENSE_CATEGORIES] as const;

const sortOptions = [
  { value: "date-desc", label: "Date (Newest)" },
  { value: "date-asc", label: "Date (Oldest)" },
  { value: "amount-desc", label: "Amount (High to Low)" },
  { value: "amount-asc", label: "Amount (Low to High)" },
  { value: "description", label: "Description (A-Z)" },
] as const;

type SortOption = typeof sortOptions[number]["value"];



export default function RecentExpensesPage() {
  const { user } = useSelector((state: RootState) => state.user);

  const [filters, setFilters] = useState<ExpenseFilters>({
    search: "",
    category: "All",
    group: "All Groups",
    sortBy: "date-desc",
    dateRange: {
      from: subDays(new Date(), 30),
      to: new Date()
    },
  });

  const [expenses, setExpenses] = useState<PopulatedExpense[]>([]);
  const [groups, setGroups] = useState<PopulatedGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingExpense, setEditingExpense] = useState<PopulatedExpense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<PopulatedExpense | null>(null);



  const fetchGroups = useCallback(async () => {
    try {
      const data = await apifetchGroups();
      if (!data || !Array.isArray(data)) {
        throw new Error("Invalid response format");
      }
      setGroups(data);
    } catch (error) {
      console.error("Failed to fetch groups:", error);
      toast.error("Failed to load groups");
      setGroups([]);
    }
  }, []);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apifetchExpenses();
      if (!data || !Array.isArray(data)) {
        throw new Error("Invalid response format");
      }
      setExpenses(data as unknown as PopulatedExpense[]);
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
      toast.error("Failed to load expenses");
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateExpense = async (expenseId: string, formData: UpdateExpenseData) => {
    if (!expenseId) {
      toast.error("Invalid expense ID");
      return;
    }
    try {
      setSubmitting(true)
      const data = await apiUpdateExpense(expenseId, formData);
      if (!data) {
        throw new Error(data || "Update failed");
      }
      await fetchExpenses();
      toast.success("Expense updated successfully");
      setEditingExpense(null);
    } catch (error) {
      console.error("Error updating expense:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update expense"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const deleteExpense = async (expenseId: string) => {
    if (!expenseId) {
      toast.error("Invalid expense ID");
      return;
    }
    try {
      setSubmitting(true);
      const data = await apiDeleteExpense(expenseId);
      if (!data) {
        throw new Error(data || "Delete failed");
      }
      setExpenses((prev) =>
        prev.filter((expense) => expense._id !== expenseId)
      );
      toast.success("Expense deleted successfully");
      setDeletingExpense(null);
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete expense"
      );
    } finally {
      setSubmitting(false);
    }
  };


  const filteredAndSortedExpenses = useMemo(() => {
    return expenses
      .filter((expense) => {
        const searchQuery = filters.search.toLowerCase();


        if (searchQuery) {
          const searchableFields = [
            expense.description,
            expense.category,
            expense.paidBy.name,
            expense.groupName || '',
          ];

          const matchesSearch = searchableFields.some(field =>
            field.toLowerCase().includes(searchQuery)
          );

          if (!matchesSearch) return false;
        }


        if (filters.category !== "All" && expense.category !== filters.category) {
          return false;
        }


        if (filters.group !== "All Groups") {
          const groupName = expense.groupName || '';
          if (groupName !== filters.group) return false;
        }


        try {
          const expenseDate = parseISO(expense.createdAt);
          if (!isWithinInterval(expenseDate, {
            start: filters.dateRange.from,
            end: filters.dateRange.to,
          })) {
            return false;
          }
        } catch (error) {
          console.error("Error parsing date:", error);
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (filters.sortBy as SortOption) {
          case "date-desc":
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case "date-asc":
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case "amount-desc":
            return b.amount - a.amount;
          case "amount-asc":
            return a.amount - b.amount;
          case "description":
            return a.description.localeCompare(b.description);
          default:
            return 0;
        }
      });
  }, [expenses, filters]);

  const stats = useMemo((): ExpenseStats => {
    const total = filteredAndSortedExpenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );

    const yourShare = filteredAndSortedExpenses.reduce((sum, expense) => {
      const userSplit = expense.splits.find(split => split.userId === user?._id);
      return sum + (userSplit?.amount || 0);
    }, 0);

    const uniqueGroupIds = new Set(
      filteredAndSortedExpenses.map(expense => expense.groupId)
    );

    return {
      total,
      yourShare,
      groups: uniqueGroupIds.size,
      count: filteredAndSortedExpenses.length,
    };
  }, [filteredAndSortedExpenses, user?._id]);



  const clearFilters = useCallback(() => {
    setFilters({
      search: "",
      category: "All",
      group: "All Groups",
      sortBy: "date-desc",
      dateRange: {
        from: subDays(new Date(), 30),
        to: new Date()
      },
    });
  }, []);

  const exportExpenses = useCallback(() => {
    try {
      const headers = [
        "Date",
        "Description",
        "Amount",
        "Currency",
        "Category",
        "Paid By",
        "Group",
        "Split Type",
        "Your Share",
      ];

      const rows = filteredAndSortedExpenses.map((expense) => {
        const userSplit = expense.splits.find(split => split.userId === user?._id);
        return [
          format(parseISO(expense.createdAt), "yyyy-MM-dd"),
          `"${expense.description}"`,
          expense.amount.toString(),
          expense.currency,
          expense.category,
          `"${expense.paidBy.name}"`,
          `"${expense.groupName || 'Unknown Group'}"`,
          expense.splitType,
          (userSplit?.amount || 0).toString(),
        ];
      });

      const csvContent = [
        headers.join(","),
        ...rows.map(row => row.join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `expenses_${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Expenses exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export expenses");
    }
  }, [filteredAndSortedExpenses, user?._id]);


  useEffect(() => {
    fetchGroups();
    fetchExpenses();
  }, [fetchGroups, fetchExpenses]);


  const debouncedHandleFilterChange = useCallback(
    debounce((key: keyof ExpenseFilters, value: unknown) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    }, 300),
    []
  );


  const handleEditExpense = useCallback((expense: PopulatedExpense) => {
    setEditingExpense(expense);
  }, []);

  const handleDeleteExpense = useCallback((expense: PopulatedExpense) => {
    setDeletingExpense(expense);
  }, []);



  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading expenses...</span>
        </div>
      </DashboardLayout>
    );
  }


  return (
    <DashboardLayout>
      <div className="space-y-6 px-4 sm:px-8 py-5 overflow-y-auto max-h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Recent Expenses
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Track, add, edit, and delete transactions across groups
            </p>
          </div>
          <Button
            variant="outline"
            onClick={fetchExpenses}
            disabled={loading}
            className="px-4 py-2 text-sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>


        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 grid-cols-1">
          <StatCard
            title="Total Amount"
            icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            value={`₹${stats.total.toLocaleString()}`}
            sub={`${stats.count} expenses`}
          />
          <StatCard
            title="Your Share"
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
            value={`₹${stats.yourShare.toFixed(2)}`}
            sub={`${((stats.yourShare / stats.total) * 100 || 0).toFixed(1)}% of total`}
          />
          <StatCard
            title="Active Groups"
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
            value={stats.groups.toString()}
            sub="Groups with expenses"
          />
          <StatCard
            title="This Month"
            icon={<Receipt className="h-4 w-4 text-muted-foreground" />}
            value={expenses.filter((expense) =>
              isWithinInterval(parseISO(expense.createdAt), {
                start: startOfMonth(new Date()),
                end: endOfMonth(new Date()),
              })
            ).length.toString()}
            sub="Expenses this month"
          />
        </div>


        <Card>
          <CardContent className="p-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 grid-cols-1">
            <div className="flex items-center border rounded-md px-2">
              <Search className="h-4 w-4 text-muted-foreground mr-2" />
              <Input
                placeholder="Search expenses..."
                value={filters.search}
                onChange={(e) => debouncedHandleFilterChange('search', e.target.value)}
                className="border-none focus-visible:ring-0"
              />
            </div>


            <Select
              value={filters.category}
              onValueChange={(value) => debouncedHandleFilterChange('category', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>


            <Select
              value={filters.group}
              onValueChange={(value) => debouncedHandleFilterChange('group', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Groups">All Groups</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group._id} value={group.name}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>


            <Select
              value={filters.sortBy}
              onValueChange={(value) => debouncedHandleFilterChange('sortBy', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>

          <div className="flex justify-between p-4 border-t">
            <Button variant="outline" onClick={clearFilters} className="px-4 py-2 text-sm">
              Clear Filters
            </Button>
            <Button
              variant="outline"
              onClick={exportExpenses}
              disabled={filteredAndSortedExpenses.length === 0}
              className="px-4 py-2 text-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV ({filteredAndSortedExpenses.length})
            </Button>
          </div>
        </Card>


        <div className="space-y-4">
          {filteredAndSortedExpenses.length > 0 ? (
            filteredAndSortedExpenses.map((expense) => (
              <ExpenseDetailCard
                key={expense._id}
                expense={expense}
                currentUser={user as IUser}
                onEdit={handleEditExpense}
                onDelete={handleDeleteExpense}
              />
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <Receipt className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No expenses found
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  {expenses.length === 0
                    ? "Start by creating your first expense"
                    : "Try adjusting your filters to see more results"}
                </p>
                {expenses.length > 0 && (
                  <Button onClick={clearFilters} variant="outline" className="px-4 py-2 text-sm">
                    Clear All Filters
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>


        {editingExpense && (
          <UpdateExpenseModal
            isOpen={!!editingExpense}
            onClose={() => setEditingExpense(null)}
            onSubmit={(expenseId: string, formData: UpdateExpenseData) => updateExpense(editingExpense._id, formData)}
            expense={editingExpense}
            group={groups.find((group) => group._id === editingExpense.groupId) || null}
          />
        )}


        <AlertDialog
          open={!!deletingExpense}
          onOpenChange={() => setDeletingExpense(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Expense</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &ldquo;{deletingExpense?.description}&ldquo;?
                This action cannot be undone and will affect all group members.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={submitting}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => deletingExpense && deleteExpense(deletingExpense._id)}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete Expense
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}


interface StatCardProps {
  title: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, sub, icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}