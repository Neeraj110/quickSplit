"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Banknote, Clock, AlertTriangle, CheckCircle, MessageSquare, Calendar } from "lucide-react"

export interface UISettlement {
    id: string
    type: "you_owe" | "owes_you"
    person: string
    amount: number
    group: string
    description: string
    dueDate: string
    avatar: string
    status: "pending" | "settled" | "overdue" | "verified"
    lastReminder: string | null
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
            default:
                return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
        }
    }

    return (
        <Card className={`transition-all hover:shadow-md ${isOverdue ? "" : ""}`}>
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                    {/* Left side */}
                    <div className="flex items-start gap-4 flex-1">
                        <Avatar className="w-12 h-12">
                            <AvatarImage src={settlement.avatar || "/placeholder.svg"} />
                            <AvatarFallback>{settlement.person.charAt(0)}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-lg">{settlement.person}</h3>
                                {getStatusIcon()}
                                {getStatusBadge()}
                            </div>

                            <p className="text-sm text-muted-foreground mb-2">
                                {settlement.group}
                            </p>
                            <p className="text-sm mb-3">{settlement.description}</p>

                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
                    <div className="flex flex-col items-end gap-3 ml-4">
                        <div className="text-right">
                            <div
                                className={`text-2xl font-bold ${settlement.type === "you_owe"
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
                            <Button size="sm" variant="outline" onClick={() => onCashPayment(settlement)}>
                                <Banknote className="w-4 h-4 mr-2" />
                                Mark as Pay
                            </Button>
                        )}

                        {settlement.status !== "settled" && settlement.type === "owes_you" && (
                            <div className="flex flex-col gap-2">
                                <Button size="sm" variant="outline">
                                    <MessageSquare className="w-4 h-4 mr-2" />
                                    Send Reminder
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => onCashPayment(settlement)}>
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
