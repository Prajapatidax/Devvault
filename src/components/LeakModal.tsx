import React, { useState } from "react";
import { AlertTriangle, ShieldCheck, Download, Eye, EyeOff, ShieldAlert, X } from "lucide-react";
import { ScanResult } from "../utils/leakScanner";
import { Button, Badge } from "./UI";

interface LeakModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaks: ScanResult[];
  onConfirmDownload: (mask: boolean) => void;
}

export const LeakModal: React.FC<LeakModalProps> = ({
  isOpen,
  onClose,
  leaks,
  onConfirmDownload
}) => {
  const [exportOption, setExportOption] = useState<"mask" | "raw">("mask");
  const [revealSecrets, setRevealSecrets] = useState<{ [key: number]: boolean }>({});

  if (!isOpen) return null;

  const toggleReveal = (idx: number) => {
    setRevealSecrets((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="red" className="uppercase font-mono text-[8px]">Critical</Badge>;
      case "high":
        return <Badge variant="orange" className="uppercase font-mono text-[8px]">High</Badge>;
      case "medium":
        return <Badge variant="yellow" className="uppercase font-mono text-[8px]">Medium</Badge>;
      default:
        return <Badge variant="blue" className="uppercase font-mono text-[8px]">Low</Badge>;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmDownload(exportOption === "mask");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] z-10 font-sans select-none">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-850 bg-red-500/5 text-red-600 dark:text-red-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span className="font-bold text-sm tracking-tight">Security Leak Alert</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-400">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          <p className="text-xs text-zinc-650 dark:text-zinc-400 leading-relaxed">
            DevVault's local scanner detected <strong>{leaks.length} potential credential leak(s)</strong> in the database backup package. Review the details below before downloading.
          </p>

          {/* Leaks list */}
          <div className="border border-zinc-200 dark:border-zinc-850 rounded-lg max-h-48 overflow-y-auto divide-y divide-zinc-150 dark:divide-zinc-900 bg-zinc-50/50 dark:bg-zinc-950/20">
            {leaks.map((leak, idx) => {
              const revealed = !!revealSecrets[idx];
              const masked = leak.matchedText.substring(0, 4) + "*".repeat(Math.max(4, leak.matchedText.length - 8)) + leak.matchedText.substring(Math.max(4, leak.matchedText.length - 4));
              return (
                <div key={idx} className="p-2.5 flex items-start justify-between gap-3 text-xs">
                  <div className="flex flex-col gap-1 overflow-hidden">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-zinc-800 dark:text-zinc-150">{leak.ruleName}</span>
                      {getSeverityBadge(leak.severity)}
                      <span className="text-[10px] text-zinc-400 font-mono">Line {leak.lineNumber}</span>
                    </div>
                    <span className="font-mono text-[11px] text-zinc-600 dark:text-zinc-350 break-all select-all">
                      {revealed ? leak.matchedText : masked}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleReveal(idx)}
                    className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 shrink-0 cursor-pointer"
                  >
                    {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Export Options */}
          <div className="flex flex-col gap-2 border-t border-zinc-200 dark:border-zinc-900 pt-3">
            <span className="text-[10px] font-bold text-zinc-400 font-mono tracking-wider uppercase select-none">EXPORT REMEDIATION CHOICE</span>
            
            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              exportOption === "mask"
                ? "bg-emerald-500/5 border-emerald-500/30 text-emerald-700 dark:text-emerald-450"
                : "border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900/10"
            }`}>
              <input
                type="radio"
                name="leakOption"
                checked={exportOption === "mask"}
                onChange={() => setExportOption("mask")}
                className="mt-0.5 text-emerald-500 focus:ring-emerald-500"
              />
              <div className="flex flex-col text-xs leading-tight">
                <span className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" /> Mask Sensitive Leaks (Recommended)
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Replaces key values with <code>[MASKED_BY_DETECTOR]</code> in the JSON export, keeping your backup clean of plain secrets.
                </span>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
              exportOption === "raw"
                ? "bg-red-500/5 border-red-500/30 text-red-700 dark:text-red-450"
                : "border-zinc-200 dark:border-zinc-850 hover:bg-zinc-50 dark:hover:bg-zinc-900/10"
            }`}>
              <input
                type="radio"
                name="leakOption"
                checked={exportOption === "raw"}
                onChange={() => setExportOption("raw")}
                className="mt-0.5 text-red-500 focus:ring-red-500"
              />
              <div className="flex flex-col text-xs leading-tight">
                <span className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-red-500" /> Download Anyway (Risky)
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Downloads the backup in raw JSON form with secrets fully exposed in plaintext.
                </span>
              </div>
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-zinc-200 dark:border-zinc-900 pt-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel Export
            </Button>
            <Button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white cursor-pointer">
              <Download className="h-3.5 w-3.5 mr-1.5" /> Download Backup Package
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
