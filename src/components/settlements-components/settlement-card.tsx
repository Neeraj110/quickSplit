"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Banknote, Clock, AlertTriangle, CheckCircle, MessageSquare, Calendar } from "lucide-react"

interface UISettlement {
    id: string
    type: "you_owe" | "owes_you"
    person: string
    personId: string
    amount: number
    group: string
    groupId: string
    description: string
    status: "pending" | "settled" | "overdue" | "verified" | "disputed"
    dueDate: string
    lastReminder: string | null
    avatar: string
    currentUserId: string
    expenseIds?: string[]
}

interface SettlementCardProps {
    settlement: UISettlement
    onCashPayment: (settlement: UISettlement) => void
}

export function SettlementCard({ settlement, onCashPayment }: SettlementCardProps) {
    const isOverdue =
        new Date(settlement.dueDate) < new Date() && settlement.status !== "settled"
    const daysUntilDue = Math.ceil(
        (new Date(settlement.dueDate).getTime() - new Date().getTime()) /
        (1000 * 3600 * 24)
    )

    const getStatusIcon = () => {
        switch (settlement.status) {
            case "settled":
                return <CheckCircle className="w-4 h-4 text-green-500" />
            case "overdue":
                return <AlertTriangle className="w-4 h-4 text-red-500" />
            case "disputed":
                return <AlertTriangle className="w-4 h-4 text-orange-500" />
            default:
                return <Clock className="w-4 h-4 text-yellow-500" />
        }
    }

    const getStatusBadge = () => {
        switch (settlement.status) {
            case "settled":
                return <Badge className="bg-green-100 text-green-800">Settled</Badge>
            case "overdue":
                return <Badge className="bg-red-100 text-red-800">Overdue</Badge>
            case "disputed":
                return <Badge className="bg-orange-100 text-orange-800">Disputed</Badge>
            case "verified":
                return <Badge className="bg-blue-100 text-blue-800">Verified</Badge>
            default:
                return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
        }
    }

    return (
        <Card className="transition-all hover:shadow-md w-full">
            <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    {/* Left side */}
                    <div className="flex items-start gap-3 flex-1">
                        <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
                            <AvatarImage src={settlement.avatar || "/placeholder.svg"} />
                            <AvatarFallback>{settlement.person.charAt(0)}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h3 className="font-semibold text-base sm:text-lg truncate max-w-[150px] sm:max-w-none">
                                    {settlement.person}
                                </h3>
                                <div className="flex items-center gap-2">
                                    {getStatusIcon()}
                                    {getStatusBadge()}
                                </div>
                            </div>

                            <p className="text-xs sm:text-sm text-muted-foreground mb-2 truncate">
                                {settlement.group}
                            </p>
                            <p className="text-xs sm:text-sm mb-3 line-clamp-2">
                                {settlement.description}
                            </p>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    Due: {new Date(settlement.dueDate).toLocaleDateString()}
                                    {daysUntilDue > 0 && settlement.status !== "settled" && (
                                        <span className="text-yellow-600">
                                            ({daysUntilDue} days)
                                        </span>
                                    )}
                                </div>
                                {settlement.lastReminder && (
                                    <div className="flex items-center gap-1">
                                        <MessageSquare className="w-3 h-3" />
                                        Last reminder:{" "}
                                        {new Date(settlement.lastReminder).toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right side */}
                    <div className="flex flex-col items-end gap-2 sm:ml-4">
                        <div className="text-right">
                            <div
                                className={`text-xl sm:text-2xl font-bold ${settlement.type === "you_owe"
                                    ? "text-red-600"
                                    : "text-green-600"
                                    }`}
                            >
                                {settlement.type === "you_owe" ? "-" : "+"}${settlement.amount.toFixed(2)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {settlement.type === "you_owe" ? "You owe" : "Owes you"}
                            </p>
                        </div>

                        {settlement.status !== "settled" && settlement.type === "you_owe" && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="w-full sm:w-auto"
                                onClick={() => onCashPayment(settlement)}
                            >
                                <Banknote className="w-4 h-4 mr-2" />
                                Mark as Pay
                            </Button>
                        )}

                        {settlement.status !== "settled" && settlement.type === "owes_you" && (
                            <div className="flex flex-col gap-2 w-full sm:w-auto">
                                <Button size="sm" variant="outline" className="w-full sm:w-auto">
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Send Reminder
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                    onClick={() => onCashPayment(settlement)}
                                >
                                    <Banknote className="w-4 h-4 mr-2" />
                                    Mark as Paid
                                </Button>
                            </div>
                        )}

                        {settlement.status === "settled" && (
                            <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-sm font-medium">Settled</span>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}