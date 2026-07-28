/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { WifiOff, Wifi, ShieldCheck, Zap } from "lucide-react";

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  });
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 backdrop-blur-xl text-amber-600 dark:text-amber-400 font-sans text-xs shadow-xl flex items-center gap-2.5 select-none"
        >
          <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span className="font-semibold">Working Offline</span>
          <span className="text-zinc-400 dark:text-zinc-500">•</span>
          <span className="text-[11px] text-zinc-600 dark:text-zinc-350 hidden sm:inline">
            Local AES-256 vault active. Edits are saved on device.
          </span>
        </motion.div>
      )}

      {showReconnected && isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 backdrop-blur-xl text-emerald-600 dark:text-emerald-400 font-sans text-xs shadow-xl flex items-center gap-2.5 select-none"
        >
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <Wifi className="h-3.5 w-3.5 shrink-0" />
          <span className="font-semibold">Network Reconnected</span>
          <span className="text-zinc-400 dark:text-zinc-500">•</span>
          <span className="text-[11px] text-zinc-600 dark:text-zinc-350 hidden sm:inline">
            Workspace online sync active.
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
