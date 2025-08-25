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
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

interface ExpenseChartProps {
  data: { month: string; total: number }[];
}

export function ExpenseChart({ data }: ExpenseChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="p-3 sm:p-4">
          <CardTitle className="text-sm sm:text-lg">Monthly Expenses</CardTitle>
          <CardDescription className="text-xs">
            No data available
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="p-3 sm:p-4">
        <CardTitle className="text-sm sm:text-lg">Monthly Expenses</CardTitle>
        <CardDescription className="text-xs">
          Your spending over the last 6 months
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-4">
        <ChartContainer
          config={{
            total: {
              label: "Amount",
              color: "hsl(var(--chart-1))",
            },
          }}
          className="h-[150px] sm:h-[300px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
              barSize={20}
            >
              <XAxis
                dataKey="month"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                tickFormatter={(value) => value.slice(0, 3)} // Abbreviate month names
              />
              <YAxis
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={30}
                tickFormatter={(value) => `$${value}`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="total" fill="var(--color-amount)" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}