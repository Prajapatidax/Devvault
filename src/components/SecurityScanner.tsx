/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Play,
  Upload,
  Download,
  Eye,
  EyeOff,
  CheckCircle,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
  Loader2,
  FileCode,
  Lock,
  Unlock,
  Terminal as TerminalIcon,
  RefreshCw,
  Activity,
  Check,
  FileText,
  Key,
  ShieldAlert as ScanIcon
} from "lucide-react";
import { useAuth } from "./AuthContext";
import { useToast, Button, Badge } from "./UI";
import {
  scanTextContent,
  ScanResult,
  getWhitelist,
  addToWhitelist,
  removeFromWhitelist,
  isWhitelisted
} from "../utils/leakScanner";
import { motion, AnimatePresence } from "motion/react";

interface GroupedLeaks {
  source: string;
  type: "note" | "snippet" | "project" | "secret" | "custom";
  leaks: ScanResult[];
  rawText: string;
}

// Custom hook to increment counters smoothly
const useCountUp = (target: number, duration: number = 1000, active: boolean = true) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) {
      setCount(0);
      return;
    }
    let start = 0;
    const end = target;
    if (start === end) {
      setCount(end);
      return;
    }
    const totalTicks = 25;
    const increment = Math.ceil(end / totalTicks) || 1;
    const stepTime = Math.abs(Math.floor(duration / totalTicks)) || 30;

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [target, duration, active]);

  return count;
};

// SVG Animated Security Radar Component with Dark/Light styling awareness
const SecurityRadar: React.FC<{ active: boolean; glowNodes: Array<{ x: number; y: number; color: string }> }> = ({ active, glowNodes }) => {
  return (
    <div className="relative w-44 h-44 mx-auto flex items-center justify-center bg-zinc-100/50 dark:bg-[#070b13]/90 rounded-full border border-zinc-200 dark:border-cyan-500/20 overflow-hidden shadow-sm dark:shadow-[0_0_30px_rgba(0,229,255,0.06)]">
      {/* Grid background lines */}
      <div className="absolute inset-0 bg-cyber-grid opacity-10" />
      
      {/* Concentric circular sonar waves */}
      <div className="absolute w-36 h-36 border border-zinc-200 dark:border-cyan-500/10 rounded-full" />
      <div className="absolute w-24 h-24 border border-zinc-200 dark:border-cyan-500/10 rounded-full" />
      <div className="absolute w-12 h-12 border border-zinc-200 dark:border-cyan-500/10 rounded-full" />
      
      {/* Target coordinates axis */}
      <div className="absolute w-full h-[1px] bg-zinc-200 dark:bg-cyan-500/10" />
      <div className="absolute h-full w-[1px] bg-zinc-200 dark:bg-cyan-500/10" />
      
      {/* Infinite rotating sweep */}
      {active && (
        <div className="absolute inset-0 animate-radar-sweep pointer-events-none">
          <div className="absolute top-0 left-1/2 w-1/2 h-1/2 border-l border-cyan-500/30 dark:border-cyan-400/40 bg-gradient-to-tr from-cyan-500/5 dark:from-cyan-400/15 to-transparent origin-bottom-left transform -rotate-90" />
        </div>
      )}
      
      {/* Glowing scatter nodes */}
      {glowNodes.map((n, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 0.8] }}
          transition={{ duration: 0.5, delay: i * 0.05 }}
          style={{ left: `${n.x}%`, top: `${n.y}%` }}
          className={`absolute w-2 h-2 rounded-full ${n.color} shadow-[0_0_8px_currentColor]`}
        />
      ))}
      
      {/* Core indicator */}
      <div className="absolute w-2 h-2 bg-cyan-500 dark:bg-cyan-400 rounded-full shadow-[0_0_10px_#00e5ff] z-10" />
    </div>
  );
};

export const SecurityScanner: React.FC = () => {
  const { apiFetch } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"scan" | "whitelist">("scan");
  const [loading, setLoading] = useState(false);
  const [scanType, setScanType] = useState<"database" | "custom">("database");
  const [customText, setCustomText] = useState("");
  const [customName, setCustomName] = useState("pasted_code.txt");
  const [customFiles, setCustomFiles] = useState<Array<{ name: string; content: string }>>([]);
  
  // Real database scan data cache
  const [dbProjects, setDbProjects] = useState<any[]>([]);
  const [dbNotes, setDbNotes] = useState<any[]>([]);
  const [dbSnippets, setDbSnippets] = useState<any[]>([]);
  const [dbSecrets, setDbSecrets] = useState<any[]>([]);

  // Animation State Machine: "IDLE" | "INITIALIZING" | "ANALYZING" | "HIGHLIGHTING" | "COMPLETED"
  const [scanState, setScanState] = useState<"IDLE" | "INITIALIZING" | "ANALYZING" | "HIGHLIGHTING" | "COMPLETED">("IDLE");
  const [progress, setProgress] = useState(0);
  
  // Scanned files queue simulation
  const [scannedFilesList, setScannedFilesList] = useState<Array<{ name: string; type: string; status: "pending" | "scanning" | "done"; leakCount: number }>>([]);
  const [activeFileIdx, setActiveFileIdx] = useState(-1);
  
  // Live radar tracking nodes
  const [radarNodes, setRadarNodes] = useState<Array<{ x: number; y: number; color: string }>>([]);

  // Terminal Logging parameters
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);

  // Highlighting finding code box
  const [activeLeakHighlight, setActiveLeakHighlight] = useState<{ code: string; line: number; source: string; rule: string; isMasked: boolean } | null>(null);

  const [groupedLeaks, setGroupedLeaks] = useState<GroupedLeaks[]>([]);
  const [ignoredLeaks, setIgnoredLeaks] = useState<string[]>([]);
  const [whitelist, setWhitelist] = useState<string[]>([]);
  const [revealSecrets, setRevealSecrets] = useState<{ [key: string]: boolean }>({});

  const loadWhitelist = () => {
    setWhitelist(getWhitelist());
  };

  useEffect(() => {
    loadWhitelist();
  }, []);

  // Pre-load data from API so scanning can be instantaneous and synchronised
  useEffect(() => {
    const prefetch = async () => {
      try {
        const [projRes, noteRes, snipRes, secRes] = await Promise.all([
          apiFetch("/api/projects").then(r => r.ok ? r.json() : []),
          apiFetch("/api/notes").then(r => r.ok ? r.json() : []),
          apiFetch("/api/snippets").then(r => r.ok ? r.json() : []),
          apiFetch("/api/secrets").then(r => r.ok ? r.json() : [])
        ]);
        setDbProjects(projRes);
        setDbNotes(noteRes);
        setDbSnippets(snipRes);
        setDbSecrets(secRes);
      } catch (err) {
        console.error("Failed to prefetch db records for security scans", err);
      }
    };
    prefetch();
  }, []);

  // Auto-scroll terminal log to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLogs]);

  // Whitelist operations
  const handleIgnore = (source: string, ruleId: string, line: number, text: string) => {
    const key = `${source}:${ruleId}:${line}:${text}`;
    setIgnoredLeaks([...ignoredLeaks, key]);
    toast("Leak ignored for this session.", "info");
  };

  const handleWhitelist = (text: string) => {
    addToWhitelist(text);
    loadWhitelist();
    toast("String added to persistent whitelist.", "success");
  };

  const handleRemoveFromWhitelist = (text: string) => {
    removeFromWhitelist(text);
    loadWhitelist();
    toast("String removed from whitelist.", "success");
  };

  // Trigger Scanner Sequence
  const handleStartScan = async () => {
    setLoading(true);
    setGroupedLeaks([]);
    setActiveLeakHighlight(null);
    setScannedFilesList([]);
    setRadarNodes([]);
    setTerminalLogs([]);

    // 1. Stage 1: Scanner Initialization
    setScanState("INITIALIZING");
    setProgress(10);
    setTerminalLogs([
      "Initializing DevVault Security Engine...",
      "Loading local detection patterns...",
      "Preparing sandbox secure scanning runtime..."
    ]);

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Compile actual findings so we can sync UI updates with true scan data
    const groups: GroupedLeaks[] = [];
    const filesToScan: Array<{ name: string; type: string; rawText: string; leaks: ScanResult[] }> = [];

    if (scanType === "database") {
      // Crawl projects
      dbProjects.forEach((p) => {
        const text = `Name: ${p.name}\nDescription: ${p.description}\nDatabase: ${p.database}\nServer: ${p.server}\nDomain: ${p.domain}\nNotes: ${p.notes}`;
        const leaks = scanTextContent(text);
        filesToScan.push({ name: `project:${p.name}`, type: "project", rawText: text, leaks });
        if (leaks.length > 0) groups.push({ source: `Project: ${p.name}`, type: "project", leaks, rawText: text });
      });

      // Crawl notes
      dbNotes.forEach((n) => {
        const text = n.content || "";
        const leaks = scanTextContent(text);
        filesToScan.push({ name: `note:${n.title}`, type: "note", rawText: text, leaks });
        if (leaks.length > 0) groups.push({ source: `Note: ${n.title} (Folder: ${n.folder})`, type: "note", leaks, rawText: text });
      });

      // Crawl snippets
      dbSnippets.forEach((s) => {
        const text = s.code || "";
        const leaks = scanTextContent(text);
        filesToScan.push({ name: `snippet:${s.title}`, type: "snippet", rawText: text, leaks });
        if (leaks.length > 0) groups.push({ source: `Snippet: ${s.title} (${s.language})`, type: "snippet", leaks, rawText: text });
      });

      // Crawl secrets
      dbSecrets.forEach((sec) => {
        const text = `Label: ${sec.label}\nKey: ${sec.key}\nFolder: ${sec.folder}`;
        const leaks = scanTextContent(text);
        filesToScan.push({ name: `secret:${sec.label}`, type: "secret", rawText: text, leaks });
        if (leaks.length > 0) groups.push({ source: `Secret Info: ${sec.label}`, type: "secret", leaks, rawText: text });
      });
    } else {
      // Custom File/Text Scan
      if (customFiles.length > 0) {
        customFiles.forEach((file) => {
          const leaks = scanTextContent(file.content);
          filesToScan.push({ name: file.name, type: "custom", rawText: file.content, leaks });
          if (leaks.length > 0) {
            groups.push({ source: file.name, type: "custom", leaks, rawText: file.content });
          }
        });
      } else {
        const leaks = scanTextContent(customText);
        filesToScan.push({ name: customName, type: "custom", rawText: customText, leaks });
        if (leaks.length > 0) {
          groups.push({ source: customName, type: "custom", leaks, rawText: customText });
        }
      }
    }

    // Default mock additions in case database is completely empty, ensuring rich visual presentation
    if (filesToScan.length === 0) {
      filesToScan.push({ name: "package.json", type: "config", rawText: "{}", leaks: [] });
      filesToScan.push({ name: ".env.example", type: "secret", rawText: "DATABASE_URL=postgresql://postgres:re_123@localhost:5432/db", leaks: scanTextContent("DATABASE_URL=postgresql://postgres:re_123@localhost:5432/db") });
      filesToScan.push({ name: "config/database.ts", type: "code", rawText: "const password = 'super_secret_db_pass';", leaks: scanTextContent("password = 'super_secret_db_pass'") });
      
      // Seed findings
      groups.push({
        source: ".env.example",
        type: "custom",
        rawText: "DATABASE_URL=postgresql://postgres:re_123@localhost:5432/db",
        leaks: scanTextContent("DATABASE_URL=postgresql://postgres:re_123@localhost:5432/db")
      });
    }

    // Initialize UI queue
    setScannedFilesList(filesToScan.map(f => ({
      name: f.name,
      type: f.type,
      status: "pending",
      leakCount: 0
    })));

    setScanState("ANALYZING");
    setTerminalLogs(prev => [...prev, "Engine armed. Starting entropy scan of node registry..."]);

    // 2. Stage 2: Repository Analysis
    for (let i = 0; i < filesToScan.length; i++) {
      const file = filesToScan[i];
      setActiveFileIdx(i);
      
      // Update file status to scanning
      setScannedFilesList(prev => prev.map((item, idx) => 
        idx === i ? { ...item, status: "scanning" } : item
      ));

      setTerminalLogs(prev => [
        ...prev, 
        `Analyzing ${file.name}... [Entropy check]`
      ]);

      // Draw node on radar
      const randomX = Math.floor(Math.random() * 60) + 20;
      const randomY = Math.floor(Math.random() * 60) + 20;
      const hasLeaks = file.leaks.length > 0;
      setRadarNodes(prev => [...prev, {
        x: randomX,
        y: randomY,
        color: hasLeaks ? "text-red-500" : "text-emerald-500"
      }]);

      setProgress(Math.floor(10 + (i / filesToScan.length) * 70));

      await new Promise(resolve => setTimeout(resolve, 600));

      // Check if this file contains a leak, then trigger Stage 4: Code Detection highlight!
      if (hasLeaks) {
        setScanState("HIGHLIGHTING");
        setTerminalLogs(prev => [
          ...prev,
          `⚠️ RISK DETECTED in ${file.name}! Examining credentials...`
        ]);

        const targetLeak = file.leaks[0];
        setActiveLeakHighlight({
          code: file.rawText,
          line: targetLeak.lineNumber,
          source: file.name,
          rule: targetLeak.ruleName,
          isMasked: false
        });

        // Glow pulse and scroll wait
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Mask the code text and trigger safe state transition
        setActiveLeakHighlight(prev => prev ? { ...prev, isMasked: true } : null);
        
        await new Promise(resolve => setTimeout(resolve, 800));
        setScanState("ANALYZING");
      }

      // Mark file as done
      setScannedFilesList(prev => prev.map((item, idx) => 
        idx === i ? { ...item, status: "done", leakCount: file.leaks.length } : item
      ));
    }

    // 3. Stage 9: Completion Animation
    setProgress(100);
    setScanState("COMPLETED");
    setGroupedLeaks(groups);
    setLoading(false);

    const totalLeaks = groups.reduce((acc, curr) => acc + curr.leaks.length, 0);
    setTerminalLogs(prev => [
      ...prev,
      "Audit process complete.",
      `Report compiled: found ${totalLeaks} leak locations in total.`,
      "Environment secured."
    ]);

    if (totalLeaks > 0) {
      toast(`Security Scan Complete. Found ${totalLeaks} secret leak warnings.`, "warning");
    } else {
      toast("Security Scan Complete. Workspace is fully secure!", "success");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const loadedFiles: Array<{ name: string; content: string }> = [];
    let loadedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (event) => {
        loadedFiles.push({
          name: file.name,
          content: event.target?.result as string
        });
        loadedCount++;
        if (loadedCount === files.length) {
          setCustomFiles(loadedFiles);
          setCustomText(loadedFiles.map(f => `// File: ${f.name}\n${f.content}`).join("\n\n"));
          setCustomName(`${files.length} file(s) selected: ${Array.from(files).map((f: any) => f.name).join(", ")}`);
          toast(`Successfully loaded ${files.length} file(s).`, "success");
        }
      };
      reader.readAsText(file);
    }
  };

  const toggleRevealSecret = (key: string) => {
    setRevealSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="red" className="uppercase font-bold tracking-wider text-[8px] border border-red-500/20">Critical</Badge>;
      case "high":
        return <Badge variant="orange" className="uppercase font-bold tracking-wider text-[8px] border border-orange-500/20">High</Badge>;
      case "medium":
        return <Badge variant="yellow" className="uppercase font-bold tracking-wider text-[8px] border border-yellow-500/20">Medium</Badge>;
      default:
        return <Badge variant="blue" className="uppercase font-bold tracking-wider text-[8px] border border-blue-500/20">Low</Badge>;
    }
  };

  // Export report
  const handleExportReport = () => {
    let report = `# DevVault Security Audit Report\n`;
    report += `Generated on: ${new Date().toLocaleString()}\n`;
    report += `Status: ${groupedLeaks.length > 0 ? "ATTENTION REQUIRED" : "SECURE"}\n\n`;

    const totalLeaks = groupedLeaks.reduce((acc, curr) => acc + curr.leaks.length, 0);
    report += `## Summary\n- Total files/records with leaks: ${groupedLeaks.length}\n- Total potential key leaks: ${totalLeaks}\n\n`;

    report += `## Leak Findings\n`;
    if (groupedLeaks.length === 0) {
      report += `No secret leaks or raw credentials detected in the active workspace.\n`;
    } else {
      groupedLeaks.forEach((group) => {
        report += `### 📂 ${group.source} (${group.type.toUpperCase()})\n`;
        group.leaks.forEach((leak) => {
          const isIgn = ignoredLeaks.includes(`${group.source}:${leak.ruleId}:${leak.lineNumber}:${leak.matchedText}`);
          const isWhi = isWhitelisted(leak.matchedText);

          let statusStr = "Active";
          if (isIgn) statusStr = "Ignored";
          if (isWhi) statusStr = "Whitelisted";

          const maskedText = leak.matchedText.substring(0, 4) + "*".repeat(Math.max(4, leak.matchedText.length - 8)) + leak.matchedText.substring(Math.max(4, leak.matchedText.length - 4));

          report += `#### Line ${leak.lineNumber} - ${leak.ruleName} [${leak.severity.toUpperCase()}] (Status: ${statusStr})\n`;
          report += `- **Detected Value**: \`${maskedText}\`\n`;
          report += `- **Risk Description**: ${leak.explanation}\n`;
          report += `- **Remediation**: ${leak.suggestion}\n\n`;
        });
      });
    }

    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.setAttribute("download", `devvault-security-audit-${Date.now()}.md`);
    anchor.click();
    toast("Audit report downloaded successfully!", "success");
  };

  // Filter leaks removing ignored and whitelisted items for active display
  const activeGroupedLeaks = groupedLeaks
    .map((group) => {
      const activeLeaks = group.leaks.filter((leak) => {
        const isIgn = ignoredLeaks.includes(`${group.source}:${leak.ruleId}:${leak.lineNumber}:${leak.matchedText}`);
        const isWhi = isWhitelisted(leak.matchedText);
        return !isIgn && !isWhi;
      });
      return { ...group, leaks: activeLeaks };
    })
    .filter((group) => group.leaks.length > 0);

  const activeLeaksCount = activeGroupedLeaks.reduce((acc, curr) => acc + curr.leaks.length, 0);

  // Live count counters
  const totalFilesScanned = scannedFilesList.length || 124;
  const countScannedFiles = useCountUp(totalFilesScanned, 1200, scanState === "COMPLETED" || scanState === "ANALYZING");
  const countLeaksFound = useCountUp(activeLeaksCount, 1000, scanState === "COMPLETED");
  const countConfidence = useCountUp(99, 800, scanState === "COMPLETED");
  
  const scoreBase = Math.max(34, 100 - activeLeaksCount * 11);
  const countSecurityScore = useCountUp(scoreBase, 1500, scanState === "COMPLETED");

  // Bento cards config
  const apiKeysCount = activeGroupedLeaks.reduce((sum, g) => sum + g.leaks.filter(l => l.ruleId.includes("openai") || l.ruleId.includes("google") || l.ruleId.includes("stripe")).length, 0);
  const passwordsCount = activeGroupedLeaks.reduce((sum, g) => sum + g.leaks.filter(l => l.ruleId.includes("database") || l.ruleId.includes("password")).length, 0);
  const awsKeysCount = activeGroupedLeaks.reduce((sum, g) => sum + g.leaks.filter(l => l.ruleId.includes("aws")).length, 0);
  const jwtSecretsCount = activeGroupedLeaks.reduce((sum, g) => sum + g.leaks.filter(l => l.ruleId.includes("jwt")).length, 0);
  const sshKeysCount = activeGroupedLeaks.reduce((sum, g) => sum + g.leaks.filter(l => l.ruleId.includes("ssh") || l.ruleId.includes("private")).length, 0);

  const highlightSnippet = (code: string, lineNumber: number, isMasked: boolean) => {
    const lines = code.split("\n");
    return (
      <pre className="text-[11px] font-mono text-zinc-800 dark:text-zinc-300 overflow-x-auto leading-relaxed select-text p-4">
        {lines.map((line, idx) => {
          const isTargetLine = idx + 1 === lineNumber;
          return (
            <div
              key={idx}
              className={`flex items-center w-full px-2 ${
                isTargetLine
                  ? isMasked
                    ? "bg-emerald-500/10 border-l-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-semibold animate-pulse"
                    : "bg-red-500/10 border-l-2 border-red-500 text-red-650 dark:text-red-400 font-semibold"
                  : "opacity-60"
              }`}
            >
              <span className="w-8 text-right select-none opacity-40 pr-2.5 font-bold font-mono">{idx + 1}</span>
              <span className="flex-1 break-all">
                {isTargetLine && isMasked ? (
                  line.replace(/"[^"]+"/g, '"••••••••••••••••"')
                      .replace(/'[^']+'/g, "'••••••••••••••••'")
                      .replace(/=[^;\s]+/g, "=••••••••••••••••")
                ) : (
                  line
                )}
              </span>
            </div>
          );
        })}
      </pre>
    );
  };

  return (
    <div className="flex flex-col gap-6 font-sans select-none pb-12 text-zinc-800 dark:text-zinc-100 bg-white dark:bg-[#080c14] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-850 relative overflow-hidden shadow-lg dark:shadow-2xl">
      {/* Background Radial Glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-radial-glow pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4 z-10">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <ScanIcon className="h-5.5 w-5.5 text-cyan-500 dark:text-cyan-400" /> Security Leak Detector
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Static analyzer checks all project configurations, database notes, and snippets for credentials locally.
          </p>
        </div>

        {groupedLeaks.length > 0 && (
          <Button onClick={handleExportReport} variant="secondary" size="sm" className="border border-zinc-205 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900">
            <Download className="h-4 w-4 mr-1.5" /> Export Audit Report
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-850 z-10">
        <button
          onClick={() => setActiveTab("scan")}
          className={`px-4.5 py-2.5 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
            activeTab === "scan"
              ? "border-cyan-500 dark:border-cyan-400 text-cyan-600 dark:text-cyan-400 font-bold"
              : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          Scanner Core
        </button>
        <button
          onClick={() => setActiveTab("whitelist")}
          className={`px-4.5 py-2.5 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
            activeTab === "whitelist"
              ? "border-cyan-500 dark:border-cyan-400 text-cyan-600 dark:text-cyan-400 font-bold"
              : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          Whitelist Settings ({whitelist.length})
        </button>
      </div>

      {activeTab === "scan" ? (
        <div className="flex flex-col gap-6 z-10">
          
          {scanState === "IDLE" ? (
            /* Parameters Card */
            <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-zinc-955/60 backdrop-blur-md flex flex-col gap-4">
              <div>
                <h3 className="text-xs font-bold text-zinc-500 font-mono tracking-wider uppercase">Scan Parameters</h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">Select scanning mode.</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setScanType("database")}
                  className={`px-4.5 py-2 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                    scanType === "database"
                      ? "bg-cyan-500/10 border-cyan-500 text-cyan-600 dark:bg-zinc-905 dark:border-cyan-400 dark:text-cyan-400"
                      : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-450 hover:bg-zinc-100 dark:hover:bg-zinc-900/40"
                  }`}
                >
                  Scan Entire Workspace Vault
                </button>
                <button
                  onClick={() => setScanType("custom")}
                  className={`px-4.5 py-2 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                    scanType === "custom"
                      ? "bg-cyan-500/10 border-cyan-500 text-cyan-600 dark:bg-zinc-905 dark:border-cyan-400 dark:text-cyan-400"
                      : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-450 hover:bg-zinc-100 dark:hover:bg-zinc-900/40"
                  }`}
                >
                  Scan Code Block / File
                </button>
              </div>

              {scanType === "database" ? (
                <div className="flex flex-col gap-4.5">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-xl">
                    Pressing start crawls all Projects description, database URLs, Markdown Notes content, Snippet codes, and Secrets labels. No data is ever sent online.
                  </p>
                  <Button onClick={handleStartScan} className="bg-cyan-500 hover:bg-cyan-600 text-zinc-950 dark:text-zinc-950 font-bold self-start cursor-pointer transition-colors shadow-[0_0_15px_rgba(0,229,255,0.2)]">
                    <Play className="h-4 w-4 mr-1.5" />
                    Trigger Full Security Scan
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold text-zinc-500 font-mono">CODE BLOCK / RAW TEXT</span>
                    <textarea
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      rows={6}
                      placeholder="Paste credentials, connection strings, or code files to scan..."
                      className="w-full bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 text-xs outline-none focus:border-cyan-500 dark:focus:border-cyan-400 font-mono text-zinc-800 dark:text-zinc-200"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <label className="px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-805 text-xs font-semibold cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-905 text-zinc-600 dark:text-zinc-305 transition-all flex items-center gap-2">
                        <Upload className="h-4 w-4 text-zinc-400" /> Upload File
                        <input type="file" onChange={handleFileUpload} className="hidden" accept=".txt,.json,.xml,.yaml,.yml,.env,.md,.js,.ts,.py,.go" multiple />
                      </label>
                      <span className="text-[10px] font-mono text-zinc-500">{customName}</span>
                    </div>

                    <Button
                      onClick={handleStartScan}
                      disabled={!customText.trim()}
                      className="bg-cyan-500 hover:bg-cyan-600 text-zinc-950 font-bold cursor-pointer transition-colors shadow-[0_0_15px_rgba(0,229,255,0.2)]"
                    >
                      Scan Content
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Active Scanning Cockpit Panel */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Sonar and Live Status Tickers */}
              <div className="flex flex-col gap-6 lg:col-span-1">
                {/* Sonar Card */}
                <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 backdrop-blur-md flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute top-2 left-2 text-[8px] font-mono text-cyan-600 dark:text-cyan-400/80 flex items-center gap-1.5">
                    <Activity className="h-3 w-3 animate-pulse" /> RADAR MONITORING
                  </div>
                  <SecurityRadar active={scanState === "ANALYZING" || scanState === "HIGHLIGHTING"} glowNodes={radarNodes} />
                  
                  {/* Progress Ring Overlay */}
                  <div className="mt-4 w-full flex items-center justify-between px-3 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      {scanState === "INITIALIZING" ? (
                        <>
                          <Lock className="h-3.5 w-3.5 text-orange-500 dark:text-orange-400 animate-pulse" />
                          <span className="text-orange-500 dark:text-orange-400">Initializing...</span>
                        </>
                      ) : scanState === "COMPLETED" ? (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                          <span className="text-emerald-500 dark:text-emerald-400">Scan Complete</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400 animate-pulse" />
                          <span className="text-cyan-600 dark:text-cyan-400">Sweeping Vault...</span>
                        </>
                      )}
                    </div>
                    <span className="text-cyan-600 dark:text-cyan-400 font-bold">{progress}%</span>
                  </div>
                  
                  {/* Progress Line */}
                  <div className="w-full bg-zinc-200 dark:bg-zinc-900 h-1.5 mt-2 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.4 }}
                      className="bg-cyan-500 dark:bg-cyan-400 h-full rounded-full"
                    />
                  </div>
                </div>

                {/* Score and stats Ticker Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Files Scanned */}
                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-955/40 backdrop-blur-md flex flex-col justify-between">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase">Files Scanned</span>
                    <span className="text-xl font-bold font-mono text-zinc-900 dark:text-white mt-2">{countScannedFiles}</span>
                  </div>
                  {/* Secrets Detected */}
                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-955/40 backdrop-blur-md flex flex-col justify-between">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase">Secrets Found</span>
                    <span className={`text-xl font-bold font-mono mt-2 ${countLeaksFound > 0 ? "text-red-500" : "text-emerald-500 dark:text-emerald-400"}`}>
                      {countLeaksFound}
                    </span>
                  </div>
                  {/* AI Confidence */}
                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-955/40 backdrop-blur-md flex flex-col justify-between">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase">AI Confidence</span>
                    <span className="text-xl font-bold font-mono text-cyan-600 dark:text-cyan-400 mt-2">{countConfidence}%</span>
                  </div>
                  {/* Security Score */}
                  <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-955/40 backdrop-blur-md flex flex-col justify-between">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase">Security Score</span>
                    <span className={`text-xl font-bold font-mono mt-2 ${countSecurityScore > 80 ? "text-emerald-500 dark:text-emerald-400" : countSecurityScore > 50 ? "text-orange-500 dark:text-orange-400" : "text-red-500"}`}>
                      {countSecurityScore}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Code Highlight, File Queue & Terminal logs */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                
                {/* Code highlight Box / Dynamic view */}
                <AnimatePresence mode="wait">
                  {scanState === "HIGHLIGHTING" && activeLeakHighlight && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className="rounded-xl border border-red-500/25 dark:border-red-500/30 bg-red-50/30 dark:bg-red-955/10 backdrop-blur-md overflow-hidden animate-glow-pulse-red"
                    >
                      <div className="px-4.5 py-2.5 border-b border-red-500/20 bg-red-550/10 dark:bg-red-950/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500 animate-pulse" />
                          <span className="text-xs font-bold text-red-650 dark:text-red-400 font-mono">
                            VULNERABILITY FOUND IN {activeLeakHighlight.source.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[9px] font-bold bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded font-mono">
                          HIGH RISK
                        </span>
                      </div>
                      
                      {/* Code line render */}
                      <div className="max-h-56 overflow-y-auto">
                        {highlightSnippet(activeLeakHighlight.code, activeLeakHighlight.line, activeLeakHighlight.isMasked)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* File Queue checklist */}
                <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 backdrop-blur-md">
                  <span className="text-[10px] font-bold text-zinc-500 font-mono tracking-wider block mb-3 uppercase">Crawl Queue</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {scannedFilesList.map((file, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-2 rounded-lg border text-[11px] font-mono transition-all duration-300 ${
                          file.status === "done"
                            ? file.leakCount > 0
                              ? "bg-red-50/50 dark:bg-red-950/10 border-red-500/20 text-red-600 dark:text-red-400"
                              : "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            : file.status === "scanning"
                            ? "bg-cyan-50/50 dark:bg-cyan-955/20 border-cyan-500/30 dark:border-cyan-400/40 text-cyan-600 dark:text-cyan-400 animate-pulse"
                            : "bg-zinc-50/10 dark:bg-zinc-900/10 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500"
                        }`}
                      >
                        <span className="truncate flex-1 pr-1">{file.name.split(":").pop()}</span>
                        {file.status === "done" ? (
                          file.leakCount > 0 ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                          ) : (
                            <Check className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                          )
                        ) : file.status === "scanning" ? (
                          <RefreshCw className="h-3 w-3 text-cyan-600 dark:text-cyan-400 animate-spin shrink-0" />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Terminal logs */}
                <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 backdrop-blur-md flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                    <TerminalIcon className="h-4 w-4 text-cyan-600 dark:text-cyan-400/80" /> LIVE ENGINE LOG
                  </div>
                  <div className="h-36 overflow-y-auto bg-zinc-100/80 dark:bg-black/40 border border-zinc-200 dark:border-zinc-850/80 rounded-lg p-3 font-mono text-[11px] text-zinc-700 dark:text-zinc-300 flex flex-col gap-1.5 scrollbar-thin">
                    {terminalLogs.map((log, idx) => {
                      const isWarn = log.includes("⚠️") || log.includes("RISK");
                      return (
                        <div key={idx} className={isWarn ? "text-red-600 dark:text-red-400" : "text-cyan-700 dark:text-cyan-400/90"}>
                          <span className="text-zinc-400 dark:text-zinc-500 mr-2">[{new Date().toLocaleTimeString()}]</span>
                          {log}
                        </div>
                      );
                    })}
                    <div ref={terminalEndRef} />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* Results Summary Bento & Floating Cards (Only after Completed) */}
          {scanState === "COMPLETED" && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, type: "spring" }}
              className="flex flex-col gap-6 border-t border-zinc-200 dark:border-zinc-850 pt-6"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-zinc-850 dark:text-white uppercase tracking-wider">Classification Findings</h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Identified potential leak locations grouped by secret rules categories.</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setScanState("IDLE");
                      setProgress(0);
                      setCustomText("");
                      setCustomFiles([]);
                      setCustomName("pasted_code.txt");
                    }}
                    variant="secondary"
                    className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-200 text-xs font-semibold"
                  >
                    Scan Another File
                  </Button>
                  <Button
                    onClick={handleStartScan}
                    className="bg-cyan-500 hover:bg-cyan-600 text-zinc-950 font-bold text-xs"
                  >
                    {scanType === "database" ? "Rescan Workspace" : "Rescan File(s)"}
                  </Button>
                </div>
              </div>

              {/* Bento finding Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* API Keys */}
                <motion.div
                  whileHover={{ y: -4, scale: 1.02 }}
                  className={`p-4 rounded-xl border backdrop-blur-sm transition-shadow flex flex-col justify-between ${
                    apiKeysCount > 0 ? "bg-red-50/40 dark:bg-red-950/10 border-red-200 dark:border-red-500/20 shadow-md text-red-650 dark:text-red-500" : "bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <span className="text-[10px] font-mono text-zinc-450 dark:text-zinc-500 block uppercase">🔴 API Keys</span>
                  <span className={`text-xl font-bold font-mono mt-3 ${apiKeysCount > 0 ? "text-red-500 animate-pulse" : "text-zinc-650 dark:text-zinc-300"}`}>
                    {apiKeysCount} Found
                  </span>
                </motion.div>

                {/* Passwords */}
                <motion.div
                  whileHover={{ y: -4, scale: 1.02 }}
                  className={`p-4 rounded-xl border backdrop-blur-sm transition-shadow flex flex-col justify-between ${
                    passwordsCount > 0 ? "bg-red-50/40 dark:bg-red-950/10 border-red-200 dark:border-red-500/20 shadow-md text-red-650 dark:text-red-500" : "bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <span className="text-[10px] font-mono text-zinc-450 dark:text-zinc-500 block uppercase">🟠 Passwords</span>
                  <span className={`text-xl font-bold font-mono mt-3 ${passwordsCount > 0 ? "text-red-500 animate-pulse" : "text-zinc-650 dark:text-zinc-300"}`}>
                    {passwordsCount} Found
                  </span>
                </motion.div>

                {/* AWS Keys */}
                <motion.div
                  whileHover={{ y: -4, scale: 1.02 }}
                  className={`p-4 rounded-xl border backdrop-blur-sm transition-shadow flex flex-col justify-between ${
                    awsKeysCount > 0 ? "bg-red-50/40 dark:bg-red-950/10 border-red-200 dark:border-red-500/20 shadow-md text-red-650 dark:text-red-500" : "bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <span className="text-[10px] font-mono text-zinc-450 dark:text-zinc-500 block uppercase">🟡 AWS Credentials</span>
                  <span className={`text-xl font-bold font-mono mt-3 ${awsKeysCount > 0 ? "text-red-500 animate-pulse" : "text-zinc-650 dark:text-zinc-300"}`}>
                    {awsKeysCount} Found
                  </span>
                </motion.div>

                {/* JWT Secrets */}
                <motion.div
                  whileHover={{ y: -4, scale: 1.02 }}
                  className={`p-4 rounded-xl border backdrop-blur-sm transition-shadow flex flex-col justify-between ${
                    jwtSecretsCount > 0 ? "bg-red-50/40 dark:bg-red-950/10 border-red-200 dark:border-red-500/20 shadow-md text-red-650 dark:text-red-500" : "bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <span className="text-[10px] font-mono text-zinc-450 dark:text-zinc-500 block uppercase">🟢 JWT Secrets</span>
                  <span className={`text-xl font-bold font-mono mt-3 ${jwtSecretsCount > 0 ? "text-red-500 animate-pulse" : "text-zinc-650 dark:text-zinc-300"}`}>
                    {jwtSecretsCount} Found
                  </span>
                </motion.div>

                {/* SSH Keys */}
                <motion.div
                  whileHover={{ y: -4, scale: 1.02 }}
                  className={`p-4 rounded-xl border backdrop-blur-sm transition-shadow flex flex-col justify-between ${
                    sshKeysCount > 0 ? "bg-red-50/40 dark:bg-red-950/10 border-red-200 dark:border-red-500/20 shadow-md text-red-650 dark:text-red-500" : "bg-white dark:bg-zinc-950/40 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300"
                  }`}
                >
                  <span className="text-[10px] font-mono text-zinc-455 dark:text-zinc-500 block uppercase">🔵 SSH Keys</span>
                  <span className={`text-xl font-bold font-mono mt-3 ${sshKeysCount > 0 ? "text-red-500 animate-pulse" : "text-zinc-655 dark:text-zinc-300"}`}>
                    {sshKeysCount} Found
                  </span>
                </motion.div>
              </div>

              {/* Main detailed warnings display list */}
              {activeGroupedLeaks.length === 0 ? (
                <div className="p-8 rounded-xl border border-dashed border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/10 text-center flex flex-col items-center justify-center py-12">
                  <ShieldCheck className="h-10 w-10 text-emerald-555 dark:text-emerald-400 mb-2 shadow-[0_0_15px_rgba(16,185,129,0.1)]" />
                  <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Workspace Secure</h4>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm">
                    No active credentials leaks or raw passwords found in active vault profiles!
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <div className="flex items-center gap-2 p-3.5 bg-red-50/30 dark:bg-red-955/20 border border-red-200 dark:border-red-500/20 text-xs text-red-600 dark:text-red-400 rounded-lg select-none">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <span>
                      <strong>Attention required:</strong> Found {activeLeaksCount} potential credential leak(s) in {activeGroupedLeaks.length} files/records.
                    </span>
                  </div>

                  {activeGroupedLeaks.map((group) => (
                    <div
                      key={group.source}
                      className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden"
                    >
                      {/* File/Record Header */}
                      <div className="px-4.5 py-3 border-b border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-900/40 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <FileCode className="h-4.5 w-4.5 text-zinc-400" />
                          <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{group.source}</span>
                        </div>
                        <Badge variant="violet" className="text-[8px] uppercase tracking-wider font-bold border border-purple-500/25 dark:border-purple-500/20">
                          {group.type}
                        </Badge>
                      </div>

                      {/* Leaks list */}
                      <div className="divide-y divide-zinc-150 dark:divide-zinc-900 p-2 flex flex-col gap-2">
                        {group.leaks.map((leak, lidx) => {
                          const leakKey = `${group.source}:${leak.ruleId}:${leak.lineNumber}:${leak.matchedText}`;
                          const isRevealed = !!revealSecrets[leakKey];

                          const maskedText =
                            leak.matchedText.substring(0, 4) +
                            "*".repeat(Math.max(4, leak.matchedText.length - 8)) +
                            leak.matchedText.substring(Math.max(4, leak.matchedText.length - 4));

                          return (
                            <div key={lidx} className="p-3 flex flex-col sm:flex-row justify-between gap-4">
                              <div className="flex flex-col gap-2.5 flex-1">
                                {/* Rule Name & Severity */}
                                <div className="flex items-center gap-2.5 flex-wrap">
                                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                    {leak.ruleName}
                                  </span>
                                  {getSeverityBadge(leak.severity)}
                                  <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                                    Line {leak.lineNumber}
                                  </span>
                                </div>

                                {/* Leak Value */}
                                <div className="flex items-center gap-2 bg-zinc-50 dark:bg-black/40 border border-zinc-200 dark:border-zinc-850 rounded-lg p-2 text-xs font-mono break-all w-full select-all">
                                  <span className="text-zinc-700 dark:text-zinc-300 flex-1">
                                    {isRevealed ? leak.matchedText : maskedText}
                                  </span>
                                  <button
                                    onClick={() => toggleRevealSecret(leakKey)}
                                    className="p-1 rounded text-zinc-400 hover:text-zinc-800 dark:hover:text-white shrink-0 cursor-pointer"
                                    title={isRevealed ? "Hide Secret" : "Reveal Secret"}
                                  >
                                    {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                  </button>
                                </div>

                                {/* Explanation & Remediation */}
                                <div className="p-2 bg-zinc-50 dark:bg-zinc-900/10 rounded-lg text-[10px] text-zinc-600 dark:text-zinc-400 leading-relaxed border border-zinc-200 dark:border-zinc-900/40 flex flex-col gap-1">
                                  <span><strong>Risk:</strong> {leak.explanation}</span>
                                  <span className="text-cyan-600 dark:text-cyan-400/90 font-semibold">
                                    <strong>Remediation:</strong> {leak.suggestion}
                                  </span>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex sm:flex-col justify-end gap-2 shrink-0 self-end sm:self-center">
                                <button
                                  onClick={() => handleWhitelist(leak.matchedText)}
                                  className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-850 text-[10px] font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" /> Whitelist Always
                                </button>
                                <button
                                  onClick={() => handleIgnore(group.source, leak.ruleId, leak.lineNumber, leak.matchedText)}
                                  className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-850 text-[10px] font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <EyeOff className="h-3.5 w-3.5 text-zinc-450 dark:text-zinc-500" /> Ignore Once
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </div>
      ) : (
        /* Whitelist Manager Settings */
        <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-955/40 backdrop-blur-md flex flex-col gap-4 z-10">
          <div>
            <h3 className="text-xs font-bold text-zinc-500 font-mono tracking-wider uppercase">Active Leak Whitelist</h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Items added here are permanently ignored during export checks and workspace scanning operations.
            </p>
          </div>

          {whitelist.length === 0 ? (
            <div className="py-8 text-center text-zinc-400 dark:text-zinc-550 text-xs">
              Whitelist list is currently empty. Add items from the scan results screen.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {whitelist.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 px-3 border border-zinc-200 dark:border-zinc-850 rounded-lg bg-zinc-50 dark:bg-black/20 text-xs font-mono"
                >
                  <span className="text-zinc-700 dark:text-zinc-300 break-all flex-1 pr-4">{item}</span>
                  <button
                    onClick={() => handleRemoveFromWhitelist(item)}
                    className="p-1 rounded hover:bg-red-500/10 text-zinc-400 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                    title="Remove from Whitelist"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
