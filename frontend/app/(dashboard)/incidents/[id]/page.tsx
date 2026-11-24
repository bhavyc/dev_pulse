"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, AlertTriangle, CheckCircle2, Send } from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";

export default function IncidentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const [incident, setIncident] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updateMessage, setUpdateMessage] = useState("");
  const [updateStatus, setUpdateStatus] = useState("INVESTIGATING");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDetails = async () => {
    try {
      const res = await apiClient.get<any>(`/incidents/${resolvedParams.id}`);
      setIncident(res.data);
      if (res.data) {
        setUpdateStatus(res.data.status);
      }
    } catch (err) {
      console.error("Failed to load incident details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [resolvedParams.id]);

  const handlePostUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateMessage.trim()) return;
    setIsSubmitting(true);

    try {
      await apiClient.post(`/incidents/${resolvedParams.id}/updates`, {
        status: updateStatus,
        message: updateMessage,
      });
      setUpdateMessage("");
      fetchDetails();
    } catch (err) {
      alert("Failed to post incident update");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="text-xs text-slate-400 animate-pulse">Loading incident timeline...</div>;
  }

  if (!incident) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-sm text-slate-300">Incident not found</p>
        <Link href="/incidents">
          <Button variant="outline" size="sm">Back to Incidents</Button>
        </Link>
      </div>
    );
  }

  const isResolved = incident.status === "RESOLVED";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/incidents" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#151922] transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">{incident.title}</h1>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                isResolved
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}
            >
              {incident.status}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Affected service: {incident.monitor?.name} ({incident.monitor?.url})
          </p>
        </div>
      </div>

      {/* Incident Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-[#232838] bg-[#11131a] p-4 space-y-1">
          <span className="text-xs text-slate-400">Started</span>
          <div className="text-sm font-semibold text-white">
            {new Date(incident.startedAt).toLocaleString()}
          </div>
          <p className="text-[10px] text-slate-500">{formatTimeAgo(incident.startedAt)}</p>
        </div>

        <div className="rounded-xl border border-[#232838] bg-[#11131a] p-4 space-y-1">
          <span className="text-xs text-slate-400">Resolved</span>
          <div className="text-sm font-semibold text-white">
            {incident.resolvedAt ? new Date(incident.resolvedAt).toLocaleString() : "Ongoing"}
          </div>
          <p className="text-[10px] text-slate-500">
            {incident.resolvedAt ? formatTimeAgo(incident.resolvedAt) : "Active incident"}
          </p>
        </div>

        <div className="rounded-xl border border-[#232838] bg-[#11131a] p-4 space-y-1">
          <span className="text-xs text-slate-400">Total Duration</span>
          <div className="text-sm font-semibold font-mono text-indigo-400">
            {incident.durationSeconds
              ? `${Math.floor(incident.durationSeconds / 60)}m ${incident.durationSeconds % 60}s`
              : "In progress"}
          </div>
          <p className="text-[10px] text-slate-500">From detection to recovery</p>
        </div>
      </div>

      {/* Post Manual Update Form */}
      <form onSubmit={handlePostUpdate} className="rounded-xl border border-[#232838] bg-[#11131a] p-5 space-y-4 shadow-sm">
        <h3 className="text-sm font-semibold text-white">Post Investigation Update</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <textarea
              rows={3}
              placeholder="e.g. Root cause identified: database connection limit exhausted. Scaling pool..."
              value={updateMessage}
              onChange={(e) => setUpdateMessage(e.target.value)}
              className="w-full rounded-lg border border-[#232838] bg-[#0c0e15] p-3 text-xs text-slate-100 placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              required
            />
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Update Status</label>
              <select
                value={updateStatus}
                onChange={(e) => setUpdateStatus(e.target.value)}
                className="w-full rounded-lg border border-[#232838] bg-[#0c0e15] px-2.5 py-1.5 text-xs text-slate-200"
              >
                <option value="INVESTIGATING">INVESTIGATING</option>
                <option value="IDENTIFIED">IDENTIFIED</option>
                <option value="MONITORING">MONITORING</option>
                <option value="RESOLVED">RESOLVED</option>
              </select>
            </div>
            <Button type="submit" size="sm" className="w-full gap-1.5" isLoading={isSubmitting}>
              <Send className="h-3.5 w-3.5" /> Post Update
            </Button>
          </div>
        </div>
      </form>

      {/* Timeline */}
      <div className="rounded-xl border border-[#232838] bg-[#11131a] p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Incident Timeline</h3>
        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#232838]">
          {(incident.updates || []).map((update: any) => (
            <div key={update.id} className="relative space-y-1">
              <div
                className={`absolute -left-6 top-1 h-2.5 w-2.5 rounded-full border-2 border-[#11131a] ${
                  update.status === "RESOLVED"
                    ? "bg-emerald-500"
                    : update.status === "MONITORING"
                    ? "bg-sky-500"
                    : "bg-indigo-500"
                }`}
              />
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-200">{update.status}</span>
                <span className="text-[10px] text-slate-500">
                  {new Date(update.createdAt).toLocaleTimeString()} ({formatTimeAgo(update.createdAt)})
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed bg-[#0c0e15] p-3 rounded-lg border border-[#232838]">
                {update.message}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
