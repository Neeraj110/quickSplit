"use client";
import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  User,
  Bell,
  Smartphone,
  Mail,
  Upload,
  Trash2,
  Settings,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { fetchUserProfile } from "@/lib/api";

const UserSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters")
    .transform((str) => str.trim().replace(/[<>]/g, "")),
  email: z.string().email("Invalid email address"),
  avatar: z
    .instanceof(File)
    .optional()
    .nullable()
    .refine(
      (file) => !file || file.size <= 5 * 1024 * 1024,
      "File size must be less than 5MB"
    )
    .refine(
      (file) => !file || ["image/jpeg", "image/png", "image/webp"].includes(file.type),
      "Only JPEG, PNG, or WebP files are allowed"
    ),
});

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface NotificationSettings {
  email: boolean;
  push: boolean;
  sms: boolean;
  weeklyDigest: boolean;
  paymentReminders: boolean;
  newExpenses: boolean;
}


const NOTIFICATION_CHANNELS = [
  {
    key: "email",
    icon: Mail,
    label: "Email Notifications",
    desc: "Receive notifications via email",
  },
  {
    key: "push",
    icon: Bell,
    label: "Push Notifications",
    desc: "Browser push notifications",
  },
  {
    key: "sms",
    icon: Smartphone,
    label: "SMS Notifications",
    desc: "Important updates via SMS",
  },
] as const;

const ACTIVITY_NOTIFICATIONS = [
  {
    key: "newExpenses",
    label: "New Expenses",
    desc: "When new expenses are added to your groups",
  },
  {
    key: "paymentReminders",
    label: "Payment Reminders",
    desc: "Reminders about outstanding balances",
  },
  {
    key: "weeklyDigest",
    label: "Weekly Digest",
    desc: "Weekly summary of your group activity",
  },
] as const;

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email: true,
    push: false,
    sms: false,
    weeklyDigest: true,
    paymentReminders: true,
    newExpenses: true,
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const userProfile = await fetchUserProfile();
        setProfile(userProfile);
      } catch (error) {
        console.error("Failed to fetch user profile:", error);
        toast.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSaveProfile = useCallback(async () => {
    if (!profile) return;

    setIsSubmitting(true);
    try {
      const parsed = UserSchema.safeParse({
        name: profile.name,
        email: profile.email,
        avatar: avatarFile,
      });

      if (!parsed.success) {
        const errors = parsed.error.flatten().fieldErrors;
        toast.error(
          Object.values(errors)
            .flat()
            .join(", ") || "Invalid input data"
        );
        return;
      }

      const formData = new FormData();
      formData.append("name", parsed.data.name);
      formData.append("email", parsed.data.email);
      if (parsed.data.avatar) {
        formData.append("avatar", parsed.data.avatar);
      }

      const response = await fetch("/api/user", {
        method: "PATCH",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update profile");
      }

      const updatedUser = await response.json();
      setProfile(updatedUser.user);
      setAvatarFile(null);
      toast.success(updatedUser.message || "Profile updated successfully!");
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  }, [profile, avatarFile]);

  const handleSaveNotifications = async () => {
    toast.success("Notification preferences saved successfully!");
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarFile(null);
    setProfile((prev) => (prev ? { ...prev, avatar: undefined } : null));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 px-8 py-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences</p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="profile" className="space-y-4">

          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center gap-2"
              aria-label="Profile settings">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="flex items-center gap-2"
              aria-label="Notification settings"
            >
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
          </TabsList>


          {/* Profile */}
          <TabsContent value="profile">
            <Card className="border-0 shadow-md">
              <CardHeader className="p-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <User className="w-4 h-4 text-blue-600" />
                  Profile Information
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Update your personal information and profile picture
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-4">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-4 p-4 rounded-lg border">
                  <Avatar className="w-20 h-20 ring-2 ring-white dark:ring-slate-700">
                    <AvatarImage
                      src={
                        avatarFile
                          ? URL.createObjectURL(avatarFile)
                          : profile?.avatar || "/placeholder-user.jpg"
                      }
                      alt="User avatar"
                    />
                    <AvatarFallback className="text-xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {profile?.name?.[0] || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <Button
                      variant="outline"
                      className="flex-1 h-10 text-sm"
                      asChild
                    >
                      <label>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Avatar
                        <Input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={handleAvatarChange}
                          aria-label="Upload avatar"
                        />
                      </label>
                    </Button>
                    {profile?.avatar || avatarFile ? (
                      <Button
                        variant="destructive"
                        className="flex-1 h-10 text-sm"
                        onClick={handleRemoveAvatar}
                        aria-label="Remove avatar"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>

                {/* Profile Form */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-xs sm:text-sm">
                      Full Name
                    </Label>
                    <Input
                      id="name"
                      value={profile?.name || ""}
                      onChange={(e) =>
                        setProfile((prev) =>
                          prev ? { ...prev, name: e.target.value } : null
                        )
                      }
                      className="h-10 text-sm"
                      aria-label="Full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs sm:text-sm">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile?.email || ""}
                      onChange={(e) =>
                        setProfile((prev) =>
                          prev ? { ...prev, email: e.target.value } : null
                        )
                      }
                      className="h-10 text-sm"
                      aria-label="Email address"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isSubmitting || loading}
                    className="h-10 text-sm bg-green-600 text-white px-6"
                    aria-label="Save profile changes"
                  >
                    {isSubmitting ? (
                      "Saving..."
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications">
            <Card className="border-0 shadow-md">
              <CardHeader className="p-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Bell className="w-4 h-4 text-amber-600" />
                  Notification Preferences
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Customize how you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 p-4">
                {/* Channels */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                    <Settings className="w-4 h-4 text-slate-600" />
                    Notification Channels
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {NOTIFICATION_CHANNELS.map(({ key, icon: Icon, label, desc }) => (
                      <div key={key} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-50">
                              <Icon className="w-4 h-4 text-blue-600" />
                            </div>
                            <div>
                              <Label className="text-sm">{label}</Label>
                              <p className="text-xs text-slate-500">{desc}</p>
                            </div>
                          </div>
                          <Switch
                            checked={notifications[key]}
                            onCheckedChange={(checked) =>
                              setNotifications((prev) => ({ ...prev, [key]: checked }))
                            }
                            aria-label={`Toggle ${label}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Activities */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                    <Bell className="w-4 h-4 text-slate-600" />
                    Activity Notifications
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {ACTIVITY_NOTIFICATIONS.map(({ key, label, desc }) => (
                      <div key={key} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm">{label}</Label>
                            <p className="text-xs text-slate-500">{desc}</p>
                          </div>
                          <Switch
                            checked={notifications[key]}
                            onCheckedChange={(checked) =>
                              setNotifications((prev) => ({ ...prev, [key]: checked }))
                            }
                            aria-label={`Toggle ${label}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveNotifications}
                    className="h-10 text-sm bg-green-600 text-white px-6"
                    aria-label="Save notification preferences"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div >

    </DashboardLayout >
  );
}