/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useToast, Button, Input, Modal, Badge, TextArea } from "./UI";
import { Plus, Search, Server, Cpu, ExternalLink, Trash2, Edit, Network, CheckCircle } from "lucide-react";
import { Deployment, Project } from "../types";

export const DeploymentManager: React.FC = () => {
  const { apiFetch } = useAuth();
  const { toast } = useToast();

  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeployment, setEditingDeployment] = useState<Deployment | null>(null);

  // Form Fields
  const [projectId, setProjectId] = useState("");
  const [frontendUrl, setFrontendUrl] = useState("");
  const [backendUrl, setBackendUrl] = useState("");
  const [platform, setPlatform] = useState("");
  const [notes, setNotes] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const depRes = await apiFetch("/api/deployments");
      const projRes = await apiFetch("/api/projects");

      if (depRes.ok && projRes.ok) {
        const depData = await depRes.json();
        const projData = await projRes.json();
        setDeployments(depData);
        setProjects(projData);
        if (projData.length > 0 && !projectId) {
          setProjectId(projData[0].id);
        }
      }
    } catch (err) {
      console.error(err);
      toast("Failed to load deployment records", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingDeployment(null);
    setFrontendUrl("");
    setBackendUrl("");
    setPlatform("Vercel");
    setNotes("");
    if (projects.length > 0) {
      setProjectId(projects[0].id);
    } else {
      setProjectId("");
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (d: Deployment) => {
    setEditingDeployment(d);
    setProjectId(d.projectId);
    setFrontendUrl(d.frontendUrl);
    setBackendUrl(d.backendUrl);
    setPlatform(d.platform);
    setNotes(d.notes);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !platform) {
      toast("Project and Platform are required", "error");
      return;
    }

    const payload = {
      projectId,
      frontendUrl,
      backendUrl,
      platform,
      notes,
    };

    try {
      const url = editingDeployment ? `/api/deployments/${editingDeployment.id}` : "/api/deployments";
      const method = editingDeployment ? "PUT" : "POST";
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast(editingDeployment ? "Deployment entry updated!" : "Deployment logged successfully!", "success");
        setIsModalOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        toast(data.error || "Failed to save deployment config", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Failed to save deployment config", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this deployment log?")) return;

    try {
      const res = await apiFetch(`/api/deployments/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast("Deployment log deleted", "success");
        fetchData();
      } else {
        toast("Failed to delete log", "error");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getProjectName = (id: string) => {
    const proj = projects.find((p) => p.id === id);
    return proj ? proj.name : "Unknown Project";
  };

  const filteredDeployments = deployments.filter((d) => {
    const projName = getProjectName(d.projectId).toLowerCase();
    const platformName = d.platform.toLowerCase();
    const notesContent = d.notes.toLowerCase();
    const query = search.toLowerCase();

    return projName.includes(query) || platformName.includes(query) || notesContent.includes(query);
  });

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100">Deployment Manager</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Keep track of live URLs, hosting platforms, and deployment variables.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleOpenCreateModal} className="self-start">
          <Plus className="h-4 w-4" /> Log Deployment
        </Button>
      </div>

      {/* Search Filter */}
      <div className="relative w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
        <input
          type="text"
          placeholder="Search by project name or platform..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-850 dark:text-zinc-200 pl-9 pr-3 py-2.5 outline-none focus:border-indigo-500/50"
        />
      </div>

      {/* Deployments list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-xs text-zinc-500 font-mono gap-2">
          <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>QUERYING DEPLOYMENT NODES...</span>
        </div>
      ) : filteredDeployments.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-white/20 dark:bg-zinc-900/5">
          <Server className="h-8 w-8 text-zinc-300 dark:text-zinc-750 mb-3" />
          <span className="text-zinc-400 dark:text-zinc-500 text-xs font-mono">NO DEPLOYMENT NODES RECORDED</span>
          <p className="text-[11px] text-zinc-450 mt-1 max-w-sm">
            Watch routing parameters, API Gateways, and live SPA distribution points.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredDeployments.map((d) => (
            <div
              key={d.id}
              className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/20 backdrop-blur-sm shadow-sm flex flex-col gap-4"
            >
              {/* Header */}
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 text-indigo-650 dark:text-indigo-400 shadow-sm">
                    <Cpu className="h-5 w-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-800 dark:text-white">
                      {getProjectName(d.projectId)}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Badge variant="blue">{d.platform}</Badge>
                      <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold font-mono">
                        <CheckCircle className="h-3 w-3" /> Live
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenEditModal(d)} className="p-1.5">
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(d.id)} className="p-1.5">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* URLs details */}
              <div className="flex flex-col gap-2.5 bg-zinc-50 dark:bg-zinc-950/40 p-3 rounded-lg border border-zinc-200/50 dark:border-zinc-800/40 text-xs">
                {d.frontendUrl && (
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 font-mono">FRONTEND HUB</span>
                    <a
                      href={d.frontendUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 truncate font-semibold"
                    >
                      {d.frontendUrl} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {d.backendUrl && (
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 border-t border-zinc-200/50 dark:border-zinc-850/50 pt-2">
                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-550 font-mono">BACKEND API</span>
                    <a
                      href={d.backendUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 truncate font-semibold"
                    >
                      {d.backendUrl} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Notes */}
              {d.notes && (
                <div>
                  <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 block uppercase">DEPLOYMENT NOTES</span>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 select-text bg-zinc-50/50 dark:bg-transparent p-2 md:p-0 rounded border dark:border-0 border-zinc-200">{d.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingDeployment ? "Edit Deployment Record" : "Log New Server Deployment"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 font-sans">SELECT PROJECT *</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-800 dark:text-zinc-200 p-2.5 outline-none font-sans"
            >
              {projects.length === 0 ? (
                <option value="">No projects created yet</option>
              ) : (
                projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)
              )}
            </select>
          </div>

          <Input
            label="FRONTEND HOSTING URL"
            placeholder="E.g., https://devvault.vercel.app"
            value={frontendUrl}
            onChange={(e) => setFrontendUrl(e.target.value)}
          />

          <Input
            label="BACKEND API HOSTING URL"
            placeholder="E.g., https://devvault-api.render.com"
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 font-sans">HOSTING PLATFORM *</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              required
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-800 dark:text-zinc-200 p-2.5 outline-none font-sans"
            >
              <option value="Vercel">Vercel</option>
              <option value="Netlify">Netlify</option>
              <option value="Render">Render</option>
              <option value="Railway">Railway</option>
              <option value="Fly.io">Fly.io</option>
              <option value="AWS EC2 / Amplify">AWS EC2 / Amplify</option>
              <option value="DigitalOcean Droplet">DigitalOcean Droplet</option>
              <option value="Heroku">Heroku</option>
              <option value="Firebase Hosting">Firebase Hosting</option>
              <option value="Other Cloud Node">Other Cloud Node</option>
            </select>
          </div>

          <TextArea
            label="DEPLOYMENT CONFIG / VARIABLES NOTES"
            placeholder="Environment tags, webhook hooks, build branch, docker flags..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <Button type="submit" variant="primary" disabled={projects.length === 0} className="mt-2 py-3">
            {editingDeployment ? "Update Deployment configuration" : "Deploy Config Log"}
          </Button>
        </form>
      </Modal>
    </div>
  );
};
