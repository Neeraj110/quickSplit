// Updated ExpenseModal component with payer selection

"use client";

import React, { useState } from "react";
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
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PopulatedGroup } from "@/types/type";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";

const ExpenseSchema = z.object({
  groupId: z.string().min(1, "Group is required"),
  payerId: z.string().min(1, "Payer is required"),
  amount: z.number().positive("Amount must be positive"),
  description: z.string().min(1, "Description is required"),
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
        userId: z.string(),
        amount: z.number().positive("Split amount must be positive"),
      })
    )
    .optional(),
  receipt: z.any().optional(),
});

type ExpenseFormData = z.infer<typeof ExpenseSchema>;

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (expense: ExpenseFormData) => Promise<void>;
  groups: PopulatedGroup[];
}

export function ExpenseModal({
  isOpen,
  onClose,
  onSubmit,
  groups,
}: ExpenseModalProps) {
  const { user } = useSelector((state: RootState) => state.user);
  const [file, setFile] = useState<File | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<PopulatedGroup | null>(
    null
  );
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(ExpenseSchema),
    defaultValues: {
      description: "",
      amount: 0,
      category: "General",
      currency: "INR",
      groupId: "",
      payerId: "",
      splitType: "equal",
      splits: [],
    },
  });

  const handleGroupChange = (groupId: string) => {
    const group = groups.find((g) => g._id === groupId);
    setSelectedGroup(group || null);
    form.setValue("groupId", groupId);
    form.setValue("splits", []);

    // Set the current user as default payer when a group is selected
    if (group && user?._id) {
      form.setValue("payerId", user._id);
    }
  };

  const handlePayerChange = (payerId: string) => {
    form.setValue("payerId", payerId);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.size <= 5 * 1024 * 1024) {
      setFile(selected);
    } else if (selected && selected.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
    }
  };

  const handleSubmit = async (data: ExpenseFormData) => {
    setIsSubmitting(true);
    try {
      const finalData = { ...data, receipt: file };
      await onSubmit(finalData);
      form.reset();
      setFile(null);
      setSelectedGroup(null);
      setSplitType("equal");
      onClose();
    } catch (error) {
      console.error("Error submitting expense:", error);
      alert("Failed to add expense. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentSplits = form.watch("splits") || [];
  const totalSplitAmount = currentSplits.reduce(
    (sum, split) => sum + (Number(split.amount) || 0),
    0
  );
  const expenseAmount = Number(form.watch("amount")) || 0;
  const splitsDifference = Math.abs(totalSplitAmount - expenseAmount);

  const allGroupMembers = selectedGroup ? selectedGroup.members : [];
  const selectedPayerId = form.watch("payerId");
  const selectedPayer = allGroupMembers.find(member => member._id === selectedPayerId);

  const equalSplitAmount =
    selectedGroup && expenseAmount > 0
      ? (expenseAmount / selectedGroup.members.length).toFixed(2)
      : "0.00";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
          <DialogDescription>
            Record an expense and split it with your group.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="groupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Group</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={handleGroupChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {groups.map((group) => (
                          <SelectItem key={group._id} value={group._id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="payerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Who Paid?</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={handlePayerChange}
                      disabled={!selectedGroup}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select who paid" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {allGroupMembers.map((member) => (
                          <SelectItem key={member._id} value={member._id}>
                            {member.name} {member._id === user?._id && "(You)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(
                          value === "" ? 0 : parseFloat(value) || 0
                        );
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Dinner, Taxi"
                      maxLength={200}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ExpenseSchema.shape.category.options.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ExpenseSchema.shape.currency.options.map((cur) => (
                          <SelectItem key={cur} value={cur}>
                            {cur}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="splitType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Split Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={splitType}
                      onValueChange={(val) => {
                        setSplitType(val as "equal" | "custom");
                        field.onChange(val);
                        form.setValue("splits", []);
                      }}
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="equal" id="equal" />
                        <label htmlFor="equal" className="cursor-pointer">
                          Equal
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="custom" id="custom" />
                        <label htmlFor="custom" className="cursor-pointer">
                          Custom
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {splitType === "equal" && selectedGroup && expenseAmount > 0 && (
              <div className="p-4  rounded-lg">
                <h4 className="font-medium mb-2">Equal Split Preview:</h4>
                <div className="text-sm space-y-1">
                  {selectedGroup.members.map((member) => (
                    <div key={member._id} className="flex justify-between">
                      <span
                        className={`${member._id === user?._id ? "font-semibold text-blue-600" : ""
                          } ${member._id === selectedPayerId ? "text-green-600 font-medium" : ""
                          }`}
                      >
                        {member.name}
                        {member._id === user?._id && " (You)"}
                        {member._id === selectedPayerId && " (Payer)"}
                      </span>
                      <span>
                        {form.watch("currency")} {equalSplitAmount}
                      </span>
                    </div>
                  ))}
                </div>
                {selectedPayer && (
                  <div className="mt-3 p-2  rounded text-sm">
                    <strong>{selectedPayer.name}</strong> will be credited for paying the full amount
                  </div>
                )}
              </div>
            )}

            {splitType === "custom" &&
              selectedGroup &&
              allGroupMembers.length > 0 && (
                <FormField
                  control={form.control}
                  name="splits"
                  render={() => (
                    <FormItem>
                      <FormLabel>
                        Custom Splits (Including All Members)
                      </FormLabel>
                      <div className="space-y-3">
                        {allGroupMembers.map((member, index) => (
                          <div
                            key={member._id}
                            className={`flex items-center gap-3 p-3 border rounded-md ${member._id === selectedPayerId ? " border-green-200" : ""
                              }`}
                          >
                            <span
                              className={`w-32 text-sm font-medium truncate ${member._id === user?._id
                                ? "text-blue-600 font-semibold"
                                : ""
                                } ${member._id === selectedPayerId
                                  ? "text-green-600"
                                  : ""
                                }`}
                            >
                              {member.name}{" "}
                              {member._id === user?._id && "(You)"}
                              {member._id === selectedPayerId && " (Payer)"}
                            </span>
                            <Input
                              type="number"
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                              className="flex-1"
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                const currentSplits =
                                  form.getValues("splits") || [];
                                const updatedSplits = [...currentSplits];

                                while (updatedSplits.length <= index) {
                                  updatedSplits.push({ userId: "", amount: 0 });
                                }

                                updatedSplits[index] = {
                                  userId: member._id,
                                  amount: value,
                                };

                                form.setValue("splits", updatedSplits);
                              }}
                            />
                          </div>
                        ))}
                        {splitType === "custom" && expenseAmount > 0 && (
                          <div className="text-sm">
                            <div className="flex justify-between">
                              <span>Total splits:</span>
                              <span
                                className={
                                  Math.abs(totalSplitAmount - expenseAmount) <
                                    0.01
                                    ? "text-green-600"
                                    : "text-red-600"
                                }
                              >
                                {form.watch("currency")}{" "}
                                {totalSplitAmount.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Expense amount:</span>
                              <span>
                                {form.watch("currency")}{" "}
                                {expenseAmount.toFixed(2)}
                              </span>
                            </div>
                            {splitsDifference > 0.01 && (
                              <div className="text-red-600 text-xs mt-1">
                                Difference: {form.watch("currency")}{" "}
                                {splitsDifference.toFixed(2)}
                              </div>
                            )}
                          </div>
                        )}
                        {selectedPayer && (
                          <div className="mt-3 p-2  rounded text-sm">
                            <strong>{selectedPayer.name}</strong> will be credited for paying the full amount
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

            <FormItem>
              <FormLabel>Upload Receipt (optional)</FormLabel>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
              />
              {file && (
                <p className="text-sm text-muted-foreground mt-1">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)}{" "}
                  MB)
                </p>
              )}
            </FormItem>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  (splitType === "custom" && splitsDifference > 0.01) ||
                  !selectedGroup ||
                  !form.watch("payerId")
                }
              >
                {isSubmitting ? "Adding..." : "Add Expense"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}