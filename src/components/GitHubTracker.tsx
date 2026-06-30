/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useToast, Button, Input, Modal, Badge } from "./UI";
import { Plus, Github, GitBranch, Star, AlertCircle, GitCommit, GitPullRequest, Trash2, ExternalLink, RefreshCw } from "lucide-react";
import { RepositoryTracker } from "../types";

export const GitHubTracker: React.FC = () => {
  const { apiFetch } = useAuth();
  const { toast } = useToast();

  const [repos, setRepos] = useState<RepositoryTracker[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [branch, setBranch] = useState("main");

  const fetchRepos = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/repositories");
      if (res.ok) {
        const data = await res.json();
        setRepos(data);
      }
    } catch (err) {
      console.error(err);
      toast("Failed to load repositories", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  const handleOpenModal = () => {
    setName("");
    setUrl("");
    setBranch("main");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) {
      toast("Name and URL are required", "error");
      return;
    }

    try {
      const res = await apiFetch("/api/repositories", {
        method: "POST",
        body: JSON.stringify({ name, url, branch }),
      });

      if (res.ok) {
        toast("Repository tracked successfully!", "success");
        setIsModalOpen(false);
        fetchRepos();
      } else {
        const errData = await res.json();
        toast(errData.error || "Failed to track repository", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Failed to track repository", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Stop tracking this repository?")) return;

    try {
      const res = await apiFetch(`/api/repositories/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast("Stopped tracking repository", "success");
        fetchRepos();
      } else {
        toast("Failed to delete tracking", "error");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSyncAll = async () => {
    setLoading(true);
    toast("Syncing all GitHub repositories...", "info");
    try {
      const res = await apiFetch("/api/repositories/sync-all", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setRepos(data);
        toast("All repositories synced successfully!", "success");
      } else {
        toast("Failed to sync some repositories", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Sync failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncRepo = async (id: string) => {
    toast("Syncing repository metrics...", "info");
    try {
      const res = await apiFetch(`/api/repositories/${id}/sync`, { method: "POST" });
      if (res.ok) {
        const updatedRepo = await res.json();
        setRepos(prev => prev.map(r => r.id === id ? updatedRepo : r));
        toast("Repository synced successfully!", "success");
      } else {
        const errData = await res.json();
        toast(errData.error || "Failed to sync repository", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Sync failed", "error");
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100">GitHub Repository Tracker</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Track metrics, commits, issues, pull requests, and releases on git nodes.
          </p>
        </div>
        <div className="flex gap-2 self-start">
          <Button variant="secondary" size="sm" onClick={handleSyncAll} disabled={loading || repos.length === 0}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Sync All
          </Button>
          <Button variant="primary" size="sm" onClick={handleOpenModal}>
            <Plus className="h-4 w-4" /> Track Repo
          </Button>
        </div>
      </div>

      {loading && repos.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-xs text-zinc-500 font-mono gap-2">
          <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>POLLING GITHUB API ENDPOINTS...</span>
        </div>
      ) : repos.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-white/20 dark:bg-zinc-900/5">
          <Github className="h-8 w-8 text-zinc-300 dark:text-zinc-750 mb-3" />
          <span className="text-zinc-400 dark:text-zinc-500 text-xs font-mono">NO REPOSITORIES ENROLLED</span>
          <p className="text-[11px] text-zinc-450 mt-1 max-w-sm">
            Watch repo check-ins, stars, and pull requests directly in your dashboard workspace.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {repos.map((r) => (
            <div
              key={r.id}
              className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/20 backdrop-blur-sm shadow-sm flex flex-col gap-4 relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 shadow-sm">
                    <Github className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-800 dark:text-white flex items-center gap-1.5">
                      {r.name}
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-zinc-650 dark:hover:text-indigo-400">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </h3>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-zinc-455 font-mono">
                      <GitBranch className="h-3 w-3 text-indigo-400" />
                      <span>{r.branch}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => handleSyncRepo(r.id)} title="Sync Stats" className="p-1.5">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(r.id)} title="Delete Tracker" className="p-1.5">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* GitHub Metrics Bento Grid */}
              <div className="grid grid-cols-4 gap-2 text-center">
                {/* Stars */}
                <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850">
                  <Star className="h-3.5 w-3.5 mx-auto text-amber-500 mb-1" />
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono block">STARS</span>
                  <span className="text-xs font-bold font-mono text-zinc-750 dark:text-zinc-250">{r.stars}</span>
                </div>

                {/* Commits */}
                <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850">
                  <GitCommit className="h-3.5 w-3.5 mx-auto text-indigo-455 mb-1" />
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono block">COMMITS</span>
                  <span className="text-xs font-bold font-mono text-zinc-755 dark:text-zinc-250">{r.commits}</span>
                </div>

                {/* Open Issues */}
                <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850">
                  <AlertCircle className="h-3.5 w-3.5 mx-auto text-red-500 mb-1" />
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono block">ISSUES</span>
                  <span className="text-xs font-bold font-mono text-zinc-755 dark:text-zinc-250">{r.issues}</span>
                </div>

                {/* Pull requests */}
                <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850">
                  <GitPullRequest className="h-3.5 w-3.5 mx-auto text-emerald-500 mb-1" />
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono block">PRS</span>
                  <span className="text-xs font-bold font-mono text-zinc-755 dark:text-zinc-250">{r.openPr}</span>
                </div>
              </div>

              {/* Release information footer */}
              {r.latestRelease && (
                <div className="pt-2 border-t border-zinc-150 dark:border-zinc-850/50 flex justify-between items-center text-[10px] font-mono text-zinc-500">
                  <span>LATEST STABLE TAG</span>
                  <Badge variant="blue">{r.latestRelease}</Badge>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Track Repo Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Track GitHub Repository">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="REPOSITORY IDENTIFIER *"
            placeholder="E.g., DevVault App"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="REPOSITORY HTTP URL *"
            placeholder="E.g., https://github.com/Prajapatidax/Devvault"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />

          <Input
            label="DEFAULT BRANCH TO TRACK"
            placeholder="E.g., main, staging, dev"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
          />

          <Button type="submit" variant="primary" className="mt-2 py-3">
            Initialize Repo Watcher
          </Button>
        </form>
      </Modal>
    </div>
  );
};
