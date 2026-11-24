"use client";

import Link from "next/link";
import { Users, Bell, ArrowRight } from "lucide-react";

export default function SettingsHubPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Organization Settings</h1>
        <p className="text-xs text-slate-400">Manage your alerts, members, and organization details</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/settings/notifications"
          className="p-5 rounded-xl border border-[#232838] bg-[#11131a] hover:border-slate-700 transition-colors space-y-3 group"
        >
          <div className="h-10 w-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors flex items-center justify-between">
              Notification Channels
              <ArrowRight className="h-4 w-4 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure email alert recipients, cooldown buffers, and dispatch history
            </p>
          </div>
        </Link>

        <Link
          href="/settings/team"
          className="p-5 rounded-xl border border-[#232838] bg-[#11131a] hover:border-slate-700 transition-colors space-y-3 group"
        >
          <div className="h-10 w-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors flex items-center justify-between">
              Team Members
              <ArrowRight className="h-4 w-4 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Invite teammates, manage project-level access, and configure roles
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
