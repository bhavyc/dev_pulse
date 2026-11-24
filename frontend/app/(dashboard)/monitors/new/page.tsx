"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Trash2, Server } from "lucide-react";

export default function NewMonitorPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("https://");
  const [httpMethod, setHttpMethod] = useState("GET");
  const [checkIntervalSeconds, setCheckIntervalSeconds] = useState(300); // 5 minutes default
  const [timeoutSeconds, setTimeoutSeconds] = useState(10);
  const [expectedStatusCodes, setExpectedStatusCodes] = useState("200, 201, 204");
  const [headers, setHeaders] = useState<{ key: string; value: string }[]>([]);
  const [requestBody, setRequestBody] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addHeader = () => {
    setHeaders([...headers, { key: "", value: "" }]);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const updateHeader = (index: number, field: "key" | "value", value: string) => {
    const updated = [...headers];
    updated[index][field] = value;
    setHeaders(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Parse status codes
      const parsedStatusCodes = expectedStatusCodes
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n));

      // Build headers record
      const headersRecord: Record<string, string> = {};
      headers.forEach((h) => {
        if (h.key.trim()) {
          headersRecord[h.key.trim()] = h.value;
        }
      });

      await apiClient.post("/monitors", {
        name,
        url,
        httpMethod,
        checkIntervalSeconds: Number(checkIntervalSeconds),
        timeoutSeconds: Number(timeoutSeconds),
        expectedStatusCodes: parsedStatusCodes.length > 0 ? parsedStatusCodes : [200],
        requestHeaders: Object.keys(headersRecord).length > 0 ? headersRecord : undefined,
        requestBody: ["POST", "PUT", "PATCH"].includes(httpMethod) && requestBody.trim() ? requestBody : undefined,
      });

      router.push("/monitors");
    } catch (err: any) {
      setError(err.message || "Failed to create monitor");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/monitors" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#151922] transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Create Monitor</h1>
          <p className="text-xs text-slate-400">Configure continuous uptime and latency checks</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-[#232838] bg-[#11131a] p-6 shadow-sm">
        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Monitor Name
          </label>
          <Input
            placeholder="e.g. Production API Gateway"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        {/* Method & URL */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              HTTP Method
            </label>
            <select
              value={httpMethod}
              onChange={(e) => setHttpMethod(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-[#232838] bg-[#11131a] px-3 py-1 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
              <option value="HEAD">HEAD</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Target URL
            </label>
            <Input
              type="url"
              placeholder="https://api.yourdomain.com/health"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Interval & Timeout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Check Interval (Free Tier MVP)
            </label>
            <select
              value={checkIntervalSeconds}
              onChange={(e) => setCheckIntervalSeconds(Number(e.target.value))}
              className="flex h-9 w-full rounded-lg border border-[#232838] bg-[#11131a] px-3 py-1 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <option value={300}>Every 5 minutes (Default)</option>
              <option value={600}>Every 10 minutes</option>
              <option value={900}>Every 15 minutes</option>
              <option value={1800}>Every 30 minutes</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Request Timeout (Seconds, Max 30)
            </label>
            <Input
              type="number"
              min={1}
              max={30}
              value={timeoutSeconds}
              onChange={(e) => setTimeoutSeconds(Number(e.target.value))}
              required
            />
          </div>
        </div>

        {/* Expected Status Codes */}
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Expected HTTP Status Codes (Comma separated)
          </label>
          <Input
            placeholder="200, 201, 204"
            value={expectedStatusCodes}
            onChange={(e) => setExpectedStatusCodes(e.target.value)}
            required
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Any status code outside this list will trigger a failure incident.
          </p>
        </div>

        {/* Custom Request Headers */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-medium text-slate-300">
              Custom Request Headers
            </label>
            <button
              type="button"
              onClick={addHeader}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Add Header
            </button>
          </div>

          {headers.map((h, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                placeholder="Header Name (e.g. Authorization)"
                value={h.key}
                onChange={(e) => updateHeader(i, "key", e.target.value)}
              />
              <Input
                placeholder="Value (e.g. Bearer token)"
                value={h.value}
                onChange={(e) => updateHeader(i, "value", e.target.value)}
              />
              <button
                type="button"
                onClick={() => removeHeader(i)}
                className="p-2 text-slate-500 hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Request Body (for POST/PUT/PATCH) */}
        {["POST", "PUT", "PATCH"].includes(httpMethod) && (
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Request Body (JSON or Plain Text)
            </label>
            <textarea
              rows={4}
              placeholder='{ "action": "healthcheck" }'
              value={requestBody}
              onChange={(e) => setRequestBody(e.target.value)}
              className="w-full rounded-lg border border-[#232838] bg-[#0c0e15] p-3 text-xs font-mono text-slate-100 placeholder:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#232838]">
          <Link href="/monitors">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" isLoading={isLoading}>
            Create Monitor
          </Button>
        </div>
      </form>
    </div>
  );
}
