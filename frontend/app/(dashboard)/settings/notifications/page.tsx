"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Mail, Trash2, Plus, ShieldCheck, CheckCircle2 } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";

export default function NotificationsSettingsPage() {
  const [channels, setChannels] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const fetchData = async () => {
    try {
      const [channelsRes, logsRes] = await Promise.all([
        apiClient.get<any[]>("/notifications/channels"),
        apiClient.get<any[]>("/notifications/logs"),
      ]);
      setChannels(channelsRes.data || []);
      setLogs(logsRes.data || []);
    } catch (err) {
      console.error("Failed to load notification settings:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setIsAdding(true);

    try {
      await apiClient.post("/notifications/channels", {
        destination: newEmail.trim(),
        notifyOnDown: true,
        notifyOnRecovery: true,
      });
      setNewEmail("");
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to add email channel");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteChannel = async (id: string) => {
    if (!confirm("Are you sure you want to delete this alert channel?")) return;
    try {
      await apiClient.delete(`/notifications/channels/${id}`);
      fetchData();
    } catch (err) {
      alert("Failed to delete alert channel");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Notification Channels</h1>
        <p className="text-xs text-slate-400">
          Configure where downtime and recovery alerts are dispatched with 30-minute alert cooldown protection
        </p>
      </div>

      {/* Add Email Channel Form */}
      <div className="rounded-xl border border-[#232838] bg-[#11131a] p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Add Alert Recipient (Email)</h3>
        <form onSubmit={handleAddChannel} className="flex flex-col sm:flex-row gap-3">
          <Input
            type="email"
            placeholder="alerts@yourdomain.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            className="flex-1"
          />
          <Button type="submit" size="md" isLoading={isAdding} className="gap-1.5 shrink-0">
            <Plus className="h-4 w-4" /> Add Recipient
          </Button>
        </form>
      </div>

      {/* Configured Channels List */}
      <div className="rounded-xl border border-[#232838] bg-[#11131a] p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Active Alert Channels</h3>
        {channels.length > 0 ? (
          <div className="divide-y divide-[#232838]">
            {channels.map((ch) => (
              <div key={ch.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">{ch.destination}</p>
                    <p className="text-[11px] text-slate-500">
                      Down: {ch.notifyOnDown ? "Yes" : "No"} • Recovery: {ch.notifyOnRecovery ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteChannel(ch.id)}
                  className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-[#151922] transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">No alert channels configured.</p>
        )}
      </div>

      {/* Alert Logs / History */}
      <div className="rounded-xl border border-[#232838] bg-[#11131a] p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Recent Alert Dispatch Log</h3>
        {logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#232838] text-slate-400">
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Recipient</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Sent At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232838]/60 text-slate-300">
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-2.5">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                          log.alertType === "DOWN"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-emerald-500/10 text-emerald-400"
                        }`}
                      >
                        {log.alertType}
                      </span>
                    </td>
                    <td className="py-2.5 font-mono">{log.recipient}</td>
                    <td className="py-2.5">
                      <span className="text-[10px] text-emerald-400">{log.status}</span>
                    </td>
                    <td className="py-2.5 text-slate-400">{formatTimeAgo(log.sentAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-500">No alerts have been dispatched yet.</p>
        )}
      </div>
    </div>
  );
}
