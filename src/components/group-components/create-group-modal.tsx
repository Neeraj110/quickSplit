"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { X, Plus, Mail, Users } from "lucide-react";
import { z } from "zod";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import type { GroupFormData } from "@/types/type"; // ✅ Use centralized type
import { Button } from "@/components/ui/button";


const MemberSchema = z.object({
  email: z.string().email("Invalid email"),
  name: z.string().optional(),
});

const GroupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
  members: z.array(MemberSchema).min(1, "At least one member is required"),
});

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: GroupFormData) => void;
}

export function CreateGroupModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateGroupModalProps) {
  const [step, setStep] = useState(1);

  const form = useForm<GroupFormData>({
    resolver: zodResolver(GroupSchema),
    defaultValues: {
      name: "",
      description: "",
      members: [{ email: "", name: "" }],
    },
  });

  const {
    fields: memberFields,
    append,
    remove,
  } = useFieldArray({
    name: "members",
    control: form.control,
  });

  const handleNext = () => {
    if (step === 1) {
      form.trigger(["name"]).then((valid) => {
        if (valid) setStep(2);
      });
    }
  };

  const handleSubmit = (data: GroupFormData) => {
    onSubmit({
      ...data,
      members: data.members.filter((m) => m.email),
    });
    onClose();
    form.reset();
    setStep(1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Set up your group details and preferences"
              : "Invite members to join your group"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {step === 1 && (
              <>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Office Trip" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-base">Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">
                          {form.watch("name") || "Group Name"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {form.watch("description") || "No description"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {step === 2 && (
              <>
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">
                    Invite Members
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ email: "", name: "" })}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Member
                  </Button>
                </div>

                <div className="space-y-3">
                  {memberFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>
                          <Mail className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name={`members.${index}.email`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input placeholder="Email address" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`members.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input
                                  placeholder="Name (optional)"
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      {memberFields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <div className="text-sm text-muted-foreground font-mono">
                    <p>• Members will receive an email invitation to join</p>
                    <p>• You can add more members later from group settings</p>
                    <p>• Members can start adding expenses after joining</p>
                  </div>
                </div>

                <Card className="bg-green-50 dark:bg-green-900/20 border-green-200">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Group Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span>Group Name:</span>
                      <span className="font-medium">
                        {form.watch("name") || "No name provided"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Members to invite:</span>
                      <span className="font-medium">
                        {form.watch("members").length}{" "}
                        {form.watch("members").length === 1
                          ? "member"
                          : "members"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            <DialogFooter className="flex justify-between">
              <div>
                {step === 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={
                    step === 1 ? handleNext : form.handleSubmit(handleSubmit)
                  }
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {step === 1 ? "Next" : "Create Group"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
