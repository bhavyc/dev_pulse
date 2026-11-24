"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Clock, ShieldCheck, ArrowRight } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  const fetchIncidents = async () => {
    try {
      const res = await apiClient.get<any[]>("/incidents");
      setIncidents(res.data || []);
    } catch (err) {
      console.error("Failed to load incidents:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const filtered = incidents.filter((inc) => {
    if (filter === "ALL") return true;
    if (filter === "ACTIVE") return inc.status !== "RESOLVED";
    if (filter === "RESOLVED") return inc.status === "RESOLVED";
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Incidents & Outages</h1>
          <p className="text-xs text-slate-400">
            Real-time downtime detection and incident lifecycle logs
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {["ALL", "ACTIVE", "RESOLVED"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filter === f
                  ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20"
                  : "text-slate-400 hover:bg-[#151922] hover:text-slate-200 border border-transparent"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-[#11131a] border border-[#232838] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((inc) => {
            const isResolved = inc.status === "RESOLVED";
            return (
              <Link
                key={inc.id}
                href={`/incidents/${inc.id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-[#232838] bg-[#11131a] hover:border-slate-700 transition-colors gap-4"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`mt-1 h-3 w-3 rounded-full shrink-0 ${
                      isResolved ? "bg-emerald-500" : "bg-red-500 animate-pulse"
                    }`}
                  />
                  <div className="space-y-1 truncate">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white truncate">{inc.title}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                          isResolved
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {inc.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">{inc.failureReason}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span>Service: {inc.monitor?.name}</span>
                      <span>•</span>
                      <span>Started {formatTimeAgo(inc.startedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#232838]">
                  <div className="text-right">
                    <span className="text-xs font-mono text-slate-300">
                      {inc.durationSeconds
                        ? `${Math.floor(inc.durationSeconds / 60)}m ${inc.durationSeconds % 60}s`
                        : "Ongoing"}
                    </span>
                    <p className="text-[10px] text-slate-500">Duration</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-500" />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#232838] p-12 text-center space-y-3">
          <ShieldCheck className="h-8 w-8 text-emerald-400 mx-auto" />
          <h3 className="text-sm font-medium text-slate-200">No Incidents Recorded</h3>
          <p className="text-xs text-slate-500">
            All services are operating smoothly with 0 active outages.
          </p>
        </div>
      )}
    </div>
  );
}
