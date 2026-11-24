"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import {
  Activity,
  LayoutDashboard,
  Server,
  AlertTriangle,
  BarChart3,
  Globe,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Monitors", href: "/monitors", icon: Server },
  { name: "Incidents", href: "/incidents", icon: AlertTriangle },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Status Pages", href: "/status-pages", icon: Globe },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, team, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090a0f]">
        <div className="flex items-center space-x-3 text-indigo-400">
          <div className="h-2 w-2 rounded-full bg-indigo-500 animate-ping"></div>
          <span className="text-sm font-medium">Loading DevPulse workspace...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-[#090a0f] text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#232838] bg-[#0c0e15] flex flex-col justify-between select-none">
        <div>
          {/* Brand & Team Switcher */}
          <div className="p-4 border-b border-[#232838]">
            <Link href="/dashboard" className="flex items-center space-x-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
                <Activity className="h-4 w-4" />
              </div>
              <span className="text-base font-bold tracking-tight text-white">DevPulse</span>
            </Link>

            <div className="mt-4 flex items-center justify-between rounded-lg border border-[#232838] bg-[#11131a] p-2 text-xs">
              <div className="truncate">
                <p className="font-medium text-slate-200 truncate">{team?.name || "Personal Team"}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{team?.role || "OWNER"}</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                    isActive
                      ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
                      : "text-slate-400 hover:bg-[#151922] hover:text-slate-200"
                  )}
                >
                  <Icon className={cn("h-4 w-4", isActive ? "text-indigo-400" : "text-slate-500")} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer / User Profile & Logout */}
        <div className="p-3 border-t border-[#232838] space-y-2">
          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="truncate">
              <p className="text-xs font-medium text-slate-200 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-[#1a1e29] transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <div className="rounded border border-emerald-500/20 bg-emerald-500/5 px-2 py-1 text-[10px] text-emerald-400 flex items-center justify-between">
            <span>Free Tier (₹0)</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="p-8 max-w-7xl w-full mx-auto">{children}</div>
      </main>
    </div>
  );
}
