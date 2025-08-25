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
  // Filter and sort data to show only the last 3 months
  const filteredData = data
    .map((item) => ({
      ...item,
      date: new Date(item.month), // Assuming month is a parseable date string
    }))
    .sort((a, b) => b.date.getTime() - a.date.getTime()) // Sort descending by date
    .slice(0, 3) // Take the most recent 3 months
    .map((item) => ({
      month: item.month,
      total: item.total,
      expenses: item.expenses,
    }));

  if (!filteredData || filteredData.length === 0) {
    return (
      <Card>
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="text-sm sm:text-lg">Monthly Trends</CardTitle>
          <CardDescription className="text-xs">
            No data available for the last 3 months
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-3 sm:p-4">
        <CardTitle className="text-sm sm:text-lg">Monthly Trends</CardTitle>
        <CardDescription className="text-xs">
          Track your expense patterns over the last 3 months
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-4">
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
          className="h-[120px] sm:h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={filteredData}
              margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
            >
              <XAxis
                dataKey="month"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                interval={0} // Show all 3 months
                tickFormatter={(value) => value.slice(0, 3)} // Abbreviate month names
              />
              <YAxis
                yAxisId="left"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={25}
                tickFormatter={(value) => `₹${value}`}
              />
              <YAxis
                yAxisId="right"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={25}
                orientation="right"
                className="hidden sm:block" // Hide right Y-axis on mobile
                tickFormatter={(value) => `${value}`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="total"
                stroke="var(--color-total)"
                strokeWidth={1.5}
                dot={{ fill: "var(--color-total)", strokeWidth: 1, r: 3 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="expenses"
                stroke="var(--color-expenses)"
                strokeWidth={1.5}
                dot={{ fill: "var(--color-expenses)", strokeWidth: 1, r: 3 }}
                className="hidden sm:block" // Hide expenses line on mobile
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}