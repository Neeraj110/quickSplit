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
    <>
      <div 
        onClick={() => setDetailsOpen(true)}
        className="bg-surface-container-lowest rounded-2xl p-5 shadow-ambient cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg flex flex-col gap-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center shrink-0">
             <Users className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-on-surface text-base">
              {group.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {group.members} members • {showCategory && group.category ? group.category : "Shared"} {isArchived && "• Archived"}
            </span>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm font-semibold text-muted-foreground">Your Share</span>
          {isOwed ? (
            <span className="font-bold text-primary">Owed {currency} {Math.abs(group.yourBalance).toFixed(2)}</span>
          ) : owes ? (
            <span className="font-bold text-tertiary">Owe {currency} {Math.abs(group.yourBalance).toFixed(2)}</span>
          ) : (
            <span className="font-bold text-on-surface">Settled Up</span>
          )}
        </div>
      </div>

      {detailsOpen && (
        <GroupDetailsModal
          group={group}
          open={detailsOpen}
          onclose={() => setDetailsOpen(false)}
        />
      )}
    </>
  );
}
