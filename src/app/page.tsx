"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "loading") return;

    if (status === "authenticated") {
      router.push("/dashboard");
    } else {
      router.push("/home");
    }
  }, [status, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background" suppressHydrationWarning>
      <div className="flex items-center space-x-2" suppressHydrationWarning>
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-lg text-on-surface">Redirecting...</p>
      </div>
    </div>
  );
}