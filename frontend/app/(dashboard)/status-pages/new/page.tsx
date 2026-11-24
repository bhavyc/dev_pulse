"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check, Server } from "lucide-react";

export default function NewStatusPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [monitors, setMonitors] = useState<any[]>([]);
  const [selectedMonitorIds, setSelectedMonitorIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMonitors = async () => {
      try {
        const res = await apiClient.get<any[]>("/monitors");
        setMonitors(res.data || []);
        // Select all by default
        setSelectedMonitorIds((res.data || []).map((m) => m.id));
      } catch (err) {
        console.error("Failed to load monitors:", err);
      }
    };
    fetchMonitors();
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]/g, "-")) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")
          .replace(/-+/g, "-")
          .slice(0, 30)
      );
    }
  };

  const toggleMonitor = (id: string) => {
    if (selectedMonitorIds.includes(id)) {
      setSelectedMonitorIds(selectedMonitorIds.filter((mId) => mId !== id));
    } else {
      setSelectedMonitorIds([...selectedMonitorIds, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMonitorIds.length === 0) {
      setError("Please select at least one monitor to display on this status page.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await apiClient.post("/status-pages", {
        name,
        slug,
        description: description || undefined,
        monitorIds: selectedMonitorIds,
        isPublic: true,
      });

      router.push("/status-pages");
    } catch (err: any) {
      setError(err.message || "Failed to create status page");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/status-pages" className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-[#151922] transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Create Public Status Page</h1>
          <p className="text-xs text-slate-400">Customize how your system health appears to visitors</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-[#232838] bg-[#11131a] p-6 shadow-sm">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Status Page Title
          </label>
          <Input
            placeholder="e.g. Acme Cloud Status"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Public URL Slug (letters, numbers, hyphens)
          </label>
          <div className="flex items-center">
            <span className="flex h-9 items-center rounded-l-lg border border-r-0 border-[#232838] bg-[#0c0e15] px-3 text-xs text-slate-500">
              devpulse.io/status/
            </span>
            <input
              type="text"
              placeholder="acme-cloud"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              required
              className="flex h-9 w-full rounded-r-lg border border-[#232838] bg-[#11131a] px-3 text-xs text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Description (Optional)
          </label>
          <Input
            placeholder="Real-time uptime and incident telemetry for our platform"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Monitors Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-300">
            Select Services to Display on Status Page
          </label>
          <div className="space-y-2 max-h-56 overflow-y-auto rounded-lg border border-[#232838] p-3 bg-[#0c0e15]">
            {monitors.map((m) => {
              const isChecked = selectedMonitorIds.includes(m.id);
              return (
                <div
                  key={m.id}
                  onClick={() => toggleMonitor(m.id)}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                    isChecked ? "bg-indigo-600/10 border border-indigo-500/20" : "hover:bg-[#151922]"
                  }`}
                >
                  <div className="truncate">
                    <p className="text-xs font-medium text-slate-200">{m.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{m.url}</p>
                  </div>
                  <div className={`h-4 w-4 rounded border flex items-center justify-center ${
                    isChecked ? "bg-indigo-600 border-indigo-500 text-white" : "border-slate-600"
                  }`}>
                    {isChecked && <Check className="h-3 w-3" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#232838]">
          <Link href="/status-pages">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" isLoading={isLoading}>Publish Status Page</Button>
        </div>
      </form>
    </div>
  );
}
