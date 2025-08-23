"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

interface MonthlyTrendsProps {
  data: { month: string; total: number; expenses: number }[];
}

export function MonthlyTrends({ data }: MonthlyTrendsProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base sm:text-lg">Monthly Trends</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            No data available
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="text-base sm:text-lg">Monthly Trends</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Track your expense patterns over time
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <ChartContainer
          config={{
            total: {
              label: "Amount (₹)",
              color: "hsl(var(--chart-1))",
            },
            expenses: {
              label: "Number of Expenses",
              color: "hsl(var(--chart-2))",
            },
          }}
          className="h-[250px] sm:h-[400px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
              <XAxis
                dataKey="month"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="left"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <YAxis
                yAxisId="right"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={40}
                orientation="right"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="total"
                stroke="var(--color-total)"
                strokeWidth={2}
                dot={{ fill: "var(--color-total)", strokeWidth: 1, r: 3 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="expenses"
                stroke="var(--color-expenses)"
                strokeWidth={2}
                dot={{ fill: "var(--color-expenses)", strokeWidth: 1, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}