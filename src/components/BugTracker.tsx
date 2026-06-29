/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useToast, Button, Input, Modal, Badge, TextArea } from "./UI";
import { Plus, Search, Bug, CheckSquare, Clock, AlertTriangle, Trash2, Edit, Check } from "lucide-react";
import { Bug as BugType, BugStatus, ProjectPriority, Project } from "../types";

export const BugTracker: React.FC = () => {
  const { apiFetch } = useAuth();
  const { toast } = useToast();

  const [bugs, setBugs] = useState<BugType[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBug, setEditingBug] = useState<BugType | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<ProjectPriority>(ProjectPriority.MEDIUM);
  const [status, setStatus] = useState<BugStatus>(BugStatus.OPEN);
  const [projectId, setProjectId] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const bugRes = await apiFetch("/api/bugs");
      const projRes = await apiFetch("/api/projects");
      
      if (bugRes.ok && projRes.ok) {
        const bugData = await bugRes.json();
        const projData = await projRes.json();
        setBugs(bugData);
        setProjects(projData);
        if (projData.length > 0 && !projectId) {
          setProjectId(projData[0].id);
        }
      }
    } catch (err) {
      console.error(err);
      toast("Failed to load bugs data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingBug(null);
    setTitle("");
    setDescription("");
    setPriority(ProjectPriority.MEDIUM);
    setStatus(BugStatus.OPEN);
    if (projects.length > 0) {
      setProjectId(projects[0].id);
    } else {
      setProjectId("");
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (b: BugType) => {
    setEditingBug(b);
    setTitle(b.title);
    setDescription(b.description);
    setPriority(b.priority);
    setStatus(b.status);
    setProjectId(b.projectId);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !projectId) {
      toast("Title and Project are required", "error");
      return;
    }

    const payload = {
      title,
      description,
      priority,
      status,
      projectId,
    };

    try {
      const url = editingBug ? `/api/bugs/${editingBug.id}` : "/api/bugs";
      const method = editingBug ? "PUT" : "POST";
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast(editingBug ? "Bug updated successfully!" : "Bug log generated!", "success");
        setIsModalOpen(false);
        fetchData();
      } else {
        const data = await res.json();
        toast(data.error || "Failed to save bug", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Failed to save bug", "error");
    }
  };

  const handleCycleStatus = async (b: BugType) => {
    // Cycle status: open -> working -> resolved -> closed -> open
    const statusOrder = [BugStatus.OPEN, BugStatus.WORKING, BugStatus.RESOLVED, BugStatus.CLOSED];
    const currentIndex = statusOrder.indexOf(b.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

    try {
      const res = await apiFetch(`/api/bugs/${b.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        toast(`Bug status updated to ${nextStatus}`, "success");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this bug ticket?")) return;

    try {
      const res = await apiFetch(`/api/bugs/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast("Bug ticket deleted", "success");
        fetchData();
      } else {
        toast("Failed to delete bug", "error");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getProjectName = (id: string) => {
    const proj = projects.find((p) => p.id === id);
    return proj ? proj.name : "Unknown Project";
  };

  const openBugsCount = bugs.filter((b) => b.status === BugStatus.OPEN || b.status === BugStatus.WORKING).length;
  const criticalBugsCount = bugs.filter((b) => b.priority === ProjectPriority.CRITICAL || b.priority === ProjectPriority.HIGH).length;

  const filteredBugs = bugs.filter((b) => {
    const matchesSearch = b.title.toLowerCase().includes(search.toLowerCase()) || 
      b.description.toLowerCase().includes(search.toLowerCase());
      
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100">Bug & Ticket Tracker</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Log and manage exceptions, regressions, and tasks by project.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleOpenCreateModal} className="self-start">
          <Plus className="h-4 w-4" /> Log Bug
        </Button>
      </div>

      {/* Analytics Bento Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/30 backdrop-blur-sm shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-650 dark:text-red-450 border border-red-100 dark:border-red-900/20">
            <Bug className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 font-mono block">OPEN ISSUES</span>
            <span className="text-xl font-bold text-zinc-800 dark:text-white font-mono">{openBugsCount} active</span>
          </div>
        </div>

        <div className="p-4.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/30 backdrop-blur-sm shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/20">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 font-mono block">HIGH / CRITICAL</span>
            <span className="text-xl font-bold text-zinc-800 dark:text-white font-mono">{criticalBugsCount} flagged</span>
          </div>
        </div>

        <div className="p-4.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/30 backdrop-blur-sm shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-900/25">
            <CheckSquare className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 font-mono block">RESOLVED TICKETS</span>
            <span className="text-xl font-bold text-zinc-800 dark:text-white font-mono">
              {bugs.filter((b) => b.status === BugStatus.RESOLVED || b.status === BugStatus.CLOSED).length} closed
            </span>
          </div>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/10 backdrop-blur-md">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search bug tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-850 dark:text-zinc-200 pl-9 pr-3 py-2.5 outline-none focus:border-indigo-500/50"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 font-mono">STATUS</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 px-2 py-1.5 outline-none font-sans"
          >
            <option value="all">All States</option>
            <option value="open">Open</option>
            <option value="working">Working</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Bugs Grid Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-xs text-zinc-500 font-mono gap-2">
          <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>QUERYING RESOLUTION RECORDS...</span>
        </div>
      ) : filteredBugs.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-white/20 dark:bg-zinc-900/5">
          <Bug className="h-8 w-8 text-zinc-300 dark:text-zinc-750 mb-3" />
          <span className="text-zinc-400 dark:text-zinc-500 text-xs font-mono">CLEAN RUNTIME DIRECTORY</span>
          <p className="text-[11px] text-zinc-450 mt-1 max-w-sm">
            No bugs reported! The active codebase appears robust.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBugs.map((b) => (
            <div
              key={b.id}
              className={`p-4 rounded-xl border bg-white/60 dark:bg-zinc-900/20 backdrop-blur-sm shadow-sm flex flex-col justify-between gap-3 relative ${
                b.status === "resolved" || b.status === "closed" ? "border-zinc-200 dark:border-zinc-800 opacity-70" :
                b.priority === "critical" ? "border-red-300 dark:border-red-950/60" : "border-zinc-200 dark:border-zinc-800"
              }`}
            >
              <div>
                <div className="flex justify-between items-start gap-3">
                  <div className="overflow-hidden">
                    <span className="text-[9px] font-mono text-indigo-550 dark:text-indigo-400 block uppercase font-semibold">
                      {getProjectName(b.projectId)}
                    </span>
                    <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-100 truncate mt-0.5" title={b.title}>
                      {b.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEditModal(b)} className="p-1">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(b.id)} className="p-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-zinc-500 dark:text-zinc-450 mt-2 select-text">{b.description || "No description provided."}</p>
              </div>

              {/* Status and priority controllers */}
              <div className="pt-2 border-t border-zinc-150 dark:border-zinc-850/50 flex justify-between items-center text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-400 dark:text-zinc-500 font-mono">PRIORITY:</span>
                  <Badge variant={
                    b.priority === "critical" ? "red" :
                    b.priority === "high" ? "yellow" :
                    b.priority === "medium" ? "violet" : "gray"
                  }>
                    {b.priority}
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-400 dark:text-zinc-500 font-mono">STATUS:</span>
                  <button
                    onClick={() => handleCycleStatus(b)}
                    className="cursor-pointer transition-all active:scale-95"
                    title="Click to cycle status"
                  >
                    <Badge variant={
                      b.status === "open" ? "red" :
                      b.status === "working" ? "yellow" :
                      b.status === "resolved" ? "green" : "gray"
                    }>
                      {b.status}
                    </Badge>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingBug ? "Edit Bug Ticket" : "Report New Exception Ticket"}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="BUG / TICKET TITLE *"
            placeholder="E.g., JWT Auth Middleware throws token expired on reload"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 font-sans">AFFECTED PROJECT *</label>
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

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 font-sans">PRIORITY SEVERITY</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ProjectPriority)}
                className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-800 dark:text-zinc-200 p-2.5 outline-none font-sans"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {editingBug && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 font-sans">TICKET STATUS</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as BugStatus)}
                className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-800 dark:text-zinc-200 p-2.5 outline-none font-sans"
              >
                <option value="open">Open</option>
                <option value="working">Working</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          )}

          <TextArea
            label="DESCRIPTION & ERROR DETAILS"
            placeholder="Error stack trace, reproducible steps, environment characteristics..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Button type="submit" variant="primary" disabled={projects.length === 0} className="mt-2 py-3">
            {editingBug ? "Update Ticket Status" : "Log Exception config"}
          </Button>
        </form>
      </Modal>
    </div>
  );
};
