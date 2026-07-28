/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, X, Laptop, Sparkles, CheckCircle2 } from "lucide-react";
import { 
  canInstallPWA, 
  isStandalonePWA, 
  promptPWAInstall, 
  subscribePWAInstall 
} from "../registerServiceWorker";

export const PWAInstallPrompt: React.FC = () => {
  const [canInstall, setCanInstall] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem("devvault_pwa_prompt_dismissed") === "true";
  });
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const updateInstallability = () => {
      setCanInstall(canInstallPWA() && !isStandalonePWA());
    };

    updateInstallability();
    const unsubscribe = subscribePWAInstall(updateInstallability);
    return () => unsubscribe();
  }, []);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const installed = await promptPWAInstall();
      if (installed) {
        setCanInstall(false);
      }
    } finally {
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("devvault_pwa_prompt_dismissed", "true");
  };

  if (!canInstall || dismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 max-w-sm w-full p-4 rounded-2xl bg-white/90 dark:bg-zinc-950/90 border border-zinc-200 dark:border-zinc-800 shadow-2xl backdrop-blur-xl text-zinc-900 dark:text-zinc-100 font-sans select-none"
      >
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-500/10 blur-xl pointer-events-none rounded-full" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-500 shrink-0">
              <Laptop className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs flex items-center gap-1.5">
                Install DevVault App
                <span className="px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-500 border border-brand-500/20 text-[9px] font-mono">PWA</span>
              </h4>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                Install DevVault as a standalone desktop app with full offline support.
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg transition-colors cursor-pointer"
            title="Dismiss prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 mt-3.5 pt-3 border-t border-zinc-100 dark:border-zinc-900">
          <button
            onClick={handleInstall}
            disabled={installing}
            className="flex-1 py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(79,70,229,0.3)] cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            {installing ? "Installing..." : "Install Standalone App"}
          </button>
          <button
            onClick={handleDismiss}
            className="py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Later
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
