/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useToast, Button, Input, Modal, Badge, TextArea } from "./UI";
import { Plus, Search, Folder, Code2, Copy, Trash2, Edit, Star, X, Tag } from "lucide-react";
import { Snippet } from "../types";

export const SnippetManager: React.FC = () => {
  const { apiFetch } = useAuth();
  const { toast } = useToast();

  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("All");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);
  
  // Form fields
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [folder, setFolder] = useState("General");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);

  const fetchSnippets = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/snippets");
      if (res.ok) {
        const data = await res.json();
        setSnippets(data);
      }
    } catch (err) {
      console.error(err);
      toast("Failed to load snippets", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnippets();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingSnippet(null);
    setTitle("");
    setCode("");
    setLanguage("javascript");
    setFolder("General");
    setTags([]);
    setTagInput("");
    setIsFavorite(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (s: Snippet) => {
    setEditingSnippet(s);
    setTitle(s.title);
    setCode(s.code);
    setLanguage(s.language || "javascript");
    setFolder(s.folder || "General");
    setTags(s.tags || []);
    setTagInput("");
    setIsFavorite(!!s.isFavorite);
    setIsModalOpen(true);
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !code) {
      toast("Title and code are required", "error");
      return;
    }

    const payload = {
      title,
      code,
      language,
      folder,
      tags,
      isFavorite,
    };

    try {
      const url = editingSnippet ? `/api/snippets/${editingSnippet.id}` : "/api/snippets";
      const method = editingSnippet ? "PUT" : "POST";
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast(editingSnippet ? "Snippet updated successfully!" : "Snippet created successfully!", "success");
        setIsModalOpen(false);
        fetchSnippets();
      } else {
        const data = await res.json();
        toast(data.error || "Failed to save snippet", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error saving snippet", "error");
    }
  };

  const handleToggleFavorite = async (s: Snippet) => {
    try {
      const res = await apiFetch(`/api/snippets/${s.id}`, {
        method: "PUT",
        body: JSON.stringify({ isFavorite: !s.isFavorite }),
      });
      if (res.ok) {
        fetchSnippets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this snippet?")) return;

    try {
      const res = await apiFetch(`/api/snippets/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast("Snippet deleted successfully", "success");
        fetchSnippets();
      } else {
        toast("Failed to delete snippet", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Failed to delete snippet", "error");
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast("Code copied to clipboard!", "success");
  };

  const folders = ["All", "Favorites", ...Array.from(new Set(snippets.map((s) => s.folder || "General")))];

  const filteredSnippets = snippets.filter((s) => {
    const matchesSearch = s.title.toLowerCase().includes(search.toLowerCase()) || 
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      s.language.toLowerCase().includes(search.toLowerCase()) ||
      s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

    const matchesFolder = selectedFolder === "All" ? true :
      selectedFolder === "Favorites" ? s.isFavorite : s.folder === selectedFolder;

    return matchesSearch && matchesFolder;
  });

  return (
    <div className="flex flex-col md:flex-row gap-6 w-full pb-10">
      {/* Sidebar folders */}
      <aside className="w-full md:w-56 shrink-0 flex flex-col gap-2.5">
        <div className="px-1">
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 font-mono tracking-wider">DIRECTORIES</span>
        </div>
        <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible gap-1.5 p-1 bg-zinc-100/50 dark:bg-zinc-950/20 md:bg-transparent rounded-xl">
          {folders.map((f) => {
            const isActive = selectedFolder === f;
            const count = f === "All" ? snippets.length : 
              f === "Favorites" ? snippets.filter((s) => s.isFavorite).length :
              snippets.filter((s) => s.folder === f).length;

            return (
              <button
                key={f}
                onClick={() => setSelectedFolder(f)}
                className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-all ${
                  isActive
                    ? "bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/50 text-zinc-900 dark:text-white shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900/30 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  {f === "Favorites" ? (
                    <Star className={`h-3.5 w-3.5 ${isActive ? "text-amber-500 fill-amber-500" : "text-zinc-400 dark:text-zinc-500"}`} />
                  ) : (
                    <Folder className={`h-3.5 w-3.5 ${isActive ? "text-indigo-650 dark:text-indigo-400" : "text-zinc-400 dark:text-zinc-500"}`} />
                  )}
                  <span>{f}</span>
                </div>
                <Badge variant={isActive ? "violet" : "gray"}>{count}</Badge>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main snippet display */}
      <div className="flex-1 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100">Snippet Manager</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Organize reusable boilerplate code, utility functions, or config scripts with metadata.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={handleOpenCreateModal} className="self-start">
            <Plus className="h-4 w-4" /> New Snippet
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search snippets by title, content, tag, or programming language..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-850 dark:text-zinc-200 pl-9 pr-3 py-2.5 outline-none focus:border-indigo-500/50"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-xs text-zinc-500 font-mono gap-2">
            <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span>UNSEALING SNIPPET SECTORS...</span>
          </div>
        ) : filteredSnippets.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-white/20 dark:bg-zinc-900/5">
            <span className="text-zinc-400 dark:text-zinc-500 text-xs font-mono">NO SNIPPETS FOUND</span>
            <p className="text-[11px] text-zinc-450 mt-1 max-w-sm">
              Save code snippets here to copy them in one-click when coding.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {filteredSnippets.map((s) => (
              <div
                key={s.id}
                className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/20 backdrop-blur-sm shadow-sm flex flex-col gap-3 relative"
              >
                {/* Header */}
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-zinc-800 dark:text-white">{s.title}</h4>
                      <Badge variant="violet">{s.language}</Badge>
                      <Badge variant="gray">{s.folder}</Badge>
                    </div>
                    {/* Tags list */}
                    {s.tags && s.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {s.tags.map((t) => (
                          <span key={t} className="text-[9px] text-zinc-500 dark:text-zinc-400 font-sans flex items-center gap-0.5">
                            <Tag className="h-2.5 w-2.5" /> {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleToggleFavorite(s)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-500 transition-colors cursor-pointer"
                      title={s.isFavorite ? "Unfavorite" : "Favorite"}
                    >
                      <Star className={`h-4 w-4 ${s.isFavorite ? "text-amber-500 fill-amber-500" : ""}`} />
                    </button>
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEditModal(s)} className="p-1.5">
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleDelete(s.id)} className="p-1.5">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Preformatted code block */}
                <div className="relative group rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-[11px] text-zinc-200 font-mono mt-1">
                  <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleCopy(s.code)}
                      className="text-[10px] px-2 py-1 bg-zinc-900 border border-zinc-800 text-zinc-200 hover:bg-zinc-850"
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </Button>
                  </div>
                  <pre className="p-4 overflow-x-auto max-h-72 select-text">{s.code}</pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingSnippet ? `Edit Snippet: ${editingSnippet.title}` : "Save New Boilerplate Snippet"}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="SNIPPET TITLE *"
            placeholder="E.g., Axios Client Instance"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 font-sans">LANGUAGE</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-800 dark:text-zinc-200 p-2.5 outline-none"
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="rust">Rust</option>
                <option value="go">Go</option>
                <option value="html">HTML</option>
                <option value="css">CSS</option>
                <option value="sql">SQL</option>
                <option value="bash">Bash / Shell</option>
                <option value="json">JSON</option>
                <option value="other">Other / Text</option>
              </select>
            </div>

            <Input
              label="FOLDER CATEGORY"
              placeholder="E.g., Hooks, Database"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
              <Code2 className="h-3.5 w-3.5 text-indigo-400" /> CODE CONTENT *
            </label>
            <textarea
              placeholder={`const api = axios.create({\n  baseURL: process.env.API_BASE,\n});`}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="w-full bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-550 dark:placeholder-zinc-650 focus:border-indigo-500/50 transition-all outline-none p-3.5 min-h-[160px] font-mono"
            />
          </div>

          {/* Tags list */}
          <div className="flex flex-col gap-2 border border-zinc-200 dark:border-zinc-800/80 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-950/40">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">TAGS</span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="E.g., axios, react, jwt"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 px-3 py-2 outline-none"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(e); } }}
              />
              <Button type="button" onClick={handleAddTag} variant="secondary" size="sm">
                Add Tag
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    onClick={() => handleRemoveTag(tag)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-red-500 dark:hover:border-red-950 text-zinc-700 dark:text-zinc-300 hover:text-red-500 cursor-pointer flex items-center gap-1 transition-colors"
                  >
                    {tag} <X className="h-2.5 w-2.5" />
                  </span>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-700 dark:text-zinc-300 mt-1 select-none">
            <input
              type="checkbox"
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-zinc-950 border-zinc-350 dark:border-zinc-800 h-4.5 w-4.5 cursor-pointer"
            />
            Mark as Favorite Snippet
          </label>

          <Button type="submit" variant="primary" className="mt-2 py-3">
            {editingSnippet ? "Update Snippet" : "Deploy Snippet"}
          </Button>
        </form>
      </Modal>
    </div>
  );
};
