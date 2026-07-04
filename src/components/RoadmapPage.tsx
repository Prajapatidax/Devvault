/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
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
  Calendar
} from "lucide-react";
import { Button } from "./UI";
import { motion } from "motion/react";
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
  const [activePhase, setActivePhase] = useState<number | null>(null);

  const phases = [
    {
      num: 1,
      name: "Core Features",
      status: "In Development",
      date: "26 July 2026",
      statusColor: "bg-orange-500/10 text-orange-650 dark:text-orange-400 border-orange-500/20",
      description: "Optimizing the bedrock security structures and usability of the DevVault workstation.",
      features: [
        {
          title: "Search Bar",
          desc: "Global hotkey-activated search box crawling projects, encrypted keys, notes, and tracker nodes instantly.",
          icon: <Search className="h-5 w-5 text-orange-500" />
        },
        {
          title: "Time Machine",
          desc: "Granular local version history and commit trees for all secure resources, with offline diff previews.",
          icon: <History className="h-5 w-5 text-orange-500" />
        },
        {
          title: "Secret Leak Detector",
          desc: "Pre-commit static code scan that flags exposed API tokens, passwords, and database keys before they exit your system.",
          icon: <ShieldAlert className="h-5 w-5 text-orange-500" />
        },
        {
          title: "UI Improve",
          desc: "Customizable warm templates, expanded layouts, system window mode overrides, and fluid micro-transitions.",
          icon: <Paintbrush className="h-5 w-5 text-orange-500" />
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
      statusColor: "bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 border-emerald-500/20",
      description: "Maximizing focus and eliminating workspace friction with smart developer utilities.",
      features: [
        {
          title: "Focus Mode",
          desc: "Integrated clean Pomodoro dashboard with workspace zen soundtracks and full distractions blacklisting.",
          icon: <Clock className="h-5 w-5 text-emerald-500" />
        },
        {
          title: "Smart Terminal",
          desc: "Multi-tab sandboxed developer command panel with automated syntax highlighting and AI query suggestions.",
          icon: <Terminal className="h-5 w-5 text-emerald-500" />
        },
        {
          title: "Personal Analytics",
          desc: "Visual charts tracking code-time, renewal targets, expenditure margins, and completion velocities.",
          icon: <LineChart className="h-5 w-5 text-emerald-500" />
        },
        {
          title: "One-click Workspace Clone",
          desc: "Pack workspace config rules, secrets blueprint, notes, and boards into an encrypted archive for immediate staging.",
          icon: <Copy className="h-5 w-5 text-emerald-500" />
        }
      ]
    }
  ];

  return (
    <div className="w-full min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-150 font-sans transition-colors duration-300 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-orange-500/10 via-indigo-500/5 to-transparent blur-[160px] rounded-full pointer-events-none z-0 dark:opacity-100 opacity-40" />
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
        <div className="flex flex-col gap-10 md:gap-14 relative">
          {/* Vertical line indicator */}
          <div className="absolute left-[17px] md:left-[35px] top-6 bottom-6 w-[1.5px] bg-zinc-200 dark:bg-zinc-850 z-0" />

          {phases.map((phase, idx) => (
            <motion.div
              key={phase.num}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ delay: idx * 0.15, type: "spring", stiffness: 90 }}
              className={`flex gap-5 md:gap-10 relative z-10`}
            >
              {/* Timeline Marker */}
              <div 
                className={`h-9 w-9 md:h-[70px] md:w-[70px] rounded-2xl border shrink-0 flex items-center justify-center font-bold text-sm md:text-xl font-mono shadow-sm transition-all duration-300 cursor-pointer ${
                  activePhase === idx 
                    ? "bg-orange-500 border-orange-600 text-white scale-110 shadow-[0_0_15px_rgba(239,68,68,0.3)]" 
                    : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 text-zinc-500 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-700"
                }`}
                onClick={() => setActivePhase(activePhase === idx ? null : idx)}
              >
                0{phase.num}
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
                    <Calendar className="h-3.5 w-3.5 text-orange-500" />
                    <span>Target: {phase.date}</span>
                  </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  {phase.features.map((feature, fIdx) => (
                    <motion.div
                      key={fIdx}
                      whileHover={{ y: -3, scale: 1.01 }}
                      className="p-4.5 rounded-xl border border-zinc-200 dark:border-zinc-900 bg-white/50 dark:bg-zinc-950/20 backdrop-blur-sm shadow-sm hover:shadow-md hover:border-zinc-350 dark:hover:border-zinc-800 transition-all duration-300 flex items-start gap-3.5 group relative overflow-hidden"
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
          ))}

          {/* Phase 4 & 5 Teaser Timeline Marker */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 90 }}
            className="flex gap-5 md:gap-10 relative z-10"
          >
            {/* Timeline Marker */}
            <div className="h-9 w-9 md:h-[70px] md:w-[70px] rounded-2xl border shrink-0 flex items-center justify-center font-bold text-sm md:text-xl font-mono shadow-sm bg-zinc-100 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-850 text-zinc-400 dark:text-zinc-650">
              ++
            </div>

            {/* Content Box */}
            <div className="flex-1 flex flex-col gap-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-900 pb-3">
                <div>
                  <h2 className="text-lg md:text-xl font-extrabold text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
                    Phase 4 & 5 Blueprint
                    <span className="px-2 py-0.5 rounded border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-[9px] font-mono tracking-wider uppercase font-bold">
                      Teaser Coming Soon
                    </span>
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-550 mt-1 max-w-xl">
                    Our R&D division is preparing detailed specifications for advanced server orchestrations, multi-agent networks, and visual timeline tools.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 text-zinc-500 font-mono text-[10px] md:text-xs">
                  <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Update List: 2 August 2026</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer info box */}
        <div className="mt-16 md:mt-24 p-5 rounded-2xl border border-orange-500/20 bg-orange-500/5 text-center flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-left flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-650 dark:text-orange-400 shrink-0">
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
