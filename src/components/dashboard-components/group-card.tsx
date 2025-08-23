"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight } from "lucide-react";
import type { GroupCardData } from "@/types/type";
import Link from "next/link";
import { useState } from "react";
import { GroupDetailsModal } from "@/components/group-components/group-details-modal";

interface GroupCardProps {
  group: GroupCardData;
  showCategory?: boolean;
  isArchived?: boolean;
}

export function GroupCard({
  group,
  showCategory = false,
  isArchived = false,
}: GroupCardProps) {
  const isOwed = group.yourBalance > 0;
  const owes = group.yourBalance < 0;
  const currency = group.currency || "INR";
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{group.name}</CardTitle>
          <div className="flex items-center gap-2">
            {showCategory && group.category && (
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
              >
                {group.category}
              </Badge>
            )}
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {group.members}
            </Badge>
            {isArchived && (
              <Badge
                variant="outline"
                className="bg-gray-50 text-gray-600 border-gray-200"
              >
                Archived
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total spent</span>
          <span className="font-medium">
            {currency} {group.totalSpent.toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Your balance</span>
          <div className="flex items-center gap-2">
            <span
              className={`font-semibold ${
                isOwed
                  ? "text-green-600"
                  : owes
                  ? "text-red-600"
                  : "text-muted-foreground"
              }`}
            >
              {isOwed && "+"}
              {Math.abs(group.yourBalance).toFixed(2)}
            </span>
            {isOwed && (
              <Badge
                variant="outline"
                className="text-green-600 border-green-200 bg-green-50"
              >
                You are owed
              </Badge>
            )}
            {owes && (
              <Badge
                variant="outline"
                className="text-red-600 border-red-200 bg-red-50"
              >
                You owe
              </Badge>
            )}
          </div>
        </div>

        <Link href={"/group"}>
          <Button
            variant="outline"
            className="w-full group bg-transparent"
            onClick={() => setDetailsOpen(true)}
          >
            View Details
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>

        {detailsOpen && (
          <GroupDetailsModal
            group={group}
            open={detailsOpen}
            onclose={() => setDetailsOpen(false)}
          />
        )}
      </CardContent>
    </Card>
  );
}
