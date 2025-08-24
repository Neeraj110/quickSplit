"use client"

import { useState, useEffect } from "react"
import DashboardLayout from "@/components/DashboardLayout"
import { SettlementCard } from "@/components/settlements-components/settlement-card"
import { SettlementModal } from "@/components/settlements-components/settlement-modal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Search, Filter, TrendingUp, TrendingDown, Clock, CheckCircle, RefreshCw, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useSelector } from "react-redux"
import { RootState } from "@/redux/store"

interface Settlement {
    _id: string
    type: "you_paid" | "paid_you"
    person: string
    personId: string
    amount: number
    group: string
    groupId: string
    description: string
    paymentMethod: string
    paymentDate: string
    notes?: string
    status: "pending" | "settled" | "overdue" | "disputed" | "verified"
    createdAt: string
    updatedAt: string
}

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

interface OutstandingBalance {
    type: "you_owe" | "owes_you"
    person: string
    personId: string
    amount: number
    group: string
    groupId: string
    expenseIds?: string[]
}

interface SettlementData {
    settlements: Settlement[]
    outstandingBalances: OutstandingBalance[]
    summary: {
        totalOwed: number
        totalOwing: number
        settledCount: number
    }
}

export default function SettlePage() {
    const { user } = useSelector((state: RootState) => state.user)
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [typeFilter, setTypeFilter] = useState("all")
    const [selectedSettlement, setSelectedSettlement] = useState<UISettlement | null>(null)
    const [settleModalOpen, setSettleModalOpen] = useState(false)
    const [settlementData, setSettlementData] = useState<SettlementData>({
        settlements: [],
        outstandingBalances: [],
        summary: { totalOwed: 0, totalOwing: 0, settledCount: 0 }
    })
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)


    const fetchSettlements = async (showRefreshLoader = false) => {
        try {
            if (showRefreshLoader) setRefreshing(true)
            else setLoading(true)

            const response = await fetch('/api/settlements')
            if (!response.ok) {
                throw new Error('Failed to fetch settlements')
            }

            const data = await response.json()
            console.log('Fetched settlements:', data);

            setSettlementData(data)
        } catch (error) {
            console.error('Error fetching settlements:', error)
            toast.error('Failed to load settlement data')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        if (user) {
            fetchSettlements()
        }
    }, [user])

    const allItems: UISettlement[] = [
        ...settlementData.outstandingBalances.map(balance => ({
            id: `balance-${balance.personId}-${balance.groupId}`,
            type: balance.type,
            person: balance.person,
            personId: balance.personId,
            amount: balance.amount,
            group: balance.group,
            groupId: balance.groupId,
            description: `Outstanding balance`,
            status: "pending" as const,
            dueDate: new Date().toISOString(),
            lastReminder: null,
            avatar: "",
            currentUserId: user?._id || "",
            expenseIds: balance.expenseIds || []
        })),
        ...settlementData.settlements.map(settlement => ({
            id: settlement._id,
            type: (settlement.type === "you_paid" ? "you_owe" : "owes_you") as "you_owe" | "owes_you",
            person: settlement.person,
            personId: settlement.personId,
            amount: settlement.amount,
            group: settlement.group,
            groupId: settlement.groupId,
            description: settlement.description,
            status: settlement.status,
            dueDate: settlement.paymentDate,
            lastReminder: null,
            avatar: "",
            currentUserId: user?._id || "",
        }))
    ]

    const filteredItems = allItems.filter((item) => {
        const matchesSearch =
            item.person.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.group.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = statusFilter === "all" || item.status === statusFilter
        const matchesType = typeFilter === "all" || item.type === typeFilter

        return matchesSearch && matchesStatus && matchesType
    })

    const handleCashPayment = (settlement: UISettlement) => {
        setSelectedSettlement(settlement)
        setSettleModalOpen(true)
    }

    const handlePaymentSuccess = () => {
        setSettleModalOpen(false)
        setSelectedSettlement(null)
        fetchSettlements(true)
    }

    const pendingCount = filteredItems.filter((s) => s.status === "pending").length

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                        <p className="text-muted-foreground">Loading settlement data...</p>
                    </div>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 px-8 py-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Settle Up</h1>
                        <p className="text-muted-foreground">Manage your payments and settle outstanding balances</p>
                    </div>
                    <Button
                        onClick={() => fetchSettlements(true)}
                        disabled={refreshing}
                        variant="outline"
                        size="sm"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">You Owe</CardTitle>
                            <TrendingDown className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">
                                ${settlementData.summary.totalOwing.toFixed(2)}
                            </div>
                            <p className="text-xs text-muted-foreground">Total outstanding debt</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Owed to You</CardTitle>
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                ${settlementData.summary.totalOwed.toFixed(2)}
                            </div>
                            <p className="text-xs text-muted-foreground">Total amount to collect</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending</CardTitle>
                            <Clock className="h-4 w-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
                            <p className="text-xs text-muted-foreground">Awaiting settlement</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Settled</CardTitle>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {settlementData.summary.settledCount}
                            </div>
                            <p className="text-xs text-muted-foreground">Completed payments</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters and Search */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="w-5 h-5" />
                            Filter Settlements
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                                    <Input
                                        placeholder="Search by person, group, or description..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="settled">Settled</SelectItem>
                                    <SelectItem value="overdue">Overdue</SelectItem>
                                    <SelectItem value="verified">Verified</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="Filter by type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="you_owe">You Owe</SelectItem>
                                    <SelectItem value="owes_you">Owes You</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Settlements Tabs */}
                <Tabs defaultValue="all" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="all">All ({filteredItems.length})</TabsTrigger>
                        <TabsTrigger value="you_owe">
                            You Owe ({filteredItems.filter((s) => s.type === "you_owe" && s.status !== "settled").length})
                        </TabsTrigger>
                        <TabsTrigger value="owes_you">
                            Owes You ({filteredItems.filter((s) => s.type === "owes_you" && s.status !== "settled").length})
                        </TabsTrigger>
                        <TabsTrigger value="settled">
                            Settled ({filteredItems.filter((s) => s.status === "settled").length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="space-y-4">
                        {filteredItems.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <CheckCircle className="w-12 h-12 text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">No settlements found</h3>
                                    <p className="text-muted-foreground text-center">
                                        {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                                            ? "Try adjusting your filters to see more results."
                                            : "All your balances are settled up!"}
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4">
                                {filteredItems.map((item) => (
                                    <SettlementCard
                                        key={item.id}
                                        settlement={item}
                                        onCashPayment={handleCashPayment}
                                    />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="you_owe" className="space-y-4">
                        <div className="grid gap-4">
                            {filteredItems
                                .filter((s) => s.type === "you_owe" && s.status !== "settled")
                                .map((item) => (
                                    <SettlementCard
                                        key={item.id}
                                        settlement={item}
                                        onCashPayment={handleCashPayment}
                                    />
                                ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="owes_you" className="space-y-4">
                        <div className="grid gap-4">
                            {filteredItems
                                .filter((s) => s.type === "owes_you" && s.status !== "settled")
                                .map((item) => (
                                    <SettlementCard
                                        key={item.id}
                                        settlement={item}
                                        onCashPayment={handleCashPayment}
                                    />
                                ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="settled" className="space-y-4">
                        <div className="grid gap-4">
                            {filteredItems
                                .filter((s) => s.status === "settled")
                                .map((item) => (
                                    <SettlementCard
                                        key={item.id}
                                        settlement={item}
                                        onCashPayment={handleCashPayment}
                                    />
                                ))}
                        </div>
                    </TabsContent>
                </Tabs>

                <SettlementModal
                    isOpen={settleModalOpen}
                    onClose={() => setSettleModalOpen(false)}
                    settlement={selectedSettlement}
                    onConfirm={handlePaymentSuccess}
                />
            </div>
        </DashboardLayout>
    )
}