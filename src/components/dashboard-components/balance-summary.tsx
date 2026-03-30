"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    <Card className="border-none shadow-ambient bg-surface-bright">
      <CardHeader className="pb-3">
        <CardTitle className="text-[11px] font-bold tracking-widest text-on-surface uppercase">
          Balances
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        {Object.keys(balancesByCurrency).length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-sm">All settled up! 🎉</p>
            <p className="text-xs mt-1">No outstanding balances</p>
          </div>
        ) : (
          Object.entries(balancesByCurrency).map(
            ([currency, { owes_you, you_owe }]) => (
              <div key={currency} className="space-y-4">
                {owes_you.map((balance, index) => (
                  <div key={`owes-${index}`} className="flex items-center justify-between group cursor-pointer transition-all hover:opacity-80">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={`/placeholder-user.jpg`} />
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                          {balance.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-on-surface">
                          {balance.name}
                        </span>
                        <span className="text-xs font-semibold text-primary">
                          Owes you {currency} {balance.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="text-muted-foreground/30 group-hover:text-primary transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </div>
                  </div>
                ))}
                
                {you_owe.map((balance, index) => (
                  <div key={`owe-${index}`} className="flex items-center justify-between group cursor-pointer transition-all hover:opacity-80">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={`/placeholder-user.jpg`} />
                        <AvatarFallback className="bg-tertiary/10 text-tertiary font-bold text-sm">
                          {balance.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-on-surface">
                          {balance.name}
                        </span>
                        <span className="text-xs font-semibold text-tertiary">
                          You owe {currency} {balance.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="text-muted-foreground/30 group-hover:text-tertiary transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </div>
                  </div>
                ))}
              </div>
            )
          )
        )}
      </CardContent>
    </Card>
  );
}
