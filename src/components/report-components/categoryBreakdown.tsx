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
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

interface CategoryData {
  name: string;
  value: number;
}

interface CategoryBreakdownProps {
  data: CategoryData[];
  detailed?: boolean;
}

export function CategoryBreakdown({ data, detailed = false }: CategoryBreakdownProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="p-4">
          <CardTitle className="text-base sm:text-lg">Spending by Category</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            No data available
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const COLORS = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444", "#6366F1", "#EC4899"];

  return (
    <Card className={detailed ? "col-span-full" : ""}>
      <CardHeader className="p-4">
        <CardTitle className="text-base sm:text-lg">Spending by Category</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Breakdown of expenses by category
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        <div className={`grid ${detailed ? "grid-cols-1" : "grid-cols-1"} gap-4`}>
          <ChartContainer config={{}} className="h-[200px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  nameKey="name"
                >
                  {data.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
          {detailed && (
            <div className="space-y-3">
              {data.map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-xs sm:text-sm font-medium">{category.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs sm:text-sm font-semibold">₹{category.value.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {(
                        (category.value / data.reduce((sum, item) => sum + item.value, 0)) *
                        100
                      ).toFixed(1)}
                      %
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}