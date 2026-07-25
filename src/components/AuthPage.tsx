/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import { useToast, Button, Input } from "./UI";
import { motion } from "motion/react";
import { Terminal, Lock, Mail, User, ShieldCheck, ArrowLeft, Clock, CheckCircle2 } from "lucide-react";
import { ArtificialLogo } from "../App";

interface AuthPageProps {
  onBackToLanding?: () => void;
  onNavigateToLegal?: (tab: "terms" | "privacy") => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onBackToLanding, onNavigateToLegal }) => {
  const { login, register, apiFetch } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "forgot") {
      if (!email) {
        toast("Please enter your email address.", "error");
        return;
      }

      setLoading(true);
      try {
        const res = await apiFetch("/api/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email })
        });

        const data = await res.json();
        if (!res.ok) {
          toast(data.error || "Failed to send reset link", "error");
        } else {
          setResetSent(true);
          toast(data.message || "Password reset email sent! Valid for 10 minutes.", "success");
        }
      } catch (err: any) {
        toast(err.message || "Failed to send reset link", "error");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!email || !password || (mode === "register" && !name)) {
      toast("Please fill in all required fields", "error");
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
        toast("Welcome back to DevVault!", "success");
      } else {
        await register(email, password, name);
        toast("Workspace successfully created!", "success");
      }
    } catch (err: any) {
      toast(err.message || "Authentication failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100/30 dark:bg-zinc-950/20 relative overflow-hidden px-4 transition-colors duration-300">
      {/* Visual background accents */}
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
            DevVault
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-mono mt-1 select-none">
            One place for everything a developer needs.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white/80 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800/60 rounded-xl p-6 shadow-2xl backdrop-blur-md transition-colors duration-300">
          
          {mode !== "forgot" ? (
            /* Sign In / Initialize Tabs */
            <div className="flex border-b border-zinc-200 dark:border-zinc-800/80 mb-6">
              <button
                onClick={() => {
                  setMode("login");
                  setEmail("");
                  setPassword("");
                  setName("");
                }}
                className={`flex-1 pb-3 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
                  mode === "login"
                    ? "border-indigo-600 dark:border-indigo-500 text-zinc-800 dark:text-zinc-100"
                    : "border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-650 dark:hover:text-zinc-300"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setMode("register");
                  setEmail("");
                  setPassword("");
                  setName("");
                }}
                className={`flex-1 pb-3 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
                  mode === "register"
                    ? "border-indigo-600 dark:border-indigo-500 text-zinc-800 dark:text-zinc-100"
                    : "border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-650 dark:hover:text-zinc-300"
                }`}
              >
                Initialize Workspace
              </button>
            </div>
          ) : (
            /* Forgot Password Mode Header */
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-4 mb-6">
              <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Reset Master Key Password
              </h3>
              <button
                onClick={() => {
                  setMode("login");
                  setResetSent(false);
                }}
                className="text-xs text-indigo-650 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="h-3 w-3" /> Back to Sign In
              </button>
            </div>
          )}

          {mode === "forgot" && resetSent ? (
            <div className="text-center py-4">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h4 className="font-bold text-sm text-zinc-900 dark:text-white mb-2">Check Your Inbox</h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4">
                If <strong className="text-zinc-800 dark:text-zinc-200">{email}</strong> matches a registered account, a security reset link valid for <strong>10 minutes</strong> has been sent.
              </p>
              <Button
                variant="secondary"
                className="w-full py-2.5 text-xs font-semibold"
                onClick={() => setResetSent(false)}
              >
                Send Another Link
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4.5">
              {mode === "register" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="overflow-hidden"
                >
                  <Input
                    label="FULL NAME"
                    id="reg-name"
                    type="text"
                    placeholder="test"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    icon={<User className="h-4 w-4" />}
                    required
                  />
                </motion.div>
              )}

              <Input
                label="EMAIL ADDRESS"
                id="auth-email"
                type="email"
                placeholder="test@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="h-4 w-4" />}
                required
              />

              {mode !== "forgot" && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="auth-password" className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 font-mono">
                      MASTER DECRYPT KEY
                    </label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode("forgot");
                          setResetSent(false);
                        }}
                        className="text-[11px] font-semibold text-brand-500 hover:text-brand-400 transition-colors cursor-pointer outline-none"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input
                    id="auth-password"
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    icon={<Lock className="h-4 w-4" />}
                    required
                  />
                </div>
              )}

              {mode === "forgot" && (
                <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/10 text-[11px] text-amber-600 dark:text-amber-400 leading-normal flex items-start gap-2">
                  <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>A single-use password reset link valid for <strong>10 minutes</strong> will be sent to your email address.</span>
                </div>
              )}

              <Button
                variant="primary"
                className="w-full py-3 font-semibold mt-2.5 cursor-pointer"
                type="submit"
                isLoading={loading}
              >
                {mode === "login" 
                  ? "Decrypt & Enter Vault" 
                  : mode === "register" 
                  ? "Provision Vault & Begin" 
                  : "Send 10-Min Reset Link"}
              </Button>
            </form>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex flex-col items-center gap-3 mt-6 text-xs text-zinc-500 dark:text-zinc-400 select-none">
          {onBackToLanding && (
            <button
              onClick={onBackToLanding}
              className="text-xs text-indigo-650 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 font-semibold cursor-pointer outline-none bg-transparent border-0"
            >
              ← Back to Landing Page
            </button>
          )}

          {onNavigateToLegal && (
            <div className="flex items-center gap-3 text-[11px]">
              <button
                onClick={() => onNavigateToLegal("terms")}
                className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer bg-transparent border-0"
              >
                Terms & Conditions
              </button>
              <span>•</span>
              <button
                onClick={() => onNavigateToLegal("privacy")}
                className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer bg-transparent border-0"
              >
                Privacy Policy
              </button>
            </div>
          )}
        </div>

        {/* Security Footprint */}
        <div className="flex items-center justify-center gap-2 text-center mt-4 text-[11px] text-zinc-550 dark:text-zinc-600 font-mono">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Local database encrypted with AES-256-CBC</span>
        </div>
      </motion.div>
    </div>
  );
};
