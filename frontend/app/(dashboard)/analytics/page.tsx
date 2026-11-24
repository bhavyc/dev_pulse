"use client";

import React, { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { BarChart3, Activity, Clock, ShieldCheck, CheckCircle2, AlertOctagon } from "lucide-react";

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<any>(null);
  const [uptimeList, setUptimeList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [overviewRes, uptimeRes] = await Promise.all([
          apiClient.get<any>("/analytics/overview"),
          apiClient.get<any[]>("/analytics/uptime"),
        ]);
        setOverview(overviewRes.data);
        setUptimeList(uptimeRes.data || []);
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  if (isLoading) {
    return <div className="text-xs text-slate-400 animate-pulse">Computing telemetry analytics from database...</div>;
  }

  const checkDistribution = [
    { name: "Successful Checks", value: overview?.successfulChecks24h || 0, color: "#10b981" },
    { name: "Failed Checks", value: overview?.failedChecks24h || 0, color: "#ef4444" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Telemetry Analytics</h1>
        <p className="text-xs text-slate-400">
          Uptime ratios, response time percentiles, and check distribution calculated from real database records
        </p>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#232838] bg-[#11131a] p-4 space-y-1">
          <span className="text-xs text-slate-400">Overall Availability</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {overview?.overallUptimePercentage || 100}%
          </div>
          <p className="text-[10px] text-slate-500">Across all team endpoints</p>
        </div>

        <div className="rounded-xl border border-[#232838] bg-[#11131a] p-4 space-y-1">
          <span className="text-xs text-slate-400">Avg Latency (24h)</span>
          <div className="text-2xl font-bold font-mono text-white">
            {overview?.averageResponseTimeMs || 0} ms
          </div>
          <p className="text-[10px] text-slate-500">Mean probe duration</p>
        </div>

        <div className="rounded-xl border border-[#232838] bg-[#11131a] p-4 space-y-1">
          <span className="text-xs text-slate-400">Total Probes (24h)</span>
          <div className="text-2xl font-bold font-mono text-indigo-400">
            {overview?.totalChecks24h || 0}
          </div>
          <p className="text-[10px] text-slate-500">{overview?.successfulChecks24h || 0} passed</p>
        </div>

        <div className="rounded-xl border border-[#232838] bg-[#11131a] p-4 space-y-1">
          <span className="text-xs text-slate-400">Total Incidents</span>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {overview?.totalIncidents || 0}
          </div>
          <p className="text-[10px] text-slate-500">{overview?.activeIncidents || 0} active</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service Availability 24h vs 7d vs 30d */}
        <div className="lg:col-span-2 rounded-xl border border-[#232838] bg-[#11131a] p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Uptime by Service (24h, 7d, 30d)</h3>
          {uptimeList.length > 0 ? (
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={uptimeList} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#475569" fontSize={11} />
                  <YAxis domain={[90, 100]} stroke="#475569" fontSize={11} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0c0e15",
                      borderColor: "#232838",
                      borderRadius: "0.5rem",
                      color: "#f8fafc",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="uptime24h" name="24h" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="uptime7d" name="7d" fill="#818cf8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="uptime30d" name="30d" fill="#a5b4fc" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-xs text-slate-500 border border-dashed border-[#232838] rounded-lg">
              No services configured yet.
            </div>
          )}
        </div>

        {/* 24h Checks Success Ratio */}
        <div className="rounded-xl border border-[#232838] bg-[#11131a] p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Check Reliability (24h)</h3>
          {overview?.totalChecks24h > 0 ? (
            <div className="h-64 w-full flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height="70%">
                <PieChart>
                  <Pie
                    data={checkDistribution}
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {checkDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0c0e15",
                      borderColor: "#232838",
                      borderRadius: "0.5rem",
                      color: "#f8fafc",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  Pass: {overview.successfulChecks24h}
                </span>
                <span className="flex items-center gap-1.5 text-red-400">
                  <span className="h-2 w-2 rounded-full bg-red-500"></span>
                  Fail: {overview.failedChecks24h}
                </span>
              </div>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-xs text-slate-500 border border-dashed border-[#232838] rounded-lg">
              No checks recorded in last 24h.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
