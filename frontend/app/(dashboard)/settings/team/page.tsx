"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, UserPlus, Trash2, ShieldCheck, Mail } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";

export default function TeamSettingsPage() {
  const [team, setTeam] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const fetchTeam = async () => {
    try {
      const res = await apiClient.get<any>("/teams/members");
      setTeam(res.data);
    } catch (err) {
      console.error("Failed to load team:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    setInviteSuccess(null);

    try {
      await apiClient.post("/teams/invitations", {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteSuccess(`Invitation issued for ${inviteEmail}`);
      setInviteEmail("");
      fetchTeam();
    } catch (err: any) {
      alert(err.message || "Failed to invite team member");
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from this team?`)) return;
    try {
      await apiClient.delete(`/teams/members/${userId}`);
      fetchTeam();
    } catch (err: any) {
      alert(err.message || "Failed to remove member");
    }
  };

  if (isLoading) {
    return <div className="text-xs text-slate-400 animate-pulse">Loading team details...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Team Management</h1>
        <p className="text-xs text-slate-400">
          Manage member access, invitations, and role-based permissions
        </p>
      </div>

      {/* Invite Member Form */}
      <form onSubmit={handleInvite} className="rounded-xl border border-[#232838] bg-[#11131a] p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Invite Team Member</h3>
        {inviteSuccess && (
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
            {inviteSuccess}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Input
              type="email"
              placeholder="colleague@yourcompany.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-2">
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="flex-1 rounded-lg border border-[#232838] bg-[#0c0e15] px-2.5 py-1 text-xs text-slate-200"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
            <Button type="submit" size="sm" isLoading={isInviting} className="gap-1.5 shrink-0">
              <UserPlus className="h-3.5 w-3.5" /> Invite
            </Button>
          </div>
        </div>
      </form>

      {/* Members List */}
      <div className="rounded-xl border border-[#232838] bg-[#11131a] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Team Members ({team?.members?.length || 0})</h3>
          <span className="text-xs text-slate-400">Team: {team?.name}</span>
        </div>

        <div className="divide-y divide-[#232838]">
          {(team?.members || []).map((m: any) => (
            <div key={m.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-400">
                  {m.user?.name?.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">{m.user?.name}</p>
                  <p className="text-[11px] text-slate-500">{m.user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {m.role}
                </span>
                {m.role !== "OWNER" && (
                  <button
                    onClick={() => handleRemoveMember(m.user?.id, m.user?.name)}
                    className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-[#151922] transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
