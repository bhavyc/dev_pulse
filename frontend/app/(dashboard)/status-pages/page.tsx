"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Globe, Plus, ExternalLink, Copy, Check, Trash2, Server } from "lucide-react";

export default function StatusPagesPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchPages = async () => {
    try {
      const res = await apiClient.get<any[]>("/status-pages");
      setPages(res.data || []);
    } catch (err) {
      console.error("Failed to load status pages:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleCopyLink = (slug: string, id: string) => {
    const fullUrl = `${window.location.origin}/status/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete status page "${name}"?`)) return;
    try {
      await apiClient.delete(`/status-pages/${id}`);
      fetchPages();
    } catch (err) {
      alert("Failed to delete status page");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Public Status Pages</h1>
          <p className="text-xs text-slate-400">
            Publish transparent uptime and incident history for your customers and users
          </p>
        </div>
        <Link href="/status-pages/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Create Status Page
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-[#11131a] border border-[#232838] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : pages.length > 0 ? (
        <div className="space-y-3">
          {pages.map((p) => (
            <div
              key={p.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-xl border border-[#232838] bg-[#11131a] hover:border-slate-700 transition-colors gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-white">{p.name}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Public
                  </span>
                </div>
                {p.description && <p className="text-xs text-slate-400">{p.description}</p>}
                <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                  <span>Slug: <code className="text-indigo-400">/status/{p.slug}</code></span>
                  <span>•</span>
                  <span>{p.monitors?.length || 0} monitors displayed</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyLink(p.slug, p.id)}
                  title="Copy Public URL"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-[#151922] hover:bg-[#1f2433] border border-[#232838] transition-colors"
                >
                  {copiedId === p.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedId === p.id ? "Copied" : "Copy Link"}
                </button>

                <a
                  href={`/status/${p.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-400 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 transition-colors"
                >
                  View Live <ExternalLink className="h-3.5 w-3.5" />
                </a>

                <button
                  onClick={() => handleDelete(p.id, p.name)}
                  className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-[#151922] transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#232838] p-12 text-center space-y-3">
          <Globe className="h-8 w-8 text-slate-500 mx-auto" />
          <h3 className="text-sm font-medium text-slate-200">No status pages yet</h3>
          <p className="text-xs text-slate-500">
            Create a public status page to show your users live system health.
          </p>
        </div>
      )}
    </div>
  );
}
