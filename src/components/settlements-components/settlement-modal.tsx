"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
    Banknote,
    CalendarIcon,
    Clock,
    FileText,
    Landmark,
    Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";

interface SettlementModalProps {
    isOpen: boolean;
    onClose: () => void;
    settlement: SettlementItem | null;
    onConfirm: () => void;
}

export interface SettlementItem {
    type: "you_owe" | "owes_you";
    personId: string;
    currentUserId: string;
    groupId: string;
    amount: number;
    description?: string;
    person: string;
    group: string;
    expenseIds?: string[];
}

const SettlementFormSchema = z.object({
    paymentDate: z.date(),
    paymentMethod: z.enum([
        "cash",
        "bank_transfer",
        "upi",
        "paypal",
        "venmo",
        "other",
    ]),
    notes: z.string().max(500, "Notes cannot exceed 500 characters").optional(),
});

type SettlementFormValues = z.infer<typeof SettlementFormSchema>;

export function SettlementModal({
    isOpen,
    onClose,
    settlement,
    onConfirm,
}: SettlementModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<SettlementFormValues>({
        resolver: zodResolver(SettlementFormSchema),
        defaultValues: {
            paymentDate: new Date(),
            paymentMethod: "cash",
            notes: "",
        },
    });

    const handleConfirm = async (values: SettlementFormValues) => {
        if (!settlement) return;
        setIsSubmitting(true);

        try {
            const isYouOwe = settlement.type === "you_owe";
            const payerId = isYouOwe ? settlement.currentUserId : settlement.personId;
            const receiverId = isYouOwe ? settlement.personId : settlement.currentUserId;


            if (!payerId || !receiverId) {
                toast.error("Missing payer/receiver ID");
                setIsSubmitting(false);
                return;
            }

            const settlementData = {
                payerId,
                receiverId,
                groupId: settlement.groupId,
                amount: settlement.amount,
                description: `Settlement: ${settlement.description || "Manual payment"}`,
                paymentMethod: values.paymentMethod,
                paymentDate: values.paymentDate.toISOString(),
                notes: values.notes?.trim() || undefined,
                expenseIds: settlement.expenseIds || []   // ✅ send expenseIds
            };




            const response = await fetch("/api/settlements", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settlementData),
            });

            const data = await response.json();

            if (!response.ok) {
                console.error("Settlement API error:", data);

                // Handle wrong direction error with helpful message
                if (data.suggestedDirection) {
                    toast.error(`Wrong direction! ${data.error}`, {
                        description: "Please check who actually owes whom.",
                        duration: 6000
                    });
                } else {
                    toast.error(data.error || "Failed to record settlement");
                }

                throw new Error(data.error || "Failed to record settlement");
            }

            toast.success(data.message || "Settlement recorded successfully!");
            form.reset();
            onConfirm();
        } catch (error) {
            console.error("Settlement error:", error);
            toast.error(
                error instanceof Error ? error.message : "Failed to record settlement"
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!settlement) return null;

    const isYouOwe = settlement.type === "you_owe";

    const paymentMethodOptions = [
        { value: "cash", label: "Cash", icon: "💵" },
        { value: "bank_transfer", label: "Bank Transfer", icon: "🏦" },
        { value: "upi", label: "UPI", icon: "📱" },
        { value: "paypal", label: "PayPal", icon: "💙" },
        { value: "venmo", label: "Venmo", icon: "💚" },
        { value: "other", label: "Other", icon: "💳" },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Banknote className="w-5 h-5 text-green-600" />
                        {isYouOwe ? "Record Payment Made" : "Mark as Received"}
                    </DialogTitle>
                    <DialogDescription>
                        {isYouOwe
                            ? `Record that you paid ₹${settlement.amount.toFixed(2)} to ${settlement.person}`
                            : `Mark that ${settlement.person} paid you ₹${settlement.amount.toFixed(2)}`}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleConfirm)} className="space-y-6">

                        <Card className="border-green-200">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Settlement Amount</p>
                                        <p className="text-2xl font-bold text-green-600">
                                            ₹{settlement.amount.toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">
                                            {isYouOwe ? "Paid to" : "Received from"}
                                        </p>
                                        <p className="font-semibold">{settlement.person}</p>
                                        <Badge variant="outline" className="mt-1">
                                            {settlement.group}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Payment Date */}
                        <FormField
                            control={form.control}
                            name="paymentDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                        <CalendarIcon className="w-4 h-4" />
                                        Payment Date *
                                    </FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="w-full justify-start text-left font-normal bg-transparent"
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {field.value ? format(field.value, "PPP") : "Select date"}
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={(date) => date && field.onChange(date)}
                                                initialFocus
                                                disabled={(date) => date > new Date()}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Payment Method */}
                        <FormField
                            control={form.control}
                            name="paymentMethod"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                        <Landmark className="w-4 h-4" />
                                        Payment Method *
                                    </FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select payment method" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {paymentMethodOptions.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    <div className="flex items-center gap-2">
                                                        <span>{option.icon}</span>
                                                        <span>{option.label}</span>
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Notes */}
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        Additional Notes (Optional)
                                    </FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Any additional details about the payment..."
                                            rows={3}
                                            maxLength={500}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Important Notice */}
                        <Card className="border-yellow-200">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
                                    <div>
                                        <h4 className="font-semibold text-yellow-800 mb-1">Important Notice</h4>
                                        <p className="text-sm text-yellow-700">
                                            {isYouOwe
                                                ? "By confirming, you're recording that this payment has been made. Make sure the recipient acknowledges receipt."
                                                : "By confirming, you're marking this debt as settled. This action will be recorded permanently."}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={onClose}
                                type="button"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Recording...
                                    </>
                                ) : (
                                    <>
                                        <Banknote className="w-4 h-4 mr-2" />
                                        {isYouOwe ? "Record Payment" : "Mark as Received"}
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}