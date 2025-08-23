/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PopulatedExpense, PopulatedGroup } from "@/types/type";
import { debounce } from "lodash";

interface ISplit {
  userId: string;
  amount: number;
}

const ExpenseSchema = z.object({
  amount: z
    .number()
    .positive("Amount must be positive")
    .max(1000000, "Amount must be less than 1,000,000"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(200, "Description must be less than 200 characters")
    .transform((str) => str.trim().replace(/[<>]/g, "")),
  groupId: z.string().min(1, "Group is required"),
  category: z.enum([
    "Food",
    "Transport",
    "Entertainment",
    "Utilities",
    "Shopping",
    "Health",
    "General",
  ]),
  currency: z.enum(["USD", "EUR", "GBP", "INR", "CAD", "AUD", "JPY"]),
  splitType: z.enum(["equal", "custom"]),
  splits: z
    .array(
      z.object({
        userId: z.string().min(1, "User ID is required"),
        amount: z.number().positive("Split amount must be positive"),
      })
    )
    .optional()
    .refine(
      (splits) => !splits || splits.every((s) => s.amount > 0),
      { message: "All split amounts must be positive" }
    ),
  receipt: z.instanceof(File).optional().nullable(),
});

type ExpenseFormData = z.infer<typeof ExpenseSchema>;

interface UpdateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (expenseId: string, expense: ExpenseFormData) => Promise<void>;
  expense: PopulatedExpense | null;
  group: PopulatedGroup | null;
}

export function UpdateExpenseModal({
  isOpen,
  onClose,
  onSubmit,
  expense,
  group,
}: UpdateExpenseModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(ExpenseSchema),
    defaultValues: {
      description: "",
      amount: 0,
      groupId: group?._id || "",
      category: "General",
      currency: "INR",
      splitType: "equal",
      splits: [],
    },
  });

  useEffect(() => {
    if (expense && group) {
      form.reset({
        description: expense.description,
        amount: expense.amount,
        groupId: group._id,
        category: expense.category as any,
        currency: expense.currency as any,
        splitType: expense.splitType,
        splits: expense.splits.map((s: ISplit) => ({
          userId: s.userId,
          amount: s.amount,
        })),
      });
      setSplitType(expense.splitType);
    }
  }, [expense, group, form]);

  const debouncedSetAmount = useCallback(
    debounce((value: string) => {
      form.setValue("amount", parseFloat(value) || 0);
    }, 300),
    [form]
  );

  const handleSubmit = async (data: ExpenseFormData) => {
    if (!expense) return;
    setIsSubmitting(true);
    try {
      const payload = { ...data };
      if (file) {
        payload.receipt = file;
      }
      await onSubmit(expense._id, payload);
      toast.success("Expense updated successfully");
      onClose();
    } catch (err) {
      console.error("Update failed:", err);
      toast.error("Failed to update expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSplitTypeChange = (value: "equal" | "custom") => {
    setSplitType(value);
    form.setValue("splitType", value);
    if (value === "equal") {
      form.setValue("splits", []);
    }
  };

  if (!expense || !group) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-[600px] max-h-[80vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl">Edit Expense</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Update the details of your expense.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs sm:text-sm">Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      value={field.value}
                      onChange={(e) => {
                        field.onChange(parseFloat(e.target.value) || 0);
                        debouncedSetAmount(e.target.value);
                      }}
                      className="text-sm h-10"
                      aria-label="Expense amount"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs sm:text-sm">Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="text-sm min-h-[80px]"
                      aria-label="Expense description"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs sm:text-sm">Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="text-sm h-10">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ExpenseSchema.shape.category.options.map((cat) => (
                          <SelectItem key={cat} value={cat} className="text-sm py-2">
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs sm:text-sm">Currency</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="text-sm h-10">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ExpenseSchema.shape.currency.options.map((cur) => (
                          <SelectItem key={cur} value={cur} className="text-sm py-2">
                            {cur}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="splitType"
              render={({ }) => (
                <FormItem>
                  <FormLabel className="text-xs sm:text-sm">Split Type</FormLabel>
                  <RadioGroup
                    value={splitType}
                    onValueChange={handleSplitTypeChange}
                    className="flex flex-col sm:flex-row gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="equal" id="equal" className="h-5 w-5" />
                      <label htmlFor="equal" className="text-sm">Equal</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="custom" id="custom" className="h-5 w-5" />
                      <label htmlFor="custom" className="text-sm">Custom</label>
                    </div>
                  </RadioGroup>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
            {splitType === "custom" && (
              <FormField
                control={form.control}
                name="splits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs sm:text-sm">Split Amounts</FormLabel>
                    {group.members.map((member, index) => (
                      <div key={member._id} className="flex items-center gap-2 mt-2">
                        <span className="text-sm">{member.name}</span>
                        <Input
                          type="number"
                          value={field.value?.[index]?.amount || 0}
                          onChange={(e) => {
                            const newSplits = [...(field.value || [])];
                            newSplits[index] = {
                              userId: member._id,
                              amount: parseFloat(e.target.value) || 0,
                            };
                            field.onChange(newSplits);
                          }}
                          className="text-sm h-10"
                          aria-label={`Split amount for ${member.name}`}
                        />
                      </div>
                    ))}
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            )}
            <FormItem>
              <FormLabel className="text-xs sm:text-sm">Update Receipt</FormLabel>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFile(f);
                }}
                className="text-sm h-10"
                aria-label="Upload receipt"
              />
              <FormMessage className="text-xs" />
            </FormItem>
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm"
                aria-label="Cancel update"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm"
                aria-label="Submit updated expense"
              >
                {isSubmitting ? "Updating..." : "Update Expense"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}