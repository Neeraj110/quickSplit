"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Settings,
  Menu,
  Activity,
  LogOut,
  CreditCard,
  User,
  Sun,
  Moon,
  Handshake,
} from "lucide-react";
import { signOut } from "next-auth/react";
import SidebarContent from "./SidebarContent";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useDispatch } from "react-redux";
import { setCredentials } from "@/redux/slices/userSlice";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
// import Image from "next/image";
import Link from "next/link";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function ToggleThemeButton() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="transition-all duration-200"
    >
      <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session, status } = useSession();
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useSelector((state: RootState) => state.user);

  useEffect(() => {
    if (status === "loading" || user) return;
    if (session) {
      const fetchUser = async () => {
        try {
          const response = await fetch("/api/user");
          if (!response.ok) throw new Error("Failed to fetch user data");
          const userData = await response.json();
          dispatch(setCredentials(userData));
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      };
      fetchUser();
    } else {
      router.push("/signin");
    }
  }, [session, status, router, dispatch, user]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse">
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-gray-600">Redirecting to sign in...</p>
      </div>
    );
  }

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Groups", href: "/group", icon: Users },
    { name: "Report", href: "/report", icon: Activity },
    { name: "Settle", href: "/settlements", icon: Handshake },
    { name: "Settings", href: "/setting", icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/signin" });
  };

  // Helper function to get user initials for fallback
  const getUserInitials = (name: string = "") => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const avatarSrc =
    user?.avatar && user.avatar.trim() !== "" ? user.avatar : undefined;

  return (
    <div className="min-h-screen">
      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden ">
          <div
            className="fixed inset-0 bg-opacity-75"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 flex w-64 flex-col  shadow-xl bg-background min-h-screen">
            <SidebarContent
              navigation={navigation}
              pathname={pathname}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Sidebar for larger screens */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-58 lg:flex-col">
        <SidebarContent navigation={navigation} pathname={pathname} />
      </div>

      <div className="lg:pl-58">
        <div className="sticky top-0 z-40 flex h-16 items-center gap-x-4 border-b bg-background/95 backdrop-blur px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="size-4" />
          </Button>
          <h1 className="lg:hidden">
            <span className="text-lg font-semibold tracking-tight">
              <Link href="/dashboard">QuickSplit</Link>
            </span>
          </h1>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 ">
            <div className="flex flex-1" />
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <ToggleThemeButton />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative size-8 rounded-full"
                  >
                    <Avatar className="size-8">
                      <AvatarImage src={avatarSrc} alt="User" />
                      <AvatarFallback className="bg-primary/10 text-primary font-medium">
                        {getUserInitials(user?.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-56 bg-background"
                  align="end"
                  forceMount
                >
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 size-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CreditCard className="mr-2 size-4" />
                    <span>Payment Methods</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 size-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Button
                      className="w-full bg-red-500"
                      onClick={handleSignOut}
                    >
                      <LogOut className="mr-2 size-4" />
                      <span>Log out</span>
                    </Button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
}
