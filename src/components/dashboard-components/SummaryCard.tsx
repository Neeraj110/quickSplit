import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const SummaryCard = ({
  label,
  value,
  icon,
  color = "text-foreground",
  footer,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  footer?: string;
}) => (
  <Card className="min-w-0">
    <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle className="text-xs sm:text-sm font-medium truncate ">
        {label}
      </CardTitle>
      <div className="h-4 w-4 text-muted-foreground shrink-0">{icon}</div>
    </CardHeader>
    <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
      <div className={`text-lg sm:text-2xl font-bold truncate ${color}`}>
        {value}
      </div>
      {footer && (
        <p className="text-xs text-muted-foreground hidden sm:block">
          {footer}
        </p>
      )}
    </CardContent>
  </Card>
);
