"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

export default function HomePage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#090a0f]">
      <div className="flex items-center space-x-2 text-indigo-400 animate-pulse">
        <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
        <span className="text-sm font-medium tracking-wide">Loading DevPulse...</span>
      </div>
    </div>
  );
}
