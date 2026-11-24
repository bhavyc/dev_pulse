"use client";

import React, { useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Activity, ArrowLeft, MailCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await apiClient.post<any>("/auth/forgot-password", { email });
      setSubmitted(true);
      if (res.data?.resetToken) {
        setResetToken(res.data.resetToken);
      }
    } catch (err) {
      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#090a0f] p-4 text-slate-100">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-[#232838] bg-[#11131a]/80 p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400">
            <Activity className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Reset Password
          </h1>
          <p className="text-sm text-slate-400">
            Enter your email to receive recovery instructions
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center">
              <MailCheck className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-emerald-300">
                Reset Link Prepared
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                If an account exists for {email}, a recovery link has been generated.
              </p>
              {resetToken && (
                <div className="mt-3 p-2 bg-slate-900 rounded border border-slate-700 text-left">
                  <p className="text-[10px] text-slate-400">Local Dev Direct Link:</p>
                  <Link
                    href={`/reset-password?token=${resetToken}`}
                    className="text-xs text-indigo-400 underline break-all"
                  >
                    Click here to reset your password
                  </Link>
                </div>
              )}
            </div>

            <Link href="/login">
              <Button variant="outline" className="w-full gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="developer@acme.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Send Reset Instructions
            </Button>

            <Link href="/login" className="block text-center">
              <span className="text-xs text-slate-400 hover:text-slate-200">
                Cancel and return to login
              </span>
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
