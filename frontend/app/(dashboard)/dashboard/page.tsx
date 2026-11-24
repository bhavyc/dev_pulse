"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Server,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Plus,
  Activity,
  ShieldAlert,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export default function DashboardOverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [monitors, setMonitors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [overviewRes, monitorsRes] = await Promise.all([
        apiClient.get<any>("/analytics/overview"),
        apiClient.get<any>("/monitors"),
      ]);
      setStats(overviewRes.data);
      setMonitors(monitorsRes.data || []);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-[#151922] rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-[#11131a] border border-[#232838] rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  // Onboarding state for new user
  if (!stats || stats.totalMonitors === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
        <div className="h-16 w-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <Activity className="h-8 w-8" />
        </div>
        <div className="max-w-md space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Welcome to DevPulse!
          </h2>
          <p className="text-sm text-slate-400">
            You don't have any monitors running yet. Add your website, REST API, or backend service to begin tracking uptime and latency with ₹0 budget.
          </p>
        </div>
        <Link href="/monitors/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Your First Monitor
          </Button>
        </Link>
      </div>
    );
  }

  const metricCards = [
    {
      label: "Operational Services",
      value: `${stats.operationalServices} / ${stats.totalMonitors}`,
      sub: `${stats.downServices} currently down`,
      icon: CheckCircle2,
      color: stats.downServices > 0 ? "text-amber-400" : "text-emerald-400",
    },
    {
      label: "Overall Uptime (24h)",
      value: `${stats.overallUptimePercentage}%`,
      sub: `${stats.successfulChecks24h} / ${stats.totalChecks24h} checks passed`,
      icon: Server,
      color: "text-indigo-400",
    },
    {
      label: "Avg Response Time",
      value: `${stats.averageResponseTimeMs} ms`,
      sub: "Measured across active checks",
      icon: Clock,
      color: "text-sky-400",
    },
    {
      label: "Active Incidents",
      value: stats.activeIncidents || 0,
      sub: `${stats.totalIncidents} total incidents recorded`,
      icon: AlertCircle,
      color: stats.activeIncidents > 0 ? "text-red-400" : "text-slate-400",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">System Overview</h1>
          <p className="text-xs text-slate-400">
            Live telemetry and health status across all configured endpoints
          </p>
        </div>
        <Link href="/monitors/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            New Monitor
          </Button>
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {metricCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="rounded-xl border border-[#232838] bg-[#11131a] p-5 space-y-2 shadow-sm"
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{card.label}</span>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">{card.value}</div>
              <p className="text-[11px] text-slate-500">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Response Time Trend Chart */}
      <div className="rounded-xl border border-[#232838] bg-[#11131a] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Response Time Telemetry</h3>
            <p className="text-xs text-slate-400">Real database check latency history (ms)</p>
          </div>
          <span className="text-xs text-indigo-400 font-mono">Last 30 Checks</span>
        </div>

        {stats.responseTimeTrends && stats.responseTimeTrends.length > 0 ? (
          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.responseTimeTrends}>
                <defs>
                  <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(val) => new Date(val).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  stroke="#475569"
                  fontSize={11}
                />
                <YAxis stroke="#475569" fontSize={11} unit="ms" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0c0e15",
                    borderColor: "#232838",
                    borderRadius: "0.5rem",
                    color: "#f8fafc",
                    fontSize: "12px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="responseTimeMs"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#latencyGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center text-xs text-slate-500 border border-dashed border-[#232838] rounded-lg">
            No telemetry data recorded yet. Checks will populate here as the scheduler executes.
          </div>
        )}
      </div>

      {/* Two Columns: Recent Monitors & Recent Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monitors Quick List */}
        <div className="rounded-xl border border-[#232838] bg-[#11131a] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Monitored Endpoints</h3>
            <Link href="/monitors" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
              View All <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {monitors.slice(0, 5).map((m) => (
              <Link
                key={m.id}
                href={`/monitors/${m.id}`}
                className="flex items-center justify-between p-3 rounded-lg border border-[#232838] bg-[#0c0e15] hover:border-slate-700 transition-colors"
              >
                <div className="space-y-0.5 truncate pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-200 truncate">{m.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                      {m.httpMethod}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{m.url}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono text-slate-300">{m.uptimePercentage}%</span>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      m.isPaused
                        ? "bg-amber-500"
                        : m.currentStatus === "UP"
                        ? "bg-emerald-500"
                        : m.currentStatus === "DOWN"
                        ? "bg-red-500"
                        : "bg-slate-500"
                    }`}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Incidents Feed */}
        <div className="rounded-xl border border-[#232838] bg-[#11131a] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Recent Incidents</h3>
            <Link href="/incidents" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
              View All <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {stats.recentIncidents && stats.recentIncidents.length > 0 ? (
            <div className="space-y-2">
              {stats.recentIncidents.map((inc: any) => (
                <div
                  key={inc.id}
                  className="p-3 rounded-lg border border-[#232838] bg-[#0c0e15] space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-200">{inc.title}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        inc.status === "RESOLVED"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}
                    >
                      {inc.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{inc.failureReason}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-40 flex flex-col items-center justify-center text-center space-y-1 text-slate-500 border border-dashed border-[#232838] rounded-lg">
              <ShieldAlert className="h-6 w-6 text-emerald-500/40" />
              <p className="text-xs text-slate-400">All systems operational</p>
              <p className="text-[10px] text-slate-500">No downtime incidents recorded</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
