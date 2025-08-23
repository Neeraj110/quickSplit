"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Balance } from "@/types/type";

interface BalanceSummaryProps {
  balances: Balance[];
}

export function BalanceSummary({ balances }: BalanceSummaryProps) {
  const balancesByCurrency = balances.reduce((acc, balance) => {
    if (!acc[balance.currency]) {
      acc[balance.currency] = { owes_you: [], you_owe: [] };
    }
    if (balance.type === "owes_you") {
      acc[balance.currency].owes_you.push(balance);
    } else {
      acc[balance.currency].you_owe.push(balance);
    }
    return acc;
  }, {} as Record<string, { owes_you: Balance[]; you_owe: Balance[] }>);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Balance Summary
          <Badge variant="outline" className="ml-auto">
            {balances.length} people
          </Badge>
        </CardTitle>
        <CardDescription>Who owes who in your groups</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.keys(balancesByCurrency).length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">All settled up! 🎉</p>
            <p className="text-xs mt-1">No outstanding balances</p>
          </div>
        ) : (
          Object.entries(balancesByCurrency).map(
            ([currency, { owes_you, you_owe }]) => (
              <div key={currency} className="space-y-3">
                <h4 className="text-sm font-semibold">{currency}</h4>
                {owes_you.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">
                      Owed to you
                    </p>
                    {owes_you.map((balance, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={`/placeholder-user.jpg`} />
                            <AvatarFallback>
                              {balance.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {balance.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              owes you
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-green-600">
                            {currency} {balance.amount.toFixed(2)}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-1 h-6 text-xs bg-transparent"
                          >
                            Remind
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {owes_you.length > 0 && you_owe.length > 0 && <Separator />}
                {you_owe.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">
                      You owe
                    </p>
                    {you_owe.map((balance, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={`/placeholder-user.jpg`} />
                            <AvatarFallback>
                              {balance.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {balance.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              you owe
                            </p>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-sm font-semibold text-red-600">
                            {currency} {balance.amount.toFixed(2)}
                          </p>
                          {/* <PaymentButton
                          amount={balance.amount}
                          recipient={balance.name}
                          size="sm"
                        /> */}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          )
        )}
      </CardContent>
    </Card>
  );
}
