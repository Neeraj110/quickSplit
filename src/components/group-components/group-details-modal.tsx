import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  Pencil,
  Trash2,
  Calendar,
  User,
  Mail,
  Crown,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchGroupDetails,
  deleteGroup,
  updateGroup,
  fetchGroups,
} from "@/lib/api";
import { GroupCardData, GroupMember, PopulatedGroup } from "@/types/type";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

type GroupDetailsModalProps = {
  open: boolean;
  onclose: () => void;
  group: GroupCardData;
};

const groupUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Group name is required")
    .max(100, "Group name must be less than 100 characters")
    .trim(),
  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
});

type GroupUpdateFormValues = z.infer<typeof groupUpdateSchema>;

export function GroupDetailsModal({
  open,
  onclose,
  group,
}: GroupDetailsModalProps) {
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [data, setData] = useState<PopulatedGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<GroupUpdateFormValues>({
    resolver: zodResolver(groupUpdateSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const {
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = form;

  useEffect(() => {
    if (!open) return;

    setEditMode(false);
    setLoading(true);

    const loadGroupDetails = async () => {
      try {
        const response = await fetchGroupDetails(group._id);

        if (response) {
          const groupData = response?.group;
          setData(groupData as PopulatedGroup);

          reset({
            name: (groupData as PopulatedGroup).name || "",
            description: (groupData as PopulatedGroup).description || "",
          });
        } else {
          toast.error("Failed to load group details");
          onclose();
        }
      } catch (error) {
        console.error("Error loading group details:", error);
        toast.error("Failed to load group details");
        onclose();
      } finally {
        setLoading(false);
      }
    };

    loadGroupDetails();
  }, [open, group._id, reset, onclose]);

  const onSubmit = async (values: GroupUpdateFormValues) => {
    if (!data) return;

    try {
      const response = await updateGroup(data._id, values);
      if (response.ok) {
        const updatedData = await response.json();
        if (updatedData.success) {
          toast.success("Group updated successfully");
          setEditMode(false);
          if (updatedData?.group) {
            setData(updatedData.group);
          }
        } else {
          toast.error(updatedData.error || "Failed to update group");
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to update group");
      }
    } catch (error) {
      console.error("Error updating group:", error);
      toast.error("Failed to update group");
    }
  };

  const handleDelete = async () => {
    if (!data) return;

    setDeleting(true);
    try {
      await deleteGroup(data._id);
      setConfirmOpen(false);
      fetchGroups();
      toast.success("Group deleted successfully");
      onclose();
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error("Failed to delete group");
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    // Reset form to original values
    if (data) {
      reset({
        name: data.name || "",
        description: data.description || "",
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onclose}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {editMode ? "Edit Group" : "Group Details"}
            </DialogTitle>
            <DialogDescription>
              {editMode
                ? "Update your group's information and settings."
                : "View comprehensive information about this group and its members."}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2">Loading group details...</span>
            </div>
          ) : (
            data && (
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold ">{data.name}</h2>
                      <Badge variant="secondary" className="text-xs">
                        {data.members?.length || 0} members
                      </Badge>
                    </div>
                    {data.description && !editMode && (
                      <p className="text-gray-600 text-sm leading-relaxed">
                        {data.description}
                      </p>
                    )}
                  </div>

                  {!editMode && (
                    <div className="flex gap-2 ml-4 sm:flex-row flex-col">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmOpen(true)}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                        disabled={deleting}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                      <Button size="sm" onClick={() => setEditMode(true)}>
                        <Pencil className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  )}
                </div>

                <Separator />

                {editMode ? (
                  <Card>
                    <CardContent className="pt-6">
                      <Form {...form}>
                        <form
                          onSubmit={handleSubmit(onSubmit)}
                          className="space-y-6"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                              control={form.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Group Name *</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="Enter group name"
                                      {...field}
                                      disabled={isSubmitting}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem className="md:col-span-2">
                                  <FormLabel>Description</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Enter group description (optional)"
                                      className="min-h-[100px] resize-none"
                                      {...field}
                                      disabled={isSubmitting}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="flex justify-end gap-3 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleCancelEdit}
                              disabled={isSubmitting}
                            >
                              Cancel
                            </Button>
                            <Button
                              type="submit"
                              disabled={isSubmitting || !isDirty}
                              className=""
                            >
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                "Save Changes"
                              )}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardContent className="pt-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Calendar className="w-5 h-5 " />
                          Group Information
                        </h3>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium ">Created</p>
                            <p className="text-sm ">
                              {data.createdAt
                                ? new Date(data.createdAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  }
                                )
                                : "Unknown"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium ">Last Updated</p>
                            <p className="text-sm ">
                              {data.updatedAt
                                ? new Date(data.updatedAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  }
                                )
                                : "Unknown"}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium ">Description</p>
                            <p className="text-sm ">
                              {data.description || "No description provided"}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Users className="w-5 h-5 " />
                          Members ({data.members?.length || 0})
                        </h3>
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                          {data.members && data.members.length > 0 ? (
                            data.members.map((member: GroupMember) => (
                              <div
                                key={member._id}
                                className="flex items-center gap-3 p-3 rounded-lg border "
                              >
                                <div className="w-8 h-8 rounded-full  flex items-center justify-center">
                                  <User className="w-4 h-4 " />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium truncate">
                                      {member.name}
                                    </p>
                                    {data.admin &&
                                      (member._id === data.admin._id ||
                                        member._id === data.admin._id) && (
                                        <Crown className="w-4 h-4 text-yellow-500" />
                                      )}
                                  </div>
                                  <div className="flex items-center gap-1 text-xs ">
                                    <Mail className="w-3 h-3" />
                                    <span className="truncate">
                                      {member.email}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm text-center py-4">
                              No members found
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )
          )}

          {!editMode && (
            <DialogFooter>
              <Button variant="outline" onClick={onclose}>
                Close
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Delete Group
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Are you sure you want to delete this group?</p>
              <p className="font-medium">This will permanently:</p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                <li>Delete all expenses in this group</li>
                <li>Remove the group from all members</li>
                <li>Remove all group data</li>
              </ul>
              <p className="text-red-600 font-medium">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Group
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}