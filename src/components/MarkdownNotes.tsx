/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { useToast, Button, Input, Badge } from "./UI";
import { Plus, Search, Folder, Star, Trash2, BookOpen, Edit3, Eye, CloudLightning, Check, AlertCircle } from "lucide-react";
import { Note } from "../types";

export const MarkdownNotes: React.FC = () => {
  const { apiFetch } = useAuth();
  const { toast } = useToast();

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("All");

  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [editMode, setEditMode] = useState<"edit" | "preview">("edit");
  
  // Active note working state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [folder, setFolder] = useState("General");
  const [tagsInput, setTagsInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  
  // Autosave status state
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/notes");
      if (res.ok) {
        const data = await res.json();
        setNotes(data);
        if (data.length > 0 && !activeNote) {
          // Select first note by default
          selectNote(data[0]);
        }
      }
    } catch (err) {
      console.error(err);
      toast("Failed to load notes", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const selectNote = (note: Note) => {
    // Clear any pending autosave triggers
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    
    setActiveNote(note);
    setTitle(note.title);
    setContent(note.content || "");
    setFolder(note.folder || "General");
    setTags(note.tags || []);
    setSaveStatus("saved");
    setEditMode("edit");
  };

  const handleCreateNote = async () => {
    try {
      const res = await apiFetch("/api/notes", {
        method: "POST",
        body: JSON.stringify({
          title: "Untitled Note",
          content: "",
          folder: "General",
          tags: [],
          isFavorite: false,
        }),
      });

      if (res.ok) {
        const newNote = await res.json();
        setNotes((prev) => [newNote, ...prev]);
        selectNote(newNote);
        toast("New note provisioned", "success");
      }
    } catch (err) {
      console.error(err);
      toast("Failed to create note", "error");
    }
  };

  const triggerAutosave = (updatedFields: Partial<Note>) => {
    if (!activeNote) return;

    setSaveStatus("saving");
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/notes/${activeNote.id}`, {
          method: "PUT",
          body: JSON.stringify(updatedFields),
        });

        if (res.ok) {
          const updatedNote = await res.json();
          // Update in place in state lists
          setNotes((prev) => prev.map((n) => (n.id === activeNote.id ? updatedNote : n)));
          setSaveStatus("saved");
        } else {
          setSaveStatus("error");
        }
      } catch (err) {
        console.error(err);
        setSaveStatus("error");
      }
    }, 1000); // Trigger save after 1 second of typing inactivity
  };

  // When form fields are changed locally
  const onTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    triggerAutosave({ title: newTitle });
  };

  const onContentChange = (newContent: string) => {
    setContent(newContent);
    triggerAutosave({ content: newContent });
  };

  const onFolderChange = (newFolder: string) => {
    setFolder(newFolder);
    triggerAutosave({ folder: newFolder });
  };

  const handleToggleFavorite = async () => {
    if (!activeNote) return;
    const nextFavorite = !activeNote.isFavorite;
    try {
      const res = await apiFetch(`/api/notes/${activeNote.id}`, {
        method: "PUT",
        body: JSON.stringify({ isFavorite: nextFavorite }),
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveNote(updated);
        setNotes((prev) => prev.map((n) => (n.id === activeNote.id ? updated : n)));
        toast(nextFavorite ? "Added to favorites" : "Removed from favorites", "info");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteActive = async () => {
    if (!activeNote) return;
    if (!confirm("Are you sure you want to delete this note?")) return;

    try {
      const res = await apiFetch(`/api/notes/${activeNote.id}`, { method: "DELETE" });
      if (res.ok) {
        toast("Note deleted successfully", "success");
        const remaining = notes.filter((n) => n.id !== activeNote.id);
        setNotes(remaining);
        if (remaining.length > 0) {
          selectNote(remaining[0]);
        } else {
          setActiveNote(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addTag = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = tagsInput.trim();
    if (tag && !tags.includes(tag)) {
      const updated = [...tags, tag];
      setTags(updated);
      setTagsInput("");
      triggerAutosave({ tags: updated });
    }
  };

  const removeTag = (tag: string) => {
    const updated = tags.filter((t) => t !== tag);
    setTags(updated);
    triggerAutosave({ tags: updated });
  };

  // Simple custom Markdown preview parsing function
  const parseMarkdown = (md: string) => {
    if (!md) return '<p class="text-zinc-500 italic">No content in this note yet...</p>';
    
    let html = md
      // Escape HTML
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Code Blocks
    html = html.replace(/```([\s\S]*?)```/gm, (_, code) => {
      return `<pre class="bg-zinc-950 text-zinc-300 p-3 rounded-lg border border-zinc-800 font-mono text-xs overflow-x-auto my-3 block select-text">${code.trim()}</pre>`;
    });

    // Inline Code
    html = html.replace(/`([^`]+)`/g, '<code class="bg-zinc-150 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono text-[11px]">$1</code>');

    // Headers
    html = html.replace(/^# (.*?)$/gm, '<h1 class="text-xl font-bold border-b border-zinc-200 dark:border-zinc-800 pb-1 mt-4 mb-2 text-zinc-900 dark:text-white">$1</h1>');
    html = html.replace(/^## (.*?)$/gm, '<h2 class="text-lg font-semibold mt-4 mb-2 text-zinc-800 dark:text-zinc-100">$1</h2>');
    html = html.replace(/^### (.*?)$/gm, '<h3 class="text-sm font-bold mt-3 mb-1.5 text-zinc-700 dark:text-zinc-200">$1</h3>');

    // Bold
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    
    // Italics
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");

    // Unordered lists
    html = html.replace(/^\- (.*?)$/gm, '<li class="ml-4 list-disc text-zinc-750 dark:text-zinc-300">$1</li>');

    // Ordered lists
    html = html.replace(/^\d+\. (.*?)$/gm, '<li class="ml-4 list-decimal text-zinc-750 dark:text-zinc-300">$1</li>');

    // Blockquotes
    html = html.replace(/^&gt; (.*?)$/gm, '<blockquote class="border-l-4 border-indigo-500 pl-3 italic text-zinc-500 my-2">$1</blockquote>');

    // Paragraphs (split by double lines)
    const paragraphs = html.split(/\n\n+/);
    html = paragraphs.map(p => {
      // Check if it's already list tags, heading tags, blockquotes or pre
      if (p.trim().startsWith("<h") || p.trim().startsWith("<pre") || p.trim().startsWith("<li") || p.trim().startsWith("<blockquote")) {
        return p;
      }
      return `<p class="leading-relaxed mb-3 text-zinc-850 dark:text-zinc-300">${p.replace(/\n/g, "<br />")}</p>`;
    }).join("");

    return html;
  };

  const folders = ["All", "Favorites", ...Array.from(new Set(notes.map((n) => n.folder || "General")))];

  const filteredNotes = notes.filter((n) => {
    const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) || 
      n.content.toLowerCase().includes(search.toLowerCase());
      
    const matchesFolder = selectedFolder === "All" ? true :
      selectedFolder === "Favorites" ? n.isFavorite : n.folder === selectedFolder;
      
    return matchesSearch && matchesFolder;
  });

  return (
    <div className="flex flex-col md:flex-row gap-6 w-full h-[calc(100vh-10rem)] pb-5">
      {/* 1. Sidebar Notes List */}
      <aside className="w-full md:w-64 shrink-0 flex flex-col gap-3 h-full border-r border-zinc-200 dark:border-zinc-850/50 pr-4">
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 font-mono tracking-wider">NOTES MODULE</span>
          <Button variant="ghost" size="sm" onClick={handleCreateNote} className="p-1 font-bold text-indigo-650 dark:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-900/50" title="New Note">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Directory selection selector */}
        <select
          value={selectedFolder}
          onChange={(e) => setSelectedFolder(e.target.value)}
          className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 p-2 outline-none w-full"
        >
          {folders.map((f) => (
            <option key={f} value={f}>{f === "Favorites" ? "★ Favorites" : f}</option>
          ))}
        </select>

        {/* Search */}
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 pl-8 pr-2 py-1.5 outline-none"
          />
        </div>

        {/* Notes Items List */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 min-h-0">
          {loading && notes.length === 0 ? (
            <div className="flex items-center justify-center p-6 text-[10px] font-mono text-zinc-500">
              DECRYPTING NOTES...
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="text-center p-6 text-zinc-400 dark:text-zinc-500 text-[10px] font-mono border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50/20 dark:bg-zinc-900/5">
              NO NOTES FOUND
            </div>
          ) : (
            filteredNotes.map((n) => {
              const isActive = activeNote?.id === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => selectNote(n)}
                  className={`text-left p-3 rounded-lg border text-xs cursor-pointer flex flex-col gap-1 transition-all ${
                    isActive
                      ? "bg-white dark:bg-zinc-850/80 border-zinc-300 dark:border-zinc-750 text-zinc-850 dark:text-white shadow-sm"
                      : "border-transparent text-zinc-500 dark:text-zinc-400 hover:bg-zinc-150/40 dark:hover:bg-zinc-900/30"
                  }`}
                >
                  <div className="flex justify-between items-center w-full gap-2">
                    <span className="font-bold truncate flex-1">{n.title || "Untitled Note"}</span>
                    {n.isFavorite && <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
                  </div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate w-full">
                    {n.content ? n.content.substring(0, 45).replace(/[\#\*`\-\n]/g, "") : "Empty note content..."}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* 2. Active Note Panel */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white/50 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800 rounded-xl">
        {activeNote ? (
          <div className="flex-1 flex flex-col h-full min-h-0">
            {/* Note Editor Header */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0">
              <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  className="bg-transparent text-sm font-bold text-zinc-800 dark:text-white border-0 outline-none border-b border-transparent focus:border-zinc-300 dark:focus:border-zinc-750 px-0 py-0.5 w-full sm:w-64 focus:ring-0"
                  placeholder="Enter note title..."
                />
                
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={handleToggleFavorite}
                    className="p-1 text-zinc-400 hover:text-amber-500 cursor-pointer"
                    title="Toggle Favorite"
                  >
                    <Star className={`h-4 w-4 ${activeNote.isFavorite ? "text-amber-500 fill-amber-500" : ""}`} />
                  </button>
                  <Button variant="danger" size="sm" onClick={handleDeleteActive} className="p-1 hover:bg-red-500/10">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Autosave status indicator */}
              <div className="flex items-center gap-3 shrink-0 select-none">
                <div className="flex items-center gap-1 text-[10px] font-mono">
                  {saveStatus === "saving" && (
                    <span className="text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                      <CloudLightning className="h-3 w-3 animate-pulse text-indigo-400" />
                      Saving...
                    </span>
                  )}
                  {saveStatus === "saved" && (
                    <span className="text-emerald-600 dark:text-emerald-450 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Autosaved
                    </span>
                  )}
                  {saveStatus === "error" && (
                    <span className="text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Save Error
                    </span>
                  )}
                </div>

                {/* Edit / Preview toggles */}
                <div className="flex bg-zinc-100 dark:bg-zinc-950 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-850">
                  <button
                    onClick={() => setEditMode("edit")}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold font-sans cursor-pointer transition-all flex items-center gap-1 ${
                      editMode === "edit"
                        ? "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/50 text-zinc-800 dark:text-white"
                        : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                    }`}
                  >
                    <Edit3 className="h-3 w-3" /> Edit
                  </button>
                  <button
                    onClick={() => setEditMode("preview")}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold font-sans cursor-pointer transition-all flex items-center gap-1 ${
                      editMode === "preview"
                        ? "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700/50 text-zinc-800 dark:text-white"
                        : "text-zinc-400 hover:text-zinc-200 border border-transparent"
                    }`}
                  >
                    <Eye className="h-3 w-3" /> Preview
                  </button>
                </div>
              </div>
            </div>

            {/* Note Fields */}
            <div className="p-3 bg-zinc-50/50 dark:bg-zinc-950/20 border-b border-zinc-200 dark:border-zinc-850 flex flex-wrap gap-3 items-center shrink-0">
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-zinc-400 font-bold font-mono">FOLDER:</span>
                <input
                  type="text"
                  value={folder}
                  onChange={(e) => onFolderChange(e.target.value)}
                  className="bg-transparent text-zinc-700 dark:text-zinc-300 font-semibold border-0 outline-none border-b border-transparent focus:border-zinc-300 dark:focus:border-zinc-750 px-1 py-0 w-24 text-[11px]"
                  placeholder="General"
                />
              </div>

              <div className="flex items-center gap-1 text-[11px] border-l border-zinc-200 dark:border-zinc-800 pl-3 flex-1 min-w-0">
                <span className="text-zinc-400 font-bold font-mono shrink-0">TAGS:</span>
                <form onSubmit={addTag} className="flex items-center gap-1.5 min-w-0 flex-1">
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="Press enter to add..."
                    className="bg-transparent border-0 outline-none text-[11px] text-zinc-755 dark:text-zinc-300 w-36 px-1"
                  />
                </form>
                {tags.length > 0 && (
                  <div className="flex gap-1 overflow-x-auto no-scrollbar shrink-0">
                    {tags.map((t) => (
                      <span
                        key={t}
                        onClick={() => removeTag(t)}
                        className="text-[9px] px-1.5 py-0.2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 hover:border-red-500 text-zinc-600 dark:text-zinc-400 hover:text-red-500 cursor-pointer rounded"
                        title="Remove tag"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Note Body Editor Panel */}
            <div className="flex-1 overflow-hidden min-h-0 select-text">
              {editMode === "edit" ? (
                <textarea
                  value={content}
                  onChange={(e) => onContentChange(e.target.value)}
                  placeholder="Write documentation, checklists, or notes in Markdown syntax..."
                  className="w-full h-full bg-transparent border-0 outline-none p-5 text-sm text-zinc-750 dark:text-zinc-200 placeholder-zinc-400 resize-none font-sans overflow-y-auto focus:ring-0"
                />
              ) : (
                <div
                  className="w-full h-full p-5 overflow-y-auto select-text prose prose-invert max-w-none prose-sm"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none text-zinc-400 dark:text-zinc-500 font-mono text-xs gap-3">
            <BookOpen className="h-8 w-8 text-zinc-300 dark:text-zinc-750" />
            <div>
              <span>NO ACTIVE NOTE SELECTED</span>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-sans mt-1">
                Select a document from the left directory or provision a new slate.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleCreateNote} className="mt-1">
              Create Note
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};
