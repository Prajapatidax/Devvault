/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import { useToast, Button, Input } from "./UI";
import { motion } from "motion/react";
import { Terminal, Lock, Mail, User, ShieldCheck } from "lucide-react";

export const AuthPage: React.FC = () => {
  const { login, register } = useAuth();
  const { toast } = useToast();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !name)) {
      toast("Please fill in all required fields", "error");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
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
    <div className="min-h-screen flex items-center justify-center bg-zinc-100/40 dark:bg-zinc-950/20 relative overflow-hidden px-4 transition-colors duration-300">
      {/* Visual background accents */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-emerald-600/5 blur-[150px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md z-10"
      >
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3.5 bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl mb-4 text-indigo-600 dark:text-indigo-400 shadow-inner backdrop-blur-sm">
            <Terminal className="h-6 w-6" />
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
          {/* Toggle Tabs */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800/80 mb-6">
            <button
              onClick={() => {
                setIsLogin(true);
                setEmail("");
                setPassword("");
                setName("");
              }}
              className={`flex-1 pb-3 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
                isLogin
                  ? "border-indigo-600 dark:border-indigo-500 text-zinc-800 dark:text-zinc-100"
                  : "border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-650 dark:hover:text-zinc-300"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setEmail("");
                setPassword("");
                setName("");
              }}
              className={`flex-1 pb-3 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
                !isLogin
                  ? "border-indigo-600 dark:border-indigo-500 text-zinc-800 dark:text-zinc-100"
                  : "border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-650 dark:hover:text-zinc-300"
              }`}
            >
              Initialize Workspace
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4.5">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="overflow-hidden"
              >
                <Input
                  label="FULL NAME"
                  id="reg-name"
                  type="text"
                  placeholder="Linus Torvalds"
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
              placeholder="linus@git.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="h-4 w-4" />}
              required
            />

            <Input
              label="MASTER DECRYPT KEY"
              id="auth-password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="h-4 w-4" />}
              required
            />

            <Button
              variant="primary"
              className="w-full py-3 font-semibold mt-2.5"
              type="submit"
              isLoading={loading}
            >
              {isLogin ? "Decrypt & Enter Vault" : "Provision Vault & Begin"}
            </Button>
          </form>
        </div>

        {/* Security Footprint */}
        <div className="flex items-center justify-center gap-2 text-center mt-6 text-[11px] text-zinc-550 dark:text-zinc-600 font-mono">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Local database encrypted with AES-256-CBC</span>
        </div>
      </motion.div>
    </div>
  );
};
