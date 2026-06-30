/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useToast, Button, Input, TextArea, Badge, Modal } from "./UI";
import { Plus, Search, Key, Trash2, Edit, ExternalLink, GitBranch, Database, ShieldAlert, ShieldCheck, X, Users } from "lucide-react";
import { Project, ProjectStatus, ProjectPriority } from "../types";
import { TeamPage } from "./TeamPage";

export const ProjectManager: React.FC = () => {
  const { apiFetch } = useAuth();
  const { toast } = useToast();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [activeTeamProject, setActiveTeamProject] = useState<{ id: string; name: string } | null>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  
  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<ProjectStatus>(ProjectStatus.PLANNING);
  const [priority, setPriority] = useState<ProjectPriority>(ProjectPriority.MEDIUM);
  const [deadline, setDeadline] = useState("");
  const [progress, setProgress] = useState(0);
  const [repository, setRepository] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [server, setServer] = useState("");
  const [database, setDatabase] = useState("");
  const [domain, setDomain] = useState("");
  const [notes, setNotes] = useState("");
  const [techStackInput, setTechStackInput] = useState("");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [apiKeysJson, setApiKeysJson] = useState("");

  // Reveal API keys state
  const [revealedKeys, setRevealedKeys] = useState<{ [projectId: string]: any }>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error(err);
      toast("Failed to load projects", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingProject(null);
    setName("");
    setDescription("");
    setStatus(ProjectStatus.PLANNING);
    setPriority(ProjectPriority.MEDIUM);
    setDeadline("");
    setProgress(0);
    setRepository("");
    setLiveUrl("");
    setServer("");
    setDatabase("");
    setDomain("");
    setNotes("");
    setTechStack([]);
    setTechStackInput("");
    setApiKeysJson("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Project) => {
    setEditingProject(p);
    setName(p.name);
    setDescription(p.description);
    setStatus(p.status);
    setPriority(p.priority);
    setDeadline(p.deadline);
    setProgress(p.progress);
    setRepository(p.repository);
    setLiveUrl(p.liveUrl);
    setServer(p.server);
    setDatabase(p.database);
    setDomain(p.domain);
    setNotes(p.notes);
    setTechStack(p.techStack || []);
    setTechStackInput("");
    setApiKeysJson("");
    setIsModalOpen(true);
  };

  const addTechTag = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = techStackInput.trim();
    if (tag && !techStack.includes(tag)) {
      setTechStack([...techStack, tag]);
      setTechStackInput("");
    }
  };

  const removeTechTag = (tag: string) => {
    setTechStack(techStack.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      toast("Project name is required", "error");
      return;
    }

    let parsedKeys = {};
    if (apiKeysJson.trim()) {
      try {
        parsedKeys = JSON.parse(apiKeysJson);
      } catch (err) {
        toast("API Keys must be valid JSON: { 'KEY': 'VALUE' }", "error");
        return;
      }
    }

    const payload = {
      name,
      description,
      status,
      priority,
      deadline,
      progress,
      repository,
      liveUrl,
      server,
      database,
      domain,
      notes,
      techStack,
      apiKeys: parsedKeys,
    };

    try {
      const url = editingProject ? `/api/projects/${editingProject.id}` : "/api/projects";
      const method = editingProject ? "PUT" : "POST";
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast(editingProject ? "Project updated successfully!" : "Project created successfully!", "success");
        setIsModalOpen(false);
        fetchProjects();
      } else {
        const errData = await res.json();
        toast(errData.error || "Failed to save project", "error");
      }
    } catch (err) {
      console.error(err);
      toast("An error occurred saving the project", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project? This will also remove related bugs and deployments.")) return;

    try {
      const res = await apiFetch(`/api/projects/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast("Project deleted successfully", "success");
        fetchProjects();
      } else {
        toast("Failed to delete project", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Failed to delete project", "error");
    }
  };

  const handleRevealKeys = async (id: string) => {
    if (revealedKeys[id]) {
      // Toggle off
      const updated = { ...revealedKeys };
      delete updated[id];
      setRevealedKeys(updated);
      return;
    }

    setRevealingId(id);
    try {
      const res = await apiFetch(`/api/projects/${id}/reveal-keys`);
      if (res.ok) {
        const data = await res.json();
        setRevealedKeys({ ...revealedKeys, [id]: data });
      } else {
        toast("Failed to reveal API keys", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error decrypting API keys", "error");
    } finally {
      setRevealingId(null);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.techStack.some((t) => t.toLowerCase().includes(search.toLowerCase()));
      
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || p.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (activeTeamProject) {
    return (
      <TeamPage
        projectId={activeTeamProject.id}
        projectName={activeTeamProject.name}
        onClose={() => {
          setActiveTeamProject(null);
          fetchProjects();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100">Project Manager</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Track codebases, servers, domains, tech stacks, and credentials.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleOpenCreateModal} className="self-start">
          <Plus className="h-4 w-4" /> New Project
        </Button>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/10 backdrop-blur-md">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search projects or tech stacks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 pl-9 pr-3 py-2 outline-none focus:border-indigo-500/50"
          />
        </div>

        <div className="flex flex-wrap gap-3 items-center w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-zinc-400 font-mono">STATUS</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 px-2 py-1.5 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="planning">Planning</option>
              <option value="in-progress">In Progress</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-zinc-400 font-mono">PRIORITY</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 px-2 py-1.5 outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-xs text-zinc-500 font-mono gap-2">
          <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>QUERYING VAULT DATABASE...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-white/20 dark:bg-zinc-900/5">
          <span className="text-zinc-400 dark:text-zinc-500 text-xs font-mono">NO PROJECTS FOUND</span>
          <p className="text-[11px] text-zinc-450 mt-1 max-w-sm">
            Configure your first relational architecture mapping to start tracking.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filteredProjects.map((p) => {
            const hasKeys = p.apiKeys && p.apiKeys !== "";
            const isRevealed = !!revealedKeys[p.id];
            
            return (
              <div
                key={p.id}
                className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/25 backdrop-blur-sm shadow-sm flex flex-col gap-4 relative overflow-hidden"
              >
                {/* Header info */}
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-zinc-850 dark:text-white">{p.name}</h3>
                      <Badge variant={
                        p.status === "in-progress" ? "green" :
                        p.status === "completed" ? "blue" :
                        p.status === "paused" ? "yellow" : "gray"
                      }>
                        {p.status}
                      </Badge>
                      <Badge variant={
                        p.priority === "critical" ? "red" :
                        p.priority === "high" ? "yellow" :
                        p.priority === "medium" ? "violet" : "gray"
                      }>
                        {p.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{p.description || "No description provided."}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => setActiveTeamProject({ id: p.id, name: p.name })} title="Manage Team">
                      <Users className="h-3.5 w-3.5 text-indigo-500" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEditModal(p)} title="Edit Project">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(p.id)} title="Delete Project">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
                  <span>PROGRESS</span>
                  <span>{p.progress}%</span>
                </div>

                {/* Tech Stack */}
                {p.techStack && p.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {p.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-650 dark:text-zinc-400 font-mono"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}

                {/* Architecture grid details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-zinc-50 dark:bg-zinc-950/40 p-3 rounded-lg border border-zinc-200/50 dark:border-zinc-800/40 text-[11px]">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-zinc-400 dark:text-zinc-500 block text-[9px] uppercase font-mono">Repository</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300 truncate flex items-center gap-1">
                      <GitBranch className="h-3 w-3 inline text-zinc-400" />
                      {p.repository ? (
                        <a href={p.repository} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-0.5">
                          Code <ExternalLink className="h-2 w-2" />
                        </a>
                      ) : "None"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-zinc-400 dark:text-zinc-500 block text-[9px] uppercase font-mono">Live URL</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                      {p.liveUrl ? (
                        <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-indigo-650 dark:text-indigo-400 flex items-center gap-0.5">
                          {p.liveUrl.replace("https://", "").replace("http://", "")} <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      ) : "Not Deployed"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-zinc-400 dark:text-zinc-500 block text-[9px] uppercase font-mono">Server / Host</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300 truncate">{p.server || "N/A"}</span>
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <span className="text-zinc-400 dark:text-zinc-500 block text-[9px] uppercase font-mono">Database</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300 truncate flex items-center gap-1">
                      <Database className="h-3 w-3 inline text-zinc-400" />
                      {p.database || "N/A"}
                    </span>
                  </div>
                </div>

                {/* API Keys Reveal Area */}
                {hasKeys && (
                  <div className="mt-1 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/40">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-bold text-zinc-400 font-mono flex items-center gap-1">
                        <Key className="h-3 w-3 text-indigo-400" /> DECRYPTED API KEYS & CREDENTIALS
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRevealKeys(p.id)}
                        isLoading={revealingId === p.id}
                        className="text-[10px] px-2 py-0.5 border border-zinc-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-950 font-mono"
                      >
                        {isRevealed ? "Hide Keys" : "Decrypt & Reveal"}
                      </Button>
                    </div>

                    {isRevealed && (
                      <div className="p-3 bg-zinc-950/90 rounded-lg border border-zinc-800 text-[11px] font-mono text-zinc-300">
                        {Object.keys(revealedKeys[p.id]).length === 0 ? (
                          <div className="flex items-center gap-2 text-zinc-500">
                            <ShieldAlert className="h-4 w-4 text-zinc-550" />
                            <span>No API key pairs stored in encrypted packet.</span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-semibold mb-1">
                              <ShieldCheck className="h-3.5 w-3.5" /> SECURE PACKET AES DECRYPTED
                            </div>
                            {Object.entries(revealedKeys[p.id]).map(([k, v]: [string, any]) => (
                              <div key={k} className="flex justify-between border-b border-zinc-800/50 pb-1 last:border-0 last:pb-0">
                                <span className="text-zinc-500 font-bold">{k}:</span>
                                <span className="text-indigo-300 select-all">{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProject ? `Edit Project: ${editingProject.name}` : "Create New Project"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
          <Input
            label="PROJECT NAME *"
            placeholder="E.g., DevVault Platform"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <TextArea
            label="DESCRIPTION"
            placeholder="Short description of the repository, architectural layout, endpoints, or features..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 font-sans">STATUS</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-800 dark:text-zinc-200 p-2.5 outline-none"
              >
                <option value="planning">Planning</option>
                <option value="in-progress">In Progress</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 font-sans">PRIORITY</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ProjectPriority)}
                className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-800 dark:text-zinc-200 p-2.5 outline-none"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="DEADLINE DATE"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
            <Input
              label="PROGRESS %"
              type="number"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="REPOSITORY URL"
              placeholder="E.g., https://github.com/user/repo"
              value={repository}
              onChange={(e) => setRepository(e.target.value)}
            />
            <Input
              label="LIVE DEPLOY URL"
              placeholder="E.g., https://devvault.vercel.app"
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Input
              label="SERVER / HOST"
              placeholder="Render, AWS EC2, VPS"
              value={server}
              onChange={(e) => setServer(e.target.value)}
            />
            <Input
              label="DATABASE"
              placeholder="PostgreSQL, MongoDB"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
            />
            <Input
              label="CUSTOM DOMAIN"
              placeholder="devvault.io"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>

          {/* Tech stack adder */}
          <div className="flex flex-col gap-2 border border-zinc-200 dark:border-zinc-800/80 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950/40">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">TECH STACK</span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="E.g., Next.js, FastAPI, Docker"
                value={techStackInput}
                onChange={(e) => setTechStackInput(e.target.value)}
                className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-800 dark:text-zinc-200 px-3 py-2 outline-none"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTechTag(e); } }}
              />
              <Button type="button" onClick={addTechTag} variant="secondary" size="sm">
                Add Tag
              </Button>
            </div>
            {techStack.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {techStack.map((tech) => (
                  <span
                    key={tech}
                    onClick={() => removeTechTag(tech)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-red-500 dark:hover:border-red-950 text-zinc-700 dark:text-zinc-300 hover:text-red-500 cursor-pointer flex items-center gap-1 transition-colors"
                    title="Click to remove"
                  >
                    {tech} <X className="h-2.5 w-2.5" />
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Credentials Packet */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5 text-indigo-400" /> SECURE PACKET: API KEYS (JSON OBJECT)
            </label>
            <textarea
              placeholder={`{\n  "DATABASE_URL": "postgresql://...",\n  "STRIPE_API_KEY": "sk_test_..."\n}`}
              value={apiKeysJson}
              onChange={(e) => setApiKeysJson(e.target.value)}
              className="w-full bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-550 dark:placeholder-zinc-650 focus:border-indigo-500/50 transition-all outline-none p-3.5 min-h-[100px] font-mono"
            />
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
              Keys are encrypted in the local database using AES-256-CBC and only decrypted on-demand.
            </span>
          </div>

          <TextArea
            label="ADDITIONAL DEVELOPMENT NOTES"
            placeholder="Paste credentials, webhook specifications, build constraints, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <Button type="submit" variant="primary" className="mt-2 py-3">
            {editingProject ? "Update Project Config" : "Deploy Project Config"}
          </Button>
        </form>
      </Modal>
    </div>
  );
};
