"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Server,
  Activity,
  ShieldCheck,
  Zap,
  Lock,
  X,
  Layers,
} from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

export default function MonitorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [monitor, setMonitor] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProbing, setIsProbing] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);

  const fetchDetails = async () => {
    try {
      const res = await apiClient.get<any>(`/monitors/${resolvedParams.id}`);
      setMonitor(res.data);
    } catch (err) {
      console.error("Failed to load monitor details:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [resolvedParams.id]);

  const handleTogglePause = async () => {
    if (!monitor) return;
    try {
      const endpoint = monitor.isPaused
        ? `/monitors/${monitor.id}/resume`
        : `/monitors/${monitor.id}/pause`;
      await apiClient.post(endpoint);
      fetchDetails();
    } catch (err) {
      alert("Failed to toggle monitor status");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${monitor.name}?`)) return;
    try {
      await apiClient.delete(`/monitors/${monitor.id}`);
      router.push("/monitors");
    } catch (err) {
      alert("Failed to delete monitor");
    }
  };

  const handleRunDiagnostic = async () => {
    if (!monitor) return;
    setIsProbing(true);
    try {
      const res = await apiClient.post<any>(`/monitors/${monitor.id}/test`);
      setDiagnosticResult(res.data);
      fetchDetails();
    } catch (err: any) {
      alert(err.message || "Diagnostic probe failed");
    } finally {
      setIsProbing(false);
    }
  };

  if (isLoading) {
    return <div className="text-xs text-slate-400 animate-pulse">Loading monitor telemetry...</div>;
  }

  if (!monitor) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-sm text-slate-300">Monitor not found</p>
        <Link href="/monitors">
          <Button variant="outline" size="sm">
            Back to Monitors
          </Button>
        </Link>
      </div>
    );
  }

  // Format checks data for chart
  const latencyData = (monitor.checks || [])
    .slice(0, 30)
    .reverse()
    .map((c: any) => ({
      time: new Date(c.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      latency: c.responseTimeMs || 0,
      status: c.statusCode,
    }));

  const ssl = monitor.sslDetails;
  const isHttps = monitor.url.startsWith("https://");

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/monitors"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#151922] transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">{monitor.name}</h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                {monitor.httpMethod}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                  monitor.isPaused
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : monitor.currentStatus === "UP"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : monitor.currentStatus === "DOWN"
                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                    : "bg-slate-500/10 text-slate-400"
                }`}
              >
                {monitor.isPaused ? "PAUSED" : monitor.currentStatus}
              </span>
              {isHttps && ssl && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 font-mono ${
                    ssl.daysRemaining > 30
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : ssl.daysRemaining > 7
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}
                >
                  <Lock className="h-2.5 w-2.5" />
                  SSL: {ssl.daysRemaining}d left
                </span>
              )}
            </div>
            <a
              href={monitor.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1 mt-0.5"
            >
              {monitor.url} <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="primary"
            size="sm"
            onClick={handleRunDiagnostic}
            isLoading={isProbing}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs"
          >
            <Zap className="h-3.5 w-3.5" />
            Live Diagnostic Probe
          </Button>
          <Button variant="outline" size="sm" onClick={handleTogglePause} className="gap-1.5 text-xs">
            {monitor.isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {monitor.isPaused ? "Resume" : "Pause"}
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete} className="gap-1.5 text-xs">
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* Live Diagnostic Probe Drawer / Card */}
      {diagnosticResult && (
        <div className="rounded-xl border border-indigo-500/30 bg-[#0c0e15] p-5 space-y-4 shadow-lg shadow-indigo-500/5 relative">
          <div className="flex items-center justify-between pb-3 border-b border-[#232838]">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Zap className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-sm font-semibold text-white">Live Diagnostic Probe Result</h3>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                  diagnosticResult.isSuccess
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}
              >
                {diagnosticResult.statusCode || "ERR"} {diagnosticResult.isSuccess ? "PASS" : "FAIL"}
              </span>
            </div>
            <button
              onClick={() => setDiagnosticResult(null)}
              className="text-slate-400 hover:text-slate-200 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-[#11131a] p-3 rounded-lg border border-[#232838]">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">Total Latency</span>
              <p className="text-base font-bold font-mono text-indigo-400 mt-1">
                {diagnosticResult.responseTimeMs} ms
              </p>
            </div>
            <div className="bg-[#11131a] p-3 rounded-lg border border-[#232838]">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">TTFB (First Byte)</span>
              <p className="text-base font-bold font-mono text-white mt-1">
                {diagnosticResult.timingDetails?.ttfb || diagnosticResult.responseTimeMs} ms
              </p>
            </div>
            <div className="bg-[#11131a] p-3 rounded-lg border border-[#232838]">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">TCP / TLS</span>
              <p className="text-base font-bold font-mono text-white mt-1">
                {diagnosticResult.timingDetails?.tcp || 0}ms / {diagnosticResult.timingDetails?.tls || 0}ms
              </p>
            </div>
            <div className="bg-[#11131a] p-3 rounded-lg border border-[#232838]">
              <span className="text-[10px] text-slate-500 uppercase font-semibold">SSL Certificate</span>
              <p className="text-xs font-semibold text-emerald-400 mt-1 truncate">
                {diagnosticResult.sslDetails
                  ? `${diagnosticResult.sslDetails.daysRemaining}d left (${diagnosticResult.sslDetails.issuer})`
                  : "N/A (HTTP)"}
              </p>
            </div>
          </div>

          {/* Response Headers Preview */}
          {diagnosticResult.responseHeaders && (
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-400">Response Headers</span>
              <div className="bg-[#11131a] p-3 rounded-lg border border-[#232838] font-mono text-[11px] text-slate-300 max-h-36 overflow-y-auto space-y-0.5">
                {Object.entries(diagnosticResult.responseHeaders).map(([k, v]) => (
                  <div key={k} className="truncate">
                    <span className="text-indigo-400">{k}:</span> {String(v)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-[#232838] bg-[#11131a] p-4 space-y-1">
          <span className="text-xs text-slate-400">24h Uptime</span>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {monitor.stats?.uptime24h || 100}%
          </div>
          <p className="text-[10px] text-slate-500">
            {monitor.stats?.successfulChecks24h || 0} / {monitor.stats?.totalChecks24h || 0} checks
          </p>
        </div>

        <div className="rounded-xl border border-[#232838] bg-[#11131a] p-4 space-y-1">
          <span className="text-xs text-slate-400">Avg Response Time</span>
          <div className="text-2xl font-bold font-mono text-white">
            {monitor.stats?.avgLatency24h || 0} ms
          </div>
          <p className="text-[10px] text-slate-500">Last 24 hours</p>
        </div>

        <div className="rounded-xl border border-[#232838] bg-[#11131a] p-4 space-y-1">
          <span className="text-xs text-slate-400">Check Interval</span>
          <div className="text-2xl font-bold text-white">
            {Math.floor(monitor.checkIntervalSeconds / 60)}m
          </div>
          <p className="text-[10px] text-slate-500">Timeout: {monitor.timeoutSeconds}s</p>
        </div>

        <div className="rounded-xl border border-[#232838] bg-[#11131a] p-4 space-y-1">
          <span className="text-xs text-slate-400">Expected Codes</span>
          <div className="text-2xl font-bold font-mono text-indigo-400">
            {(monitor.expectedStatusCodes || [200]).join(", ")}
          </div>
          <p className="text-[10px] text-slate-500">Threshold: 2 consecutive failures</p>
        </div>
      </div>

      {/* SSL Certificate Card (if HTTPS) */}
      {isHttps && (
        <div className="rounded-xl border border-[#232838] bg-[#11131a] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">SSL / TLS Certificate Health</h3>
            </div>
            {ssl && (
              <span
                className={`text-xs px-2.5 py-0.5 rounded font-mono font-medium ${
                  ssl.daysRemaining > 30
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : ssl.daysRemaining > 7
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}
              >
                {ssl.daysRemaining} days remaining
              </span>
            )}
          </div>

          {ssl ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-[#0c0e15] p-3 rounded-lg border border-[#232838]">
                <span className="text-[10px] text-slate-500">Issuer / CA</span>
                <p className="font-semibold text-slate-200 mt-0.5">{ssl.issuer || "Unknown"}</p>
              </div>
              <div className="bg-[#0c0e15] p-3 rounded-lg border border-[#232838]">
                <span className="text-[10px] text-slate-500">Subject (CN)</span>
                <p className="font-semibold text-slate-200 mt-0.5 truncate">{ssl.subject || "Unknown"}</p>
              </div>
              <div className="bg-[#0c0e15] p-3 rounded-lg border border-[#232838]">
                <span className="text-[10px] text-slate-500">Expires On</span>
                <p className="font-semibold text-slate-200 mt-0.5">
                  {ssl.validTo ? new Date(ssl.validTo).toLocaleDateString() : "Unknown"}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Certificate telemetry will be gathered on the next scheduled check or live diagnostic probe.
            </p>
          )}
        </div>
      )}

      {/* Latency History Chart */}
      <div className="rounded-xl border border-[#232838] bg-[#11131a] p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Latency History (Last 30 Checks)</h3>
        {latencyData.length > 0 ? (
          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={latencyData}>
                <defs>
                  <linearGradient id="monLatencyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#475569" fontSize={11} />
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
                  dataKey="latency"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#monLatencyGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-xs text-slate-500 border border-dashed border-[#232838] rounded-lg">
            No check records yet. Checks run on scheduled intervals.
          </div>
        )}
      </div>

      {/* Checks Table */}
      <div className="rounded-xl border border-[#232838] bg-[#11131a] p-5 space-y-4">
        <h3 className="text-sm font-semibold text-white">Recent Check Telemetry</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#232838] text-slate-400">
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">HTTP Code</th>
                <th className="pb-3 font-medium">Response Time</th>
                <th className="pb-3 font-medium">Checked At</th>
                <th className="pb-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232838]/60 text-slate-300">
              {(monitor.checks || []).map((check: any) => (
                <tr key={check.id} className="hover:bg-[#151922]/50">
                  <td className="py-2.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium ${
                        check.isSuccess
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {check.isSuccess ? "PASS" : "FAIL"}
                    </span>
                  </td>
                  <td className="py-2.5 font-mono">{check.statusCode || "ERR"}</td>
                  <td className="py-2.5 font-mono">{check.responseTimeMs ? `${check.responseTimeMs} ms` : "—"}</td>
                  <td className="py-2.5 text-slate-400">{formatTimeAgo(check.checkedAt)}</td>
                  <td className="py-2.5 text-slate-500 max-w-xs truncate">
                    {check.errorMessage || "Probe successful"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
