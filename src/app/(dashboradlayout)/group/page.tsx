"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { fetchGroups, createGroup } from "@/lib/api";
import { GroupFormData, PopulatedGroup } from "@/types/type";
import { CreateGroupModal } from "@/components/group-components/create-group-modal";
import { GroupGrid } from "@/components/group-components/GroupGrid";
import { StatCard } from "@/components/group-components/StatCard";

export default function GroupsPage() {
  const [groups, setGroups] = useState<PopulatedGroup[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const data = await fetchGroups();
      setGroups(data);
    } catch (error) {
      console.error("Failed to fetch groups", error);
      toast.error("Failed to load groups");
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateGroup = async (groupData: GroupFormData) => {
    try {
      const response = await createGroup(groupData);
      if (response.ok) {
        toast.success(`Group "${groupData.name}" created successfully!`);
        setIsCreateModalOpen(false);
        fetchData();
      } else {
        toast.error("Failed to create group");
      }
    } catch (error) {
      console.error("Create group error:", error);
      toast.error("Something went wrong");
    }
  };

  const filteredGroups: PopulatedGroup[] = useMemo(() => {
    return groups.filter((group) =>
      group.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [groups, searchQuery]);

  return (
    <DashboardLayout>
      <div className="space-y-6 px-8 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Groups</h1>
            <p className="text-muted-foreground">
              Manage your expense groups and members
            </p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" /> Create Group
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Groups"
            icon={<Users />}
            value={groups.length}
          />
          <StatCard
            title="Total Members"
            icon={<Users />}
            value={groups.reduce((sum, g) => sum + g.members.length, 0)}
          />
          <StatCard
            title="Total Spent"
            icon={<TrendingUp />}
            value={`$${groups
              .reduce((sum, g) => sum + (g.totalSpent || 0), 0)
              .toLocaleString()}`}
          />
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <GroupGrid groups={filteredGroups} />

        <CreateGroupModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateGroup}
        />
      </div>
    </DashboardLayout>
  );
}
