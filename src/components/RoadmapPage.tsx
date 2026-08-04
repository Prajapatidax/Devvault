/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Sparkles,
  Search,
  History,
  ShieldAlert,
  Paintbrush,
  Brain,
  Terminal,
  LineChart,
  Copy,
  Cpu,
  Compass,
  Bug,
  MessageSquare,
  Activity,
  Clock,
  Lock,
  ChevronRight,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Layout,
  Move,
  Sliders,
  Grid
} from "lucide-react";
import { Button, useToast } from "./UI";
import { motion, AnimatePresence } from "motion/react";
import { ArtificialLogo } from "../App";

interface RoadmapPageProps {
  onBackToLanding: () => void;
  theme?: "light" | "dark" | "system";
  setTheme?: (theme: "light" | "dark" | "system") => void;
}

export const RoadmapPage: React.FC<RoadmapPageProps> = ({
  onBackToLanding,
  theme = "dark",
  setTheme
}) => {
  const { toast } = useToast();
  const [activePhase, setActivePhase] = useState<number | null>(null);

  // State machine for holographic vaporization wipeout
  const [hasSeenWipeout, setHasSeenWipeout] = useState<boolean>(() => {
    return localStorage.getItem("devvault_roadmap_saw_wipeout") === "true";
  });

  const [wipeState, setWipeState] = useState<"idle" | "wiping" | "collapsed">(
    localStorage.getItem("devvault_roadmap_saw_wipeout") === "true" ? "collapsed" : "idle"
  );



  const phases = [
    {
      num: 1,
      name: "Core Features",
      status: "Completed & Deployed",
      date: "18 July 2026",
      statusColor: "bg-emerald-500/10 text-emerald-650 dark:text-emerald-450 border-emerald-500/20",
      description: "Bedrock features and productivity enhancements for the local-first DevVault workspace.",
      features: [
        {
          title: "Search Bar",
          desc: "Global hotkey-activated search box (Ctrl+K) crawling projects, encrypted keys, notes, and tracker nodes instantly.",
          icon: <Search className="h-5 w-5 text-emerald-500" />
        },
        {
          title: "Time Machine",
          desc: "Granular local version history and commit trees for all secure resources, with offline diff previews.",
          icon: <History className="h-5 w-5 text-emerald-500" />
        },
        {
          title: "Secret Leak Detector",
          desc: "Static code scan that flags exposed API tokens, passwords, and database keys before they exit your system.",
          icon: <ShieldAlert className="h-5 w-5 text-emerald-500" />
        },
        {
          title: "UI Improve",
          desc: "Customizable warm templates, responsive dark/light modes, compact layouts, and fluid micro-transitions.",
          icon: <Paintbrush className="h-5 w-5 text-emerald-500" />
        }
      ]
    },
    {
      num: 2,
      name: "AI Revolution",
      status: "Planned",
      date: "20 September 2026",
      statusColor: "bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border-indigo-500/20",
      description: "Infusing the secure cockpit with semantic understanding and offline generative helpers.",
      features: [
        {
          title: "AI Memory",
          desc: "Full vector storage and semantic search across markdown files, configurations, code blocks, and vault databases.",
          icon: <Brain className="h-5 w-5 text-indigo-500" />
        },
        {
          title: "AI Project Architect",
          desc: "Instant system architecture maps and boilerplate configs matching your stack guidelines in seconds.",
          icon: <Cpu className="h-5 w-5 text-indigo-500" />
        },
        {
          title: "AI Debug Assistant",
          desc: "Integrated compiler listener that analyzes exceptions and outputs clean repair commits instantly.",
          icon: <Bug className="h-5 w-5 text-indigo-500" />
        },
        {
          title: "AI Agent",
          desc: "Autonomous terminal executor capable of running safe script pipelines and building project drafts on command.",
          icon: <Sparkles className="h-5 w-5 text-indigo-500" />
        },
        {
          title: "AI Meeting Summarizer",
          desc: "Voice transcripts parser that isolates tasks, milestones, and notes and outputs formatted Markdown scopes.",
          icon: <MessageSquare className="h-5 w-5 text-indigo-500" />
        },
        {
          title: "AI Project Health Score",
          desc: "Statistical engine checking deadline risk, repository velocity, ticket resolution rates, and expenditure metrics.",
          icon: <Activity className="h-5 w-5 text-indigo-500" />
        }
      ]
    },
    {
      num: 3,
      name: "Productivity Layer",
      status: "Concept",
      date: "11 October 2026",
      statusColor: "bg-orange-500/10 text-orange-650 dark:text-orange-400 border-orange-500/20",
      description: "Maximizing focus and eliminating workspace friction with smart developer utilities.",
      features: [
        {
          title: "Focus Mode",
          desc: "Integrated clean Pomodoro dashboard with workspace zen soundtracks and full distractions blacklisting.",
          icon: <Clock className="h-5 w-5 text-orange-500" />
        },
        {
          title: "Smart Terminal",
          desc: "Multi-tab sandboxed developer command panel with automated syntax highlighting and AI query suggestions.",
          icon: <Terminal className="h-5 w-5 text-orange-500" />
        },
        {
          title: "Personal Analytics",
          desc: "Visual charts tracking code-time, renewal targets, expenditure margins, and completion velocities.",
          icon: <LineChart className="h-5 w-5 text-orange-500" />
        },
        {
          title: "One-click Workspace Clone",
          desc: "Pack workspace config rules, secrets blueprint, notes, and boards into an encrypted archive for immediate staging.",
          icon: <Copy className="h-5 w-5 text-orange-500" />
        }
      ]
    },
    {
      num: 4,
      name: "Visual Site Customization",
      status: "Planned",
      date: "20 December 2026",
      statusColor: "bg-purple-500/10 text-purple-650 dark:text-purple-400 border-purple-500/20",
      description: "Complete visual freedom to reconfigure and personalize every block of your workspace.",
      features: [
        {
          title: "Drag & Drop Customizer",
          desc: "Now you can customize your site! Drag and drop any block or anything — now you can modify the site look however you want.",
          icon: <Layout className="h-5 w-5 text-purple-500" />
        },
        {
          title: "Flexible Layout Re-ordering",
          desc: "Reorganize components, boards, notes, and tracker widgets with intuitive drag controls.",
          icon: <Move className="h-5 w-5 text-purple-500" />
        },
        {
          title: "Visual Block Stylist",
          desc: "Modify colors, themes, borders, and visual block density with live interactive customization.",
          icon: <Sliders className="h-5 w-5 text-purple-500" />
        },
        {
          title: "Modular Layout Presets",
          desc: "Save custom block layouts and switch visual arrangements across workspaces instantly.",
          icon: <Grid className="h-5 w-5 text-purple-500" />
        }
      ]
    }
  ];

  // Trigger laser vaporization wipeout
  const triggerWipeout = () => {
    setWipeState("wiping");

    // Wait for the hologram glitch and laser sweep to finish, then collapse timeline elements
    setTimeout(() => {
      setWipeState("collapsed");
      setHasSeenWipeout(true);
      localStorage.setItem("devvault_roadmap_saw_wipeout", "true");
    }, 1100);
  };

  // Mount effect: Trigger animation if loaded for the first time
  useEffect(() => {
    if (wipeState === "idle") {
      const timer = setTimeout(() => {
        triggerWipeout();
      }, 1500); // 1.5s delay so the user views Phase 1 before it disintegrates
      return () => clearTimeout(timer);
    }
  }, [wipeState]);

  // Reorder logic: Wiped out Phase 1 gets removed from active upcoming list, promoting Phase 2 and Phase 3
  const activeTimelinePhases = wipeState === "collapsed"
    ? phases.filter(p => p.num !== 1)
    : phases;

  const completedPhases = phases.filter(p => p.num === 1);

  return (
    <div className="w-full min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-150 font-sans transition-colors duration-300 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-indigo-500/10 via-orange-500/5 to-transparent blur-[160px] rounded-full pointer-events-none z-0 dark:opacity-100 opacity-40" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-gradient-to-t from-emerald-500/5 to-transparent blur-[120px] rounded-full pointer-events-none z-0 dark:opacity-100 opacity-40" />

      {/* Floating Sparkles backdrop */}
      <div className="absolute inset-0 pointer-events-none z-0 opacity-15">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-orange-500/30 font-mono text-xs"
            style={{
              top: `${15 + i * 15}%`,
              left: `${10 + (i % 3) * 35 + (i * 7) % 15}%`
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.1, 0.4, 0.1],
              scale: [0.8, 1.2, 0.8]
            }}
            transition={{
              duration: 12 + i * 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            ✦
          </motion.div>
        ))}
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-12 z-10 relative select-none">
        {/* Navigation / Header bar */}
        <header className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-900 pb-5 mb-8 md:mb-12">
          <div className="flex items-center gap-2">
            <ArtificialLogo className="h-8 w-12 text-brand-500" />
            <div>
              <span className="font-bold text-base md:text-lg tracking-tight text-zinc-900 dark:text-white">DevVault</span>
              <span className="block text-[9px] md:text-[10px] text-zinc-500 font-mono">UPCOMING SOLUTIONS MATRIX</span>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={onBackToLanding} className="text-xs group">
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Button>
        </header>

        {/* Roadmap Title */}
        <div className="text-center max-w-xl mx-auto mb-10 md:mb-16">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 dark:bg-indigo-500/5 text-indigo-650 dark:text-indigo-400 text-xs font-mono mb-4"
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Project Roadmap 2026</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight"
          >
            DevVault Future Horizon
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xs text-zinc-550 dark:text-zinc-400 mt-2 leading-relaxed"
          >
            Explore upcoming integrations, AI abstractions, and modular tools scheduled for DevVault's next release phases.
          </motion.p>
        </div>

        {/* Interactive Phases Timeline */}
        <div className="flex flex-col gap-10 md:gap-14 relative" style={{ perspective: 1200 }}>
          {/* Vertical line indicator */}
          <div className="absolute left-[17px] md:left-[35px] top-6 bottom-6 w-[1.5px] bg-zinc-200 dark:bg-zinc-850 z-0" />

          {activeTimelinePhases.map((phase, idx) => {
            const isPhase1 = phase.num === 1;

            return (
              <motion.div
                key={phase.num}
                initial={isPhase1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
                animate={
                  isPhase1 && wipeState === "wiping"
                    ? {
                      // Holographic glitch flicker effect + 3D collapse
                      opacity: [1, 0.45, 0.95, 0.15, 0.8, 0],
                      skewX: [0, 6, -6, 12, -4, 0],
                      scale: [1, 0.98, 1.01, 0.95],
                      rotateX: -18,
                      rotateY: 5,
                      y: -12,
                      filter: ["blur(0px)", "blur(1px)", "blur(4px)"],
                      clipPath: "inset(100% 0% 0% 0%)"
                    }
                    : isPhase1 && wipeState === "collapsed"
                      ? { height: 0, opacity: 0, overflow: "hidden", margin: 0, padding: 0 }
                      : {
                        opacity: 1,
                        skewX: 0,
                        scale: 1,
                        rotateX: 0,
                        rotateY: 0,
                        y: 0,
                        filter: "blur(0px)",
                        clipPath: "inset(0% 0% 0% 0%)"
                      }
                }
                transition={
                  isPhase1 && wipeState === "wiping"
                    ? { duration: 1.0, ease: "easeInOut" }
                    : isPhase1 && wipeState === "collapsed"
                      ? { duration: 0.4 }
                      : { delay: idx * 0.15, type: "spring", stiffness: 90 }
                }
                viewport={{ once: true, amount: 0.1 }}
                className="flex gap-5 md:gap-10 relative z-10 bg-transparent rounded-2xl"
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Holographic Glitch lines, Shockwave Ring, Laser & Debris fragments */}
                {isPhase1 && wipeState === "wiping" && (
                  <>
                    {/* Holographic horizontal scan grid lines */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.08)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none z-10 animate-pulse" />

                    {/* Vapor Aura */}
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: [0.7, 1.4], opacity: [0, 0.35, 0] }}
                      transition={{ duration: 0.85, ease: "easeOut" }}
                      className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-cyan-500/10 to-indigo-500/20 blur-2xl rounded-2xl pointer-events-none z-10"
                    />

                    {/* Pressure Shockwave Ring */}
                    <motion.div
                      initial={{ scale: 0.2, opacity: 0, border: "2px solid rgba(6, 182, 212, 0.8)" }}
                      animate={{ scale: 1.6, opacity: [0, 0.85, 0], border: "1px solid rgba(99, 102, 241, 0)" }}
                      transition={{ duration: 0.85, delay: 0.1, ease: "easeOut" }}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full pointer-events-none z-20"
                    />

                    {/* Glowing Cyan Laser Line */}
                    <motion.div
                      initial={{ top: "100%", opacity: 0 }}
                      animate={{ top: "-5%", opacity: [0, 1, 1, 0] }}
                      transition={{ duration: 0.95, ease: "easeInOut" }}
                      className="absolute left-0 right-0 h-[4px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_25px_#00e5ff,0_0_10px_#00e5ff] z-20 pointer-events-none"
                    />

                    {/* Lightweight Floating Debris Blocks */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none z-20">
                      {Array.from({ length: 14 }).map((_, i) => {
                        const randomX = Math.random() * 100;
                        const randomY = Math.random() * 100;
                        const vx = (Math.random() - 0.5) * 160;
                        const vy = -120 - Math.random() * 180;
                        const rot = (Math.random() - 0.5) * 720;
                        const size = Math.random() * 8 + 5;
                        const color = i % 2 === 0 ? "#10b981" : "#6366f1";
                        return (
                          <motion.div
                            key={i}
                            initial={{ x: `${randomX}%`, y: `${randomY}%`, opacity: 1, scale: 1, rotate: 0 }}
                            animate={{
                              x: `calc(${randomX}% + ${vx}px)`,
                              y: `calc(${randomY}% + ${vy}px)`,
                              opacity: 0,
                              scale: 0.1,
                              rotate: rot
                            }}
                            transition={{ duration: 0.9, delay: Math.random() * 0.15, ease: "easeOut" }}
                            className="absolute rounded-[2px]"
                            style={{
                              width: size,
                              height: size,
                              backgroundColor: color,
                              boxShadow: `0 0 10px ${color}`
                            }}
                          />
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Timeline Marker (Dynamically Renumbered based on timeline index) */}
                <div
                  className={`h-9 w-9 md:h-[70px] md:w-[70px] rounded-2xl border shrink-0 flex items-center justify-center font-bold text-sm md:text-xl font-mono shadow-sm transition-all duration-300 cursor-pointer ${activePhase === idx
                      ? "bg-indigo-650 border-indigo-700 text-white scale-110 shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                      : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 text-zinc-500 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-700"
                    }`}
                  onClick={() => setActivePhase(activePhase === idx ? null : idx)}
                >
                  0{idx + 1}
                </div>

                {/* Phase Content Box */}
                <div className="flex-1 flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-900 pb-3">
                    <div>
                      <h2 className="text-lg md:text-xl font-extrabold text-zinc-900 dark:text-white flex flex-wrap items-center gap-2">
                        {phase.name}
                        <span className={`px-2 py-0.5 rounded border text-[9px] font-mono tracking-wider uppercase font-bold ${phase.statusColor}`}>
                          {phase.status}
                        </span>
                      </h2>
                      <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-1 max-w-xl">
                        {phase.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 text-zinc-500 font-mono text-[10px] md:text-xs">
                      <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Target: {phase.date}</span>
                    </div>
                  </div>

                  {/* Features Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    {phase.features.map((feature, fIdx) => (
                      <motion.div
                        key={fIdx}
                        whileHover={{ y: -3, scale: 1.01 }}
                        className="p-4.5 rounded-xl border border-zinc-200 dark:border-zinc-900 bg-white/50 dark:bg-zinc-955/20 backdrop-blur-sm shadow-sm hover:shadow-md hover:border-zinc-350 dark:hover:border-zinc-800 transition-all duration-300 flex items-start gap-3.5 group relative overflow-hidden"
                      >
                        {/* Spotlight visual cue */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-transparent blur-md pointer-events-none rounded-full" />

                        <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 group-hover:border-zinc-300 dark:group-hover:border-zinc-750 transition-colors shrink-0">
                          {feature.icon}
                        </div>

                        <div>
                          <h4 className="font-bold text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                            {feature.title}
                          </h4>
                          <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-1 leading-relaxed">
                            {feature.desc}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Phase 5 Teaser Timeline Marker (Renumbered dynamically) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 90 }}
            className="flex gap-5 md:gap-10 relative z-10"
          >
            {/* Timeline Marker */}
            <div className="h-9 w-9 md:h-[70px] md:w-[70px] rounded-2xl border shrink-0 flex items-center justify-center font-bold text-sm md:text-xl font-mono shadow-sm bg-zinc-100 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 text-zinc-400 dark:text-zinc-650">
              0{wipeState === "collapsed" ? "4" : "05"}
            </div>

            {/* Content Box */}
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-900 pb-3">
                <div>
                  <h2 className="text-lg md:text-xl font-extrabold text-zinc-400 dark:text-zinc-550 flex items-center gap-2">
                    Phase 5 & Future Horizon
                    <span className="px-2 py-0.5 rounded border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-[9px] font-mono tracking-wider uppercase font-bold">
                      Teaser Coming Soon
                    </span>
                  </h2>
                  <p className="text-xs text-zinc-550 dark:text-zinc-500 mt-1 max-w-xl">
                    Our R&D division is preparing detailed specifications for advanced server orchestrations, multi-agent networks, and visual timeline tools.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-zinc-500 font-mono text-[10px] md:text-xs">
                  <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Tentative: January 2027</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Completed Milestones (Archived Drawer Section) */}
        {wipeState === "collapsed" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-16 md:mt-24 border-t border-zinc-200 dark:border-zinc-900 pt-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-lg font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="h-5.5 w-5.5 text-emerald-500 animate-pulse" /> Completed Milestones
                </h3>
                <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-1">
                  Features that have been fully developed and integrated into the active workspace.
                </p>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem("devvault_roadmap_saw_wipeout");
                  setWipeState("idle");
                  toast("Replaying vaporization effect! Phase 1 will dissolve in 1.5 seconds.", "info");
                }}
                className="text-xs font-semibold text-indigo-650 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Replay Wipeout Animation
              </button>
            </div>

            {completedPhases.map((phase) => (
              <div
                key={phase.num}
                className="p-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/3 flex flex-col md:flex-row gap-6 items-start shadow-sm"
              >
                <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center font-bold text-lg font-mono text-emerald-600 dark:text-emerald-450 shrink-0">
                  ✓
                </div>
                <div className="flex-1 flex flex-col gap-3">
                  <div>
                    <h4 className="font-extrabold text-zinc-900 dark:text-white flex items-center gap-2">
                      {phase.name}
                      <span className="px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 text-[8px] font-mono tracking-wider uppercase font-bold">
                        Completed & Deployed
                      </span>
                    </h4>
                    <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      {phase.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-1">
                    {phase.features.map((feature, fIdx) => (
                      <div
                        key={fIdx}
                        className="p-3 rounded-xl border border-zinc-150 dark:border-zinc-850 bg-white dark:bg-zinc-950 flex items-center gap-2.5 shadow-sm"
                      >
                        <div className="p-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-emerald-500 shrink-0">
                          {feature.icon}
                        </div>
                        <span className="font-bold text-xs text-zinc-855 dark:text-zinc-250">
                          {feature.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Footer info box */}
        <div className="mt-16 md:mt-24 p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 text-center flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-left flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-650 dark:text-indigo-400 shrink-0">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-zinc-900 dark:text-white">Security-First Core Integrity</h4>
              <p className="text-[11px] text-zinc-550 dark:text-zinc-400 mt-0.5">
                All upcoming integrations will inherit the same Client-Side Zero-Knowledge Encryption layout before data synchronization.
              </p>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={onBackToLanding} className="text-xs shrink-0 cursor-pointer">
            Back to Home Page <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

    </div>
  );
};
