"use client";

import React, { useEffect, useState, use } from "react";
import { CheckCircle2, AlertTriangle, Activity, Clock, ShieldCheck } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";

export default function PublicStatusPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/status-pages/public/${resolvedParams.slug}`
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Status page not found");
        }
        setData(json.data);
      } catch (err: any) {
        setError(err.message || "Failed to load status page");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPublicData();
  }, [resolvedParams.slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090a0f] flex items-center justify-center text-slate-400">
        <div className="flex items-center space-x-2 animate-pulse">
          <Activity className="h-5 w-5 text-indigo-400" />
          <span className="text-sm font-medium">Loading live service status...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#090a0f] flex flex-col items-center justify-center p-4 text-center space-y-3">
        <h1 className="text-xl font-bold text-white">Status Page Not Found</h1>
        <p className="text-xs text-slate-400">
          This status page does not exist or has been made private.
        </p>
      </div>
    );
  }

  const isAllOperational = data.systemStatus === "ALL_OPERATIONAL";
  const isMajorOutage = data.systemStatus === "MAJOR_OUTAGE";

  return (
    <div className="min-h-screen bg-[#090a0f] text-slate-100 py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Brand & Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#232838] gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{data.name}</h1>
            {data.description && (
              <p className="text-xs text-slate-400 mt-1">{data.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Telemetry</span>
          </div>
        </div>

        {/* Global Operational Banner */}
        <div
          className={`p-5 rounded-2xl border flex items-center gap-4 ${
            isAllOperational
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : isMajorOutage
              ? "bg-red-500/10 border-red-500/20 text-red-400"
              : "bg-amber-500/10 border-amber-500/20 text-amber-400"
          }`}
        >
          {isAllOperational ? (
            <CheckCircle2 className="h-8 w-8 shrink-0" />
          ) : (
            <AlertTriangle className="h-8 w-8 shrink-0" />
          )}
          <div>
            <h2 className="text-base font-bold">
              {isAllOperational
                ? "All Systems Operational"
                : isMajorOutage
                ? "Major Service Outage"
                : "Partial Service Outage"}
            </h2>
            <p className="text-xs opacity-90 mt-0.5">
              {isAllOperational
                ? "All monitored services and backend APIs are operating normally."
                : "Our engineering team has detected downtime and is actively investigating."}
            </p>
          </div>
        </div>

        {/* Services Health List */}
        <div className="rounded-2xl border border-[#232838] bg-[#11131a] p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white">Services & Infrastructure</h3>
          <div className="divide-y divide-[#232838]/60">
            {data.services?.map((svc: any) => (
              <div key={svc.id} className="py-3.5 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-slate-200">{svc.name}</span>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span>90-Day Uptime: {svc.uptimePercentage}%</span>
                    <span>•</span>
                    <span>Checked {formatTimeAgo(svc.lastCheckedAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      svc.status === "UP" ? "bg-emerald-500" : "bg-red-500 animate-pulse"
                    }`}
                  />
                  <span
                    className={`text-xs font-semibold ${
                      svc.status === "UP" ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {svc.status === "UP" ? "Operational" : "Outage"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Incident History Feed */}
        <div className="rounded-2xl border border-[#232838] bg-[#11131a] p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white">Incident & Maintenance History</h3>
          {data.incidents && data.incidents.length > 0 ? (
            <div className="space-y-4">
              {data.incidents.map((inc: any) => (
                <div key={inc.id} className="p-4 rounded-xl border border-[#232838] bg-[#0c0e15] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{inc.title}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        inc.status === "RESOLVED"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {inc.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{inc.failureReason}</p>
                  <p className="text-[10px] text-slate-500">
                    Detected {new Date(inc.startedAt).toLocaleString()}
                    {inc.resolvedAt && ` • Resolved in ${Math.floor(inc.durationSeconds / 60)} minutes`}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-[#232838] rounded-xl">
              No recent incidents reported. 100% historical uptime in the last 90 days.
            </div>
          )}
        </div>

        {/* Zero-Budget DevPulse Footer */}
        <div className="pt-6 text-center text-xs text-slate-500 border-t border-[#232838] flex items-center justify-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-indigo-400" />
          <span>Powered by <strong className="text-slate-300">DevPulse</strong> — Zero-Budget Developer Monitoring SaaS</span>
        </div>
      </div>
    </div>
  );
}
