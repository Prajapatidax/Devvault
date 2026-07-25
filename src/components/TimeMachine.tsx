import React, { useState, useEffect } from "react";
import {
  Clock,
  Pin,
  Trash2,
  RotateCcw,
  Plus,
  ChevronRight,
  GitCommit,
  GitBranch,
  X,
  Eye,
  Info,
  Loader2
} from "lucide-react";
import { useAuth } from "./AuthContext";
import { useToast, Button, Badge } from "./UI";

// Line diff interface
interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
  leftLineNum?: number;
  rightLineNum?: number;
}

// LCS-based line diffing algorithm
function computeLineDiff(textA: string, textB: string): DiffLine[] {
  const linesA = textA.split("\n");
  const linesB = textB.split("\n");
  const n = linesA.length;
  const m = linesB.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (linesA[i - 1] === linesB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const diff: DiffLine[] = [];
  let i = n, j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
      diff.unshift({
        type: "unchanged",
        content: linesA[i - 1],
        leftLineNum: i,
        rightLineNum: j
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.unshift({
        type: "added",
        content: linesB[j - 1],
        rightLineNum: j
      });
      j--;
    } else {
      diff.unshift({
        type: "removed",
        content: linesA[i - 1],
        leftLineNum: i
      });
      i--;
    }
  }

  return diff;
}

interface TimeMachinePanelProps {
  resourceId: string;
  resourceType: "project" | "note" | "secret" | "snippet" | "tracker";
  currentResourceData: any; // Used to compare against snapshots
  onRestore: (restoredData: any) => void;
  onClose: () => void;
}

export const TimeMachinePanel: React.FC<TimeMachinePanelProps> = ({
  resourceId,
  resourceType,
  currentResourceData,
  onRestore,
  onClose
}) => {
  const { apiFetch } = useAuth();
  const { toast } = useToast();
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState("");
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<any | null>(null);
  const [comparingData, setComparingData] = useState<any | null>(null);
  const [loadingCompare, setLoadingCompare] = useState(false);

  const fetchSnapshots = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/snapshots?resourceId=${resourceId}`);
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data);
      }
    } catch (e) {
      console.error("Failed to load snapshots:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshots();
  }, [resourceId]);

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSavingSnapshot(true);
    try {
      const res = await apiFetch("/api/snapshots", {
        method: "POST",
        body: JSON.stringify({
          resourceId,
          resourceType,
          description: `Manual: ${description.trim()}`
        })
      });
      if (res.ok) {
        toast("Manual snapshot saved successfully!", "success");
        setDescription("");
        fetchSnapshots();
      } else {
        toast("Failed to create snapshot", "error");
      }
    } catch (err) {
      toast("Error creating snapshot", "error");
    } finally {
      setSavingSnapshot(false);
    }
  };

  const handleViewDiff = async (snapshot: any) => {
    setLoadingCompare(true);
    setSelectedSnapshot(snapshot);
    try {
      const res = await apiFetch(`/api/snapshots/${snapshot.id}`);
      if (res.ok) {
        const data = await res.json();
        setComparingData(data.rawData);
      } else {
        toast("Failed to fetch snapshot details", "error");
      }
    } catch (err) {
      toast("Error loading snapshot details", "error");
    } finally {
      setLoadingCompare(false);
    }
  };

  const handleRestore = async (snapshotId: string) => {
    if (!window.confirm("Are you sure you want to restore this version? This will overwrite the current state and save a backup of it first.")) return;

    try {
      const res = await apiFetch(`/api/snapshots/${snapshotId}/restore`, {
        method: "POST"
      });
      if (res.ok) {
        const resData = await res.json();
        toast("Version restored successfully!", "success");
        onRestore(resData.restoredData);
        setSelectedSnapshot(null);
        setComparingData(null);
        fetchSnapshots();
      } else {
        toast("Failed to restore snapshot", "error");
      }
    } catch (err) {
      toast("Error restoring snapshot", "error");
    }
  };

  const handleDeleteSnapshot = async (snapshotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Delete this snapshot permanently?")) return;

    try {
      const res = await apiFetch(`/api/snapshots/${snapshotId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast("Snapshot deleted successfully", "success");
        if (selectedSnapshot?.id === snapshotId) {
          setSelectedSnapshot(null);
          setComparingData(null);
        }
        fetchSnapshots();
      } else {
        toast("Failed to delete snapshot", "error");
      }
    } catch (err) {
      toast("Error deleting snapshot", "error");
    }
  };

  // Convert resource data to a text format for diffing
  const getResourceAsText = (data: any): string => {
    if (!data) return "";
    if (resourceType === "note") {
      return data.content || "";
    }
    if (resourceType === "snippet") {
      return data.code || "";
    }
    // For structured configs, clean JSON serialization
    const copy = { ...data };
    delete copy.id;
    delete copy.userId;
    delete copy.createdAt;
    delete copy.updatedAt;
    return JSON.stringify(copy, null, 2);
  };

  const currentText = getResourceAsText(currentResourceData);
  const compareText = getResourceAsText(comparingData);
  const diffLines = computeLineDiff(compareText, currentText);

  return (
    <div className="flex h-full border-l border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-950/50 backdrop-blur-md select-none font-sans">
      {/* 1. Timeline / Snapshot List View */}
      <div className="w-80 flex flex-col h-full border-r border-zinc-200 dark:border-zinc-850">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-850 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            <span className="font-bold text-sm tracking-tight text-zinc-800 dark:text-white">Time Machine</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-650 dark:hover:text-white cursor-pointer"
            title="Close Panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Manual snapshot form */}
        <form onSubmit={handleCreateSnapshot} className="p-3 border-b border-zinc-200 dark:border-zinc-850 bg-zinc-50/50 dark:bg-zinc-900/10">
          <div className="flex gap-2">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Label manual milestone..."
              className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-orange-500 placeholder-zinc-400"
            />
            <button
              type="submit"
              disabled={savingSnapshot || !description.trim()}
              className="p-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center cursor-pointer shrink-0"
              title="Create Snapshot"
            >
              {savingSnapshot ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </button>
          </div>
        </form>

        {/* Snapshot Timeline Tree */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin text-orange-500 mb-2" />
              <span className="text-xs">Reading timeline events...</span>
            </div>
          ) : snapshots.length === 0 ? (
            <div className="text-center py-12 text-zinc-450 dark:text-zinc-500">
              <GitBranch className="h-8 w-8 text-zinc-300 dark:text-zinc-800 mx-auto mb-2" />
              <span className="text-xs">No version snapshots saved.</span>
            </div>
          ) : (
            <div className="relative pl-4 flex flex-col gap-5 border-l-2 border-zinc-200 dark:border-zinc-800">
              {snapshots.map((snap, index) => {
                const isSelected = selectedSnapshot?.id === snap.id;
                const isAuto = snap.metadata.description.startsWith("Auto-saved");
                return (
                  <div
                    key={snap.id}
                    onClick={() => handleViewDiff(snap)}
                    className={`relative cursor-pointer group rounded-lg p-2.5 transition-all ${
                      isSelected
                        ? "bg-orange-500/5 border border-orange-500/20 text-orange-600 dark:text-orange-400"
                        : "hover:bg-zinc-100/60 dark:hover:bg-zinc-900/30 border border-transparent"
                    }`}
                  >
                    {/* Node circle on timeline */}
                    <div
                      className={`absolute -left-[23px] top-4.5 w-3.5 h-3.5 rounded-full border-2 bg-white dark:bg-zinc-950 transition-colors ${
                        isSelected
                          ? "border-orange-500 bg-orange-500"
                          : "border-zinc-300 dark:border-zinc-700 group-hover:border-orange-500"
                      }`}
                    />

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono text-zinc-400">
                          {new Date(snap.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <Badge variant={isAuto ? "gray" : "orange"} className="text-[8px] px-1 py-0 select-none">
                          {isAuto ? "Auto" : "Manual"}
                        </Badge>
                      </div>

                      <span className="text-xs font-semibold leading-tight text-zinc-700 dark:text-zinc-250 truncate">
                        {snap.metadata.description.replace(/^(Manual|Auto-saved):\s*/, "")}
                      </span>

                      <div className="flex items-center justify-between text-[9px] text-zinc-400 dark:text-zinc-550 mt-1">
                        <span className="truncate max-w-[120px]">{snap.metadata.authorName}</span>
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleDeleteSnapshot(snap.id, e)}
                            className="p-0.5 rounded text-zinc-450 hover:text-red-500 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                            title="Delete Snapshot"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2. Visual Diff Viewer Panel */}
      <div className="flex-1 flex flex-col h-full bg-zinc-50 dark:bg-zinc-950">
        {selectedSnapshot ? (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header / Meta */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-950 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500">
                  <GitCommit className="h-4.5 w-4.5" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-100 truncate">
                    Comparing Version Snapshot
                  </span>
                  <span className="text-[10px] text-zinc-500 truncate mt-0.5">
                    Saved by {selectedSnapshot.metadata.authorName} ({selectedSnapshot.metadata.authorEmail}) on {new Date(selectedSnapshot.metadata.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => handleRestore(selectedSnapshot.id)}
                  size="sm"
                  className="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Restore This Version
                </Button>
                <button
                  onClick={() => {
                    setSelectedSnapshot(null);
                    setComparingData(null);
                  }}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-650 dark:hover:text-white cursor-pointer"
                  title="Close Diff"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Info bar */}
            <div className="px-4.5 py-1.5 border-b border-zinc-200 dark:border-zinc-850 bg-amber-500/5 text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5 shrink-0 select-none">
              <Info className="h-3.5 w-3.5" />
              <span>Showing line additions (green) and deletions (red) compared to the active record.</span>
            </div>

            {/* Diff content list */}
            <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed select-text">
              {loadingCompare ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                  <Loader2 className="h-5 w-5 animate-spin text-orange-500 mb-2" />
                  <span>Generating diff comparisons...</span>
                </div>
              ) : (
                <div className="border border-zinc-200 dark:border-zinc-850 rounded-lg overflow-hidden bg-white dark:bg-zinc-950">
                  {diffLines.length === 0 ? (
                    <div className="p-8 text-center text-zinc-400 dark:text-zinc-500">
                      No changes detected. Snapshot matches current version exactly.
                    </div>
                  ) : (
                    diffLines.map((line, idx) => {
                      let lineClass = "text-zinc-700 dark:text-zinc-300";
                      let prefix = " ";
                      if (line.type === "added") {
                        lineClass = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-l-4 border-emerald-500";
                        prefix = "+";
                      } else if (line.type === "removed") {
                        lineClass = "bg-red-500/10 text-red-700 dark:text-red-400 border-l-4 border-red-500";
                        prefix = "-";
                      }
                      return (
                        <div
                          key={idx}
                          className={`flex items-start px-3 py-0.5 border-b border-zinc-100/50 dark:border-zinc-900/50 whitespace-pre-wrap ${lineClass}`}
                        >
                          {/* Line numbers column */}
                          <div className="w-10 shrink-0 text-right pr-3 select-none text-zinc-400 font-mono text-[10px]">
                            {line.type === "removed" ? line.leftLineNum : line.type === "added" ? "" : line.leftLineNum}
                          </div>
                          <div className="w-10 shrink-0 text-right pr-3 select-none border-r border-zinc-200 dark:border-zinc-850 text-zinc-400 font-mono text-[10px]">
                            {line.type === "removed" ? "" : line.type === "added" ? line.rightLineNum : line.rightLineNum}
                          </div>
                          {/* Code Content */}
                          <div className="pl-3 flex-1 font-mono break-all whitespace-pre-wrap select-text">
                            <span className="select-none font-bold mr-1">{prefix}</span>
                            {line.content}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none">
            <Eye className="h-10 w-10 text-zinc-300 dark:text-zinc-800 mb-2 animate-bounce" />
            <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-400">Preview Differences</h3>
            <p className="text-[10px] text-zinc-400 mt-1 max-w-[240px]">
              Select a snapshot version on the left timeline to visualize line differences and restore historic states.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
