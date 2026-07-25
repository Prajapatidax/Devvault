/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useToast, Button, Input } from "./UI";
import { motion } from "motion/react";
import { Lock, ShieldAlert, CheckCircle2, ArrowLeft, Clock } from "lucide-react";
import { ArtificialLogo } from "../App";

interface ResetPasswordPageProps {
  token: string;
  email?: string;
  onComplete: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  token,
  email,
  onComplete
}) => {
  const { apiFetch } = useAuth();
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  // Client-side expiry estimate based on token payload exp if readable
  useEffect(() => {
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payloadStr = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
        const payload = JSON.parse(payloadStr);
        if (payload.exp && Date.now() / 1000 > payload.exp) {
          setIsExpired(true);
        }
      }
    } catch (e) {
      // Ignore parse error, backend will validate HMAC and exp strictly
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast("Please enter your new password in both fields.", "error");
      return;
    }

    if (newPassword.length < 6) {
      toast("Password must be at least 6 characters long.", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast("Passwords do not match.", "error");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token,
          newPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error && data.error.includes("expired")) {
          setIsExpired(true);
        }
        toast(data.error || "Failed to reset password", "error");
      } else {
        setSuccess(true);
        toast(data.message || "Password updated successfully!", "success");
      }
    } catch (err: any) {
      toast(err.message || "Failed to reset password. The link may have expired.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100/30 dark:bg-zinc-950/20 relative overflow-hidden px-4 transition-colors duration-300">
      {/* Background radial glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-brand-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-amber-500/5 blur-[150px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-2 bg-transparent mb-2 text-brand-500">
            <ArtificialLogo className="h-10 w-16" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 tracking-tight font-sans">
            DevVault Security
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono mt-1 select-none">
            Reset Master Decryption Password Key
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/80 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800/60 rounded-xl p-6 shadow-2xl backdrop-blur-md transition-colors duration-300">
          
          {/* Expiration warning badge */}
          <div className="mb-6 p-3 rounded-lg border border-amber-500/20 bg-amber-500/10 flex items-center gap-2.5 text-xs text-amber-600 dark:text-amber-400">
            <Clock className="h-4 w-4 shrink-0" />
            <span>This security link is single-use and expires after <strong>10 minutes</strong>.</span>
          </div>

          {success ? (
            <div className="text-center py-4">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-2">Password Reset Complete!</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
                Your master decryption key password has been updated successfully. You can now sign in to your workspace.
              </p>
              <Button variant="primary" className="w-full py-2.5 text-xs font-semibold" onClick={onComplete}>
                Sign In with New Password
              </Button>
            </div>
          ) : isExpired ? (
            <div className="text-center py-4">
              <div className="h-12 w-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-2">Reset Link Expired</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-6">
                Security reset links automatically expire after 10 minutes. Please request a new password reset link from the login page.
              </p>
              <Button variant="secondary" className="w-full py-2.5 text-xs font-semibold" onClick={onComplete}>
                Return to Sign In
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {email && (
                <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  Account: <span className="text-zinc-800 dark:text-zinc-200 font-bold">{email}</span>
                </div>
              )}

              <Input
                label="NEW MASTER PASSWORD"
                id="reset-new-pass"
                type="password"
                placeholder="••••••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                icon={<Lock className="h-4 w-4" />}
                required
              />

              <Input
                label="CONFIRM NEW PASSWORD"
                id="reset-confirm-pass"
                type="password"
                placeholder="••••••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                icon={<Lock className="h-4 w-4" />}
                required
              />

              <Button
                variant="primary"
                className="w-full py-3 font-semibold mt-2 cursor-pointer"
                type="submit"
                isLoading={loading}
              >
                Update Password Key
              </Button>
            </form>
          )}
        </div>

        <div className="text-center mt-4">
          <button
            onClick={onComplete}
            className="text-xs text-indigo-650 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-semibold cursor-pointer outline-none bg-transparent border-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
          </button>
        </div>
      </motion.div>
    </div>
  );
};
