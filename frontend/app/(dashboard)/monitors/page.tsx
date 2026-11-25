"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Server,
  Plus,
  Search,
  Play,
  Pause,
  Trash2,
  ExternalLink,
  Clock,
  ArrowUpDown,
  Lock,
} from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";

export default function MonitorsPage() {
  const [monitors, setMonitors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchMonitors = async () => {
    try {
      const res = await apiClient.get<any[]>("/monitors");
      setMonitors(res.data || []);
    } catch (err) {
      console.error("Failed to load monitors:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitors();
  }, []);

  const handleTogglePause = async (id: string, isPaused: boolean) => {
    try {
      const endpoint = isPaused ? `/monitors/${id}/resume` : `/monitors/${id}/pause`;
      await apiClient.post(endpoint);
      fetchMonitors();
    } catch (err) {
      alert("Failed to update monitor status");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete monitor "${name}"?`)) return;
    try {
      await apiClient.delete(`/monitors/${id}`);
      fetchMonitors();
    } catch (err) {
      alert("Failed to delete monitor");
    }
  };

  const filteredMonitors = monitors.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.url.toLowerCase().includes(search.toLowerCase());

    if (statusFilter === "ALL") return matchesSearch;
    if (statusFilter === "PAUSED") return matchesSearch && m.isPaused;
    if (statusFilter === "UP") return matchesSearch && !m.isPaused && m.currentStatus === "UP";
    if (statusFilter === "DOWN") return matchesSearch && !m.isPaused && m.currentStatus === "DOWN";
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Monitors</h1>
          <p className="text-xs text-slate-400">
            Manage your monitored APIs, websites, and endpoints
          </p>
        </div>
        <Link href="/monitors/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add Monitor
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Filter by name or URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "UP", "DOWN", "PAUSED"].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                statusFilter === f
                  ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
                  : "text-slate-400 hover:bg-[#151922] hover:text-slate-200 border border-transparent"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Monitors List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-[#11131a] border border-[#232838] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredMonitors.length > 0 ? (
        <div className="space-y-3">
          {filteredMonitors.map((m) => (
            <div
              key={m.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-[#232838] bg-[#11131a] hover:border-slate-700 transition-colors gap-4"
            >
              {/* Left Details */}
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div
                  className={`mt-1 sm:mt-0 h-3 w-3 rounded-full shrink-0 ${
                    m.isPaused
                      ? "bg-amber-500 shadow-sm shadow-amber-500/50"
                      : m.currentStatus === "UP"
                      ? "bg-emerald-500 shadow-sm shadow-emerald-500/50"
                      : m.currentStatus === "DOWN"
                      ? "bg-red-500 shadow-sm shadow-red-500/50"
                      : "bg-slate-500"
                  }`}
                />
                <div className="space-y-1 truncate">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/monitors/${m.id}`}
                      className="text-sm font-semibold text-white hover:text-indigo-400 transition-colors truncate"
                    >
                      {m.name}
                    </Link>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {m.httpMethod}
                    </span>
                    {m.sslDetails && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono flex items-center gap-1 ${
                          m.sslDetails.daysRemaining > 30
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        <Lock className="h-2.5 w-2.5" />
                        SSL: {m.sslDetails.daysRemaining}d
                      </span>
                    )}
                    {m.isPaused && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Paused
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="truncate max-w-xs sm:max-w-md">{m.url}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Every {Math.floor(m.checkIntervalSeconds / 60)}m
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Metrics & Actions */}
              <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#232838]">
                <div className="text-right">
                  <div className="text-sm font-bold font-mono text-slate-200">
                    {m.uptimePercentage}%
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {m.lastCheckedAt ? formatTimeAgo(m.lastCheckedAt) : "Never checked"}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleTogglePause(m.id, m.isPaused)}
                    title={m.isPaused ? "Resume Monitoring" : "Pause Monitoring"}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#1f2433] transition-colors"
                  >
                    {m.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </button>

                  <Link
                    href={`/monitors/${m.id}`}
                    title="View Details"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-[#1f2433] transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>

                  <button
                    onClick={() => handleDelete(m.id, m.name)}
                    title="Delete Monitor"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-[#1f2433] transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#232838] p-12 text-center space-y-3">
          <Server className="h-8 w-8 text-slate-500 mx-auto" />
          <h3 className="text-sm font-medium text-slate-300">No monitors match your filter</h3>
          <p className="text-xs text-slate-500">Try adjusting your search criteria or add a new monitor.</p>
        </div>
      )}
    </div>
  );
}
