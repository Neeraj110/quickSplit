import { GroupCardData, PopulatedGroup } from "@/types/type";
import { Card, CardContent } from "@/components/ui/card";
import { GroupCard } from "@/components/dashboard-components/group-card";
import { Users } from "lucide-react";

export function GroupGrid({ groups }: { groups: PopulatedGroup[] }) {
  if (groups.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Users className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No groups found</h3>
          <p className="text-muted-foreground text-center mb-4">
            Create your first group to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => {
        const groupCard: GroupCardData = {
          _id: group._id,
          name: group.name,
          members: group.members.length,
          totalSpent: group.totalSpent || 0,
          yourBalance: group.yourBalance || 0,
        };

        return <GroupCard key={group._id} group={groupCard} />;
      })}
    </div>
  );
}
