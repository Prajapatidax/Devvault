import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  FolderGit2,
  KeyRound,
  FileCode2,
  FileText,
  Github,
  Bug,
  Pin,
  Clock,
  CornerDownLeft,
  X,
  Sparkles,
  Command
} from "lucide-react";
import { getAllSearchItems, fuzzySearch, SearchItem, SearchResult } from "../utils/searchEngine";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string, resourceId?: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate
}) => {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "project" | "secret" | "note" | "snippet" | "tracker" | "task">("all");
  const [allItems, setAllItems] = useState<SearchItem[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Load items when palette is open
  useEffect(() => {
    if (isOpen) {
      getAllSearchItems().then((items) => {
        setAllItems(items);
      });
      // Load recent queries & pins from localStorage
      try {
        const storedRecents = localStorage.getItem("devvault_recent_searches");
        if (storedRecents) setRecentQueries(JSON.parse(storedRecents));

        const storedPins = localStorage.getItem("devvault_pinned_searches");
        if (storedPins) setPinnedIds(JSON.parse(storedPins));
      } catch (e) {
        console.error("Failed to load search settings:", e);
      }
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Run search when query or items change
  useEffect(() => {
    let filteredItems = allItems;
    if (filter !== "all") {
      filteredItems = allItems.filter((item) => item.resourceType === filter);
    }

    const searchResults = fuzzySearch(filteredItems, query);
    setResults(searchResults);
    setSelectedIndex(0);
  }, [query, allItems, filter]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, results.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(1, results.length));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex].item);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector("[data-active='true']");
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  const handleSelect = (item: SearchItem) => {
    // Save to recents
    const cleanQuery = query.trim();
    if (cleanQuery && !recentQueries.includes(cleanQuery)) {
      const newRecents = [cleanQuery, ...recentQueries.slice(0, 4)];
      setRecentQueries(newRecents);
      localStorage.setItem("devvault_recent_searches", JSON.stringify(newRecents));
    }

    // Determine target tab
    let tab = "dashboard";
    if (item.resourceType === "project") tab = "projects";
    else if (item.resourceType === "secret") tab = "secrets";
    else if (item.resourceType === "note") tab = "notes";
    else if (item.resourceType === "snippet") tab = "snippets";
    else if (item.resourceType === "tracker") tab = "github";
    else if (item.resourceType === "task") tab = "bugs";

    onNavigate(tab, item.resourceId);
    onClose();
  };

  const togglePin = (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let newPins;
    if (pinnedIds.includes(itemId)) {
      newPins = pinnedIds.filter((id) => id !== itemId);
    } else {
      newPins = [...pinnedIds, itemId];
    }
    setPinnedIds(newPins);
    localStorage.setItem("devvault_pinned_searches", JSON.stringify(newPins));
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "project":
        return <FolderGit2 className="h-4 w-4 text-orange-500" />;
      case "secret":
        return <KeyRound className="h-4 w-4 text-emerald-500" />;
      case "snippet":
        return <FileCode2 className="h-4 w-4 text-indigo-500" />;
      case "note":
        return <FileText className="h-4 w-4 text-amber-500" />;
      case "tracker":
        return <Github className="h-4 w-4 text-zinc-400 dark:text-white" />;
      case "task":
        return <Bug className="h-4 w-4 text-red-500" />;
      default:
        return <Search className="h-4 w-4 text-zinc-400" />;
    }
  };

  // Helper to render title with matching text highlighted
  const renderHighlightedText = (text: string, indices: [number, number][] | undefined) => {
    if (!indices || indices.length === 0) return <span>{text}</span>;

    // Flatten and sort indices to make sure we process sequentially
    const sortedIndices = [...indices].sort((a, b) => a[0] - b[0]);
    const elements: React.ReactNode[] = [];
    let lastIdx = 0;

    sortedIndices.forEach(([start, length], idx) => {
      // Add text before match
      if (start > lastIdx) {
        elements.push(<span key={`text-${idx}`}>{text.substring(lastIdx, start)}</span>);
      }
      // Add matched highlighted text
      elements.push(
        <mark
          key={`mark-${idx}`}
          className="bg-orange-500/20 text-orange-600 dark:text-orange-400 font-semibold rounded-xs px-0.5"
        >
          {text.substring(start, start + length)}
        </mark>
      );
      lastIdx = start + length;
    });

    if (lastIdx < text.length) {
      elements.push(<span key="text-end">{text.substring(lastIdx)}</span>);
    }

    return <div className="flex items-center gap-1 flex-wrap">{elements}</div>;
  };

  // Split results into Pinned and Unpinned
  const pinnedResults = results.filter((r) => pinnedIds.includes(r.item.id));
  const unpinnedResults = results.filter((r) => !pinnedIds.includes(r.item.id));
  const displayResults = [...pinnedResults, ...unpinnedResults];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4">
          {/* Backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[70vh] z-10 font-sans"
          >
            {/* Search Input Box */}
            <div className="flex items-center gap-3 px-4.5 py-4 border-b border-zinc-250 dark:border-zinc-850">
              <Search className="h-5 w-5 text-zinc-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects, secrets, notes, snippets, trackers..."
                className="flex-1 bg-transparent text-sm text-zinc-800 dark:text-zinc-150 outline-none border-none placeholder-zinc-400"
              />
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-400 font-mono select-none">
                <Command className="h-3 w-3" />
                <span>K</span>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-1 px-4.5 py-2 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-900 overflow-x-auto select-none scrollbar-none">
              {(
                [
                  { id: "all", label: "All" },
                  { id: "project", label: "Projects" },
                  { id: "secret", label: "Secrets" },
                  { id: "note", label: "Notes" },
                  { id: "snippet", label: "Snippets" },
                  { id: "tracker", label: "Trackers" },
                  { id: "task", label: "Tasks" }
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                    filter === f.id
                      ? "bg-orange-500/10 text-orange-500 dark:text-orange-400 font-bold"
                      : "text-zinc-550 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Results Window */}
            <div
              ref={listRef}
              className="flex-1 overflow-y-auto p-2 min-h-[150px] max-h-[450px]"
            >
              {displayResults.length === 0 ? (
                /* Empty state / Recents list */
                query.trim() === "" && recentQueries.length > 0 ? (
                  <div className="p-3">
                    <span className="text-[10px] font-bold font-mono tracking-wider text-zinc-400 uppercase flex items-center gap-1.5 mb-2">
                      <Clock className="h-3 w-3" /> Recent Searches
                    </span>
                    <div className="flex flex-col gap-1">
                      {recentQueries.map((q) => (
                        <button
                          key={q}
                          onClick={() => setQuery(q)}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left font-semibold text-zinc-650 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
                        >
                          <Search className="h-3.5 w-3.5 text-zinc-450" />
                          <span>{q}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Sparkles className="h-8 w-8 text-zinc-300 dark:text-zinc-800 mb-2 animate-pulse" />
                    <span className="text-xs text-zinc-500 dark:text-zinc-500">
                      No matching records found.
                    </span>
                  </div>
                )
              ) : (
                /* List Items */
                <div className="flex flex-col gap-0.5">
                  {displayResults.map((res, index) => {
                    const isActive = index === selectedIndex;
                    const isPinned = pinnedIds.includes(res.item.id);
                    const titleMatches = res.matches.find((m) => m.key === "title")?.indices;

                    return (
                      <div
                        key={res.item.id}
                        data-active={isActive}
                        onClick={() => handleSelect(res.item)}
                        className={`group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                          isActive
                            ? "bg-zinc-100/80 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/80"
                            : "hover:bg-zinc-50 dark:hover:bg-zinc-900/20 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 group-hover:bg-white dark:group-hover:bg-zinc-950 transition-colors">
                            {getResourceIcon(res.item.resourceType)}
                          </div>

                          <div className="flex flex-col overflow-hidden">
                            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 leading-tight">
                              {renderHighlightedText(res.item.title, titleMatches)}
                            </span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-0.5">
                              {res.item.subtitle}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons (Pin, Enter shortcut indicator) */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => togglePin(res.item.id, e)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isPinned
                                ? "bg-orange-500/10 border-orange-500/20 text-orange-500"
                                : "bg-transparent border-transparent text-zinc-400 hover:text-zinc-650 dark:hover:text-white"
                            }`}
                            title={isPinned ? "Unpin Search" : "Pin Search"}
                          >
                            <Pin className="h-3.5 w-3.5 fill-current" />
                          </button>

                          {isActive && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-150 dark:bg-zinc-900 text-[9px] font-mono text-zinc-400 select-none">
                              <span>Enter</span>
                              <CornerDownLeft className="h-2 w-2" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4.5 py-3 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-900 text-[10px] text-zinc-400 select-none">
              <div className="flex items-center gap-4">
                <span>↑↓ navigate</span>
                <span>↵ select</span>
                <span>esc close</span>
              </div>
              <span className="font-mono">Fuzzy Index Active</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
