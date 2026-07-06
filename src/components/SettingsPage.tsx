/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useToast, Button, Input } from "./UI";
import { KeyRound, Download, Upload, ShieldCheck, Moon, Sun, Monitor, ShieldAlert, Github } from "lucide-react";

interface SettingsPageProps {
  theme: "light" | "dark" | "system";
  setTheme: (t: "light" | "dark" | "system") => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ theme, setTheme }) => {
  const { apiFetch, logout, user } = useAuth();
  const { toast } = useToast();

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPass, setUpdatingPass] = useState(false);

  // Import State
  const [importJson, setImportJson] = useState("");
  const [importing, setImporting] = useState(false);

  // GitHub Token State
  const [githubToken, setGithubToken] = useState("");
  const [tokenConfigured, setTokenConfigured] = useState(false);
  const [savingToken, setSavingToken] = useState(false);

  const fetchTokenStatus = async () => {
    try {
      const res = await apiFetch("/api/settings/github-token-status");
      if (res.ok) {
        const data = await res.json();
        setTokenConfigured(data.configured);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTokenStatus();
  }, []);

  const handleSaveGithubToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubToken.trim()) {
      toast("Please enter a valid GitHub token", "error");
      return;
    }

    setSavingToken(true);
    try {
      const res = await apiFetch("/api/settings/github-token", {
        method: "POST",
        body: JSON.stringify({ token: githubToken.trim() }),
      });

      if (res.ok) {
        toast("GitHub Token configured successfully!", "success");
        setGithubToken("");
        setTokenConfigured(true);
      } else {
        const data = await res.json();
        toast(data.error || "Failed to save token", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Failed to configure token", "error");
    } finally {
      setSavingToken(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast("Please fill in all fields", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast("New passwords do not match", "error");
      return;
    }

    setUpdatingPass(true);
    try {
      const res = await apiFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.ok) {
        toast("Master Decrypt Key updated successfully! Please log in again.", "success");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        // Logout user because master key changed
        setTimeout(logout, 1500);
      } else {
        const data = await res.json();
        toast(data.error || "Failed to update key", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Failed to update password", "error");
    } finally {
      setUpdatingPass(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const res = await apiFetch("/api/settings/export");
      if (res.ok) {
        const data = await res.json();
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
          JSON.stringify(data, null, 2)
        )}`;
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", jsonString);
        downloadAnchor.setAttribute("download", `devvault-backup-${Date.now()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        toast("Backup downloaded successfully!", "success");
      } else {
        toast("Export failed", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Export failed", "error");
    }
  };

  const handleImportBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importJson.trim()) {
      toast("Please paste JSON backup data first", "error");
      return;
    }

    // Verify valid JSON format first
    let parsedData = null;
    try {
      parsedData = JSON.parse(importJson);
    } catch (err) {
      toast("Invalid JSON format. Confirm structure matches DevVault scheme.", "error");
      return;
    }

    if (!confirm("Are you sure? This will merge the imported projects, secrets, snippets, notes, and logs into your database.")) return;

    setImporting(true);
    try {
      const res = await apiFetch("/api/settings/import", {
        method: "POST",
        body: JSON.stringify({ importedData: parsedData }),
      });

      if (res.ok) {
        toast("Backup imported successfully! Reloading stats...", "success");
        setImportJson("");
      } else {
        const data = await res.json();
        toast(data.error || "Import failed", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Import failed", "error");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100">Workspace Settings</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Configure security credentials, choose themes, and perform database migrations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 select-none">
        {/* Left Column: Theme & Credentials */}
        <div className="flex flex-col gap-6">
          {/* Theme Switcher card */}
          <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/20 backdrop-blur-sm shadow-sm flex flex-col gap-4">
            <div>
              <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 font-mono tracking-wider uppercase">Visual Theme</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Choose layout coloring preference.</p>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <button
                onClick={() => setTheme("light")}
                className={`p-3 rounded-lg border text-xs font-semibold cursor-pointer transition-all flex flex-col items-center gap-2 ${
                  theme === "light"
                    ? "bg-white dark:bg-zinc-800 border-indigo-500 text-indigo-650 dark:text-indigo-400 shadow-sm"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-550 dark:text-zinc-450 hover:bg-zinc-100 dark:hover:bg-zinc-900/30"
                }`}
              >
                <Sun className="h-4.5 w-4.5" /> Light Mode
              </button>

              <button
                onClick={() => setTheme("dark")}
                className={`p-3 rounded-lg border text-xs font-semibold cursor-pointer transition-all flex flex-col items-center gap-2 ${
                  theme === "dark"
                    ? "bg-white dark:bg-zinc-800 border-indigo-500 text-indigo-650 dark:text-indigo-400 shadow-sm"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-550 dark:text-zinc-450 hover:bg-zinc-100 dark:hover:bg-zinc-900/30"
                }`}
              >
                <Moon className="h-4.5 w-4.5" /> Dark Mode
              </button>

              <button
                onClick={() => setTheme("system")}
                className={`p-3 rounded-lg border text-xs font-semibold cursor-pointer transition-all flex flex-col items-center gap-2 ${
                  theme === "system"
                    ? "bg-white dark:bg-zinc-800 border-indigo-500 text-indigo-650 dark:text-indigo-400 shadow-sm"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-550 dark:text-zinc-450 hover:bg-zinc-100 dark:hover:bg-zinc-900/30"
                }`}
              >
                <Monitor className="h-4.5 w-4.5" /> System
              </button>
            </div>
          </div>

          {/* Change Decrypt Key card */}
          <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/20 backdrop-blur-sm shadow-sm flex flex-col gap-4">
            <div>
              <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 font-mono tracking-wider uppercase">Master Decrypt Key</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Modify key used for auth login and field salting.</p>
            </div>

            <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
              <Input
                label="CURRENT KEY"
                type="password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />

              <Input
                label="NEW MASTER KEY"
                type="password"
                placeholder="•••••••• (Min 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />

              <Input
                label="CONFIRM KEY"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <Button type="submit" variant="primary" isLoading={updatingPass} className="mt-1 py-2 text-xs">
                <KeyRound className="h-4 w-4" /> Re-encrypt Credentials
              </Button>
            </form>
          </div>

          {/* GitHub API Token Configuration */}
          <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/20 backdrop-blur-sm shadow-sm flex flex-col gap-4">
            <div>
              <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 font-mono tracking-wider uppercase flex items-center gap-1.5">
                <Github className="h-4 w-4 text-zinc-400" /> GitHub Token Configuration
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Configure your GitHub Personal Access Token to avoid API rate limits.
              </p>
            </div>

            <form onSubmit={handleSaveGithubToken} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-850 rounded-lg text-[10px] font-mono">
                <ShieldCheck className={`h-4.5 w-4.5 shrink-0 ${tokenConfigured ? "text-emerald-500" : "text-amber-500"}`} />
                <span>
                  {tokenConfigured 
                    ? "Status: ACTIVE (Personal Token configured)" 
                    : "Status: ANONYMOUS (Subject to strict rate limiting)"}
                </span>
              </div>

              <Input
                label="PERSONAL ACCESS TOKEN (PAT)"
                type="password"
                placeholder={tokenConfigured ? "••••••••••••••••••••" : "github_pat_..."}
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                required
              />

              <p className="text-[10px] text-zinc-500 leading-normal">
                Don't have a token? Create one in your GitHub profile under Settings &gt; Developer settings &gt; Personal access tokens.
              </p>

              <Button type="submit" variant="secondary" isLoading={savingToken} className="mt-1 py-2 text-xs">
                Save GitHub Token
              </Button>
            </form>
          </div>
        </div>

        {/* Right Column: Database Backup & Restore */}
        <div className="flex flex-col gap-6">
          <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/20 backdrop-blur-sm shadow-sm flex flex-col gap-4">
            <div>
              <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 font-mono tracking-wider uppercase">Data Migration (JSON)</h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">Download full schema or restore a previous backups.</p>
            </div>

            <div className="flex flex-col gap-4.5">
              <div className="flex flex-col gap-2 p-3 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-850 rounded-lg text-xs">
                <span className="font-bold flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
                  <Download className="h-4 w-4 text-indigo-400" /> Export Database Backup
                </span>
                <p className="text-[11px] text-zinc-450 leading-normal">
                  Download a JSON file containing all projects, encrypted API keys, secrets, notes, and costs registered under your profile.
                </p>
                <Button onClick={handleExportBackup} variant="secondary" size="sm" className="self-start mt-1">
                  Download JSON Backup
                </Button>
              </div>

              <form onSubmit={handleImportBackup} className="flex flex-col gap-2.5 p-3 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-850 rounded-lg text-xs">
                <span className="font-bold flex items-center gap-1.5 text-zinc-800 dark:text-zinc-200">
                  <Upload className="h-4 w-4 text-indigo-400" /> Import Database Backup
                </span>
                <p className="text-[11px] text-zinc-450 leading-normal mb-1">
                  Paste the JSON backup output structure in the input area below to merge files with your database.
                </p>
                
                <textarea
                  placeholder={`{\n  "projects": [...],\n  "secrets": [...]\n}`}
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-lg text-[10px] text-zinc-800 dark:text-zinc-150 placeholder-zinc-550 dark:placeholder-zinc-650 focus:border-indigo-500/50 transition-all outline-none p-2.5 min-h-[100px] font-mono select-text"
                />

                <div className="flex items-center gap-1.5 text-[9px] text-amber-600 font-mono mt-1 leading-relaxed">
                  <ShieldAlert className="h-4.5 w-4.5 text-amber-500 shrink-0" />
                  <span>Merging backup keys may duplicate records if identifiers overlap.</span>
                </div>

                <Button type="submit" variant="accent" size="sm" isLoading={importing} className="self-start mt-1">
                  Restore / Merge Backup
                </Button>
              </form>
            </div>
          </div>

          {/* Feedback Form Card */}
          <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/20 backdrop-blur-sm shadow-sm flex flex-col gap-4">
            <div>
              <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 font-mono tracking-wider uppercase flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-zinc-450" /> Send Feedback
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Share your ideas, suggestions, or report any issues with us.
              </p>
            </div>

            <SettingsFeedbackForm user={user} apiFetch={apiFetch} toast={toast} />
          </div>
        </div>
      </div>
    </div>
  );
};

interface SettingsFeedbackFormProps {
  user: any;
  apiFetch: any;
  toast: any;
}

const SettingsFeedbackForm: React.FC<SettingsFeedbackFormProps> = ({ user, apiFetch, toast }) => {
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast("Please enter your message", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          name: user?.name || "Workspace User",
          email: user?.email || "",
          message: message.trim(),
          rating
        }),
      });

      if (res.ok) {
        toast("Feedback submitted successfully! We definitely work on this.", "success");
        setMessage("");
        setRating(null);
      } else {
        const data = await res.json();
        toast(data.error || "Failed to submit feedback", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Failed to submit feedback", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-zinc-405 dark:text-zinc-500 font-mono tracking-wider uppercase">SATISFACTION RATING</label>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`p-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all flex items-center justify-center h-8 w-8 ${
                rating === star
                  ? "bg-indigo-500/10 border-indigo-500 text-indigo-650 dark:text-indigo-400 font-bold shadow-sm"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-955/40 text-zinc-550 dark:text-zinc-455 hover:bg-zinc-100 dark:hover:bg-zinc-900/30"
              }`}
            >
              {star}
            </button>
          ))}
          <span className="text-[10px] text-zinc-400 dark:text-zinc-555 ml-2 font-mono">
            {rating === 1 && "Need Improvement"}
            {rating === 2 && "Okay"}
            {rating === 3 && "Good"}
            {rating === 4 && "Great"}
            {rating === 5 && "Excellent!"}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-zinc-450 dark:text-zinc-505 font-mono tracking-wider uppercase">MESSAGE</label>
        <textarea
          required
          rows={3}
          placeholder="Describe your ideas, feedback, or any issues you encountered..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full bg-white dark:bg-zinc-955/40 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-850 dark:text-zinc-205 placeholder-zinc-450 dark:placeholder-zinc-650 focus:border-indigo-500/50 transition-all outline-none py-2 px-3 shadow-sm resize-none"
        />
      </div>

      <Button type="submit" variant="secondary" isLoading={submitting} className="mt-1 py-2 text-xs">
        Submit Feedback
      </Button>
    </form>
  );
};
