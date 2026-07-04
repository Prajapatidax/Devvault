/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useToast, Button, Input } from "./UI";
import { motion, AnimatePresence } from "motion/react";
import {
  FolderGit2,
  KeyRound,
  FileCode2,
  FileText,
  DollarSign,
  Github,
  Bot,
  Bug,
  Cpu,
  BookOpen,
  ShieldCheck,
  Lock,
  Server,
  Key,
  RefreshCw,
  Play,
  Edit,
  Save,
  X,
  ChevronRight,
  Sparkles,
  Share2,
  HelpCircle,
  LogIn,
  Sun,
  Moon
} from "lucide-react";
import { ArtificialLogo } from "../App";

interface LandingPageProps {
  onEnterApp: () => void;
  onNavigateToRoadmap?: () => void;
  isWorkspaceView?: boolean; // If true, rendering inside the authenticated workspace
  theme?: "light" | "dark" | "system";
  setTheme?: (theme: "light" | "dark" | "system") => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterApp,
  onNavigateToRoadmap,
  isWorkspaceView = false,
  theme = "dark",
  setTheme
}) => {
  const { user, apiFetch } = useAuth();
  const { toast } = useToast();

  const [headerHovered, setHeaderHovered] = useState(false);
  const [activeServiceIdx, setActiveServiceIdx] = useState(0);

  // Floating decorative code/cryptographic elements for the background
  const floatingSymbols = [
    { char: "{ }", size: "text-sm", top: "15%", left: "10%", delay: 0, duration: 15 },
    { char: "const", size: "text-xs font-mono", top: "25%", left: "80%", delay: 2, duration: 18 },
    { char: "[ ]", size: "text-lg", top: "60%", left: "5%", delay: 1, duration: 20 },
    { char: "import", size: "text-xs font-mono", top: "70%", left: "85%", delay: 4, duration: 16 },
    { char: "=>", size: "text-sm font-mono", top: "45%", left: "90%", delay: 3, duration: 14 },
    { char: "&&", size: "text-xs font-mono", top: "80%", left: "15%", delay: 5, duration: 22 },
    { char: "🔑", size: "text-sm", top: "35%", left: "8%", delay: 1.5, duration: 19 },
    { char: "🔒", size: "text-xs", top: "50%", left: "78%", delay: 3.5, duration: 17 },
    { char: "git", size: "text-xs font-mono", top: "10%", left: "70%", delay: 2.5, duration: 21 },
    { char: "await", size: "text-xs font-mono", top: "85%", left: "72%", delay: 0.5, duration: 23 },
  ];

  // Scroll reveal variants
  const cardContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 90,
        damping: 14
      }
    },
  };

  const sectionRevealVariants = {
    hidden: { opacity: 0, y: 35 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.7,
        ease: [0.16, 1, 0.3, 1]
      }
    }
  };

  const listContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
      }
    }
  };

  const listItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    card.style.setProperty("--mouse-x", `${x}px`);
    card.style.setProperty("--mouse-y", `${y}px`);
    
    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;
    
    const maxTilt = 8; // Max tilt angle
    const rotateY = ((x - centerX) / centerX) * maxTilt;
    const rotateX = -((y - centerY) / centerY) * maxTilt;
    
    card.style.setProperty("--rotate-x", `${rotateX}deg`);
    card.style.setProperty("--rotate-y", `${rotateY}deg`);
  };

  const handleCardMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    card.style.setProperty("--rotate-x", "0deg");
    card.style.setProperty("--rotate-y", "0deg");
  };



  // Modern grid services list
  const services = [
    {
      title: "Project Manager",
      desc: "Track workspace board statuses, technical stacks, priority items, and team deadlines.",
      icon: <FolderGit2 className="h-5 w-5 text-amber-500" />,
      color: "from-amber-500/10 to-orange-500/10 border-amber-500/20",
      spotlightBorder: "rgba(245, 158, 11, 0.45)",
      spotlightBg: "rgba(245, 158, 11, 0.05)",
      videoUrl: "https://res.cloudinary.com/demo/video/upload/w_640,h_360,c_fill/dog.mp4"
    },
    {
      title: "Secrets Manager",
      desc: "Lock credentials and passwords with military-grade client-side encryption and IV salts.",
      icon: <KeyRound className="h-5 w-5 text-emerald-500" />,
      color: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20",
      spotlightBorder: "rgba(16, 185, 129, 0.45)",
      spotlightBg: "rgba(16, 185, 129, 0.05)",
      videoUrl: "https://res.cloudinary.com/demo/video/upload/w_640,h_360,c_fill/elephants.mp4"
    },
    {
      title: "Snippet Manager",
      desc: "Save reusable code templates and standard developer configurations in one card board.",
      icon: <FileCode2 className="h-5 w-5 text-indigo-500" />,
      color: "from-indigo-500/10 to-blue-500/10 border-indigo-500/20",
      spotlightBorder: "rgba(99, 102, 241, 0.45)",
      spotlightBg: "rgba(99, 102, 241, 0.05)",
      videoUrl: "https://res.cloudinary.com/demo/video/upload/w_640,h_360,c_fill/sea.mp4"
    },
    {
      title: "Markdown Notes",
      desc: "Write project wikis, API guidelines, and documentation in full Markdown slates.",
      icon: <FileText className="h-5 w-5 text-pink-500" />,
      color: "from-pink-500/10 to-rose-500/10 border-pink-500/20",
      spotlightBorder: "rgba(236, 72, 153, 0.45)",
      spotlightBg: "rgba(236, 72, 153, 0.05)",
      videoUrl: "https://res.cloudinary.com/demo/video/upload/w_640,h_360,c_fill/dog.mp4"
    },
    {
      title: "Expense Tracker",
      desc: "Monitor deployment infrastructure bills, renewals, and project operational costs.",
      icon: <DollarSign className="h-5 w-5 text-violet-500" />,
      color: "from-violet-500/10 to-purple-500/10 border-violet-500/20",
      spotlightBorder: "rgba(139, 92, 246, 0.45)",
      spotlightBg: "rgba(139, 92, 246, 0.05)",
      videoUrl: "https://res.cloudinary.com/demo/video/upload/w_640,h_360,c_fill/elephants.mp4"
    },
    {
      title: "GitHub Tracker",
      desc: "Analyze repository commits, star counts, branches, and open pull request metrics.",
      icon: <Github className="h-5 w-5 text-sky-500 dark:text-sky-400" />,
      color: "from-sky-500/10 to-cyan-500/10 border-sky-500/20",
      spotlightBorder: "rgba(14, 165, 233, 0.45)",
      spotlightBg: "rgba(14, 165, 233, 0.05)",
      videoUrl: "https://res.cloudinary.com/demo/video/upload/w_640,h_360,c_fill/sea.mp4"
    },
    {
      title: "Developer AI Assistant",
      desc: "Ask the integrated Google Gemini model code-related questions and generate boilerplate code.",
      icon: <Bot className="h-5 w-5 text-red-500" />,
      color: "from-red-500/10 to-orange-500/10 border-red-500/20",
      spotlightBorder: "rgba(239, 68, 68, 0.45)",
      spotlightBg: "rgba(239, 68, 68, 0.05)",
      videoUrl: "https://res.cloudinary.com/demo/video/upload/w_640,h_360,c_fill/dog.mp4"
    },
    {
      title: "Bug Tracker",
      desc: "File issue tickets directly on active projects, assign severity, and watch repair statuses.",
      icon: <Bug className="h-5 w-5 text-yellow-500" />,
      color: "from-yellow-500/10 to-amber-500/10 border-yellow-500/20",
      spotlightBorder: "rgba(234, 179, 8, 0.45)",
      spotlightBg: "rgba(234, 179, 8, 0.05)",
      videoUrl: "https://res.cloudinary.com/demo/video/upload/w_640,h_360,c_fill/elephants.mp4"
    },
    {
      title: "Deployment Hub",
      desc: "Store web app staging URLs, backend server domains, platform locations, and notes.",
      icon: <Cpu className="h-5 w-5 text-teal-500" />,
      color: "from-teal-500/10 to-emerald-500/10 border-teal-500/20",
      spotlightBorder: "rgba(20, 184, 166, 0.45)",
      spotlightBg: "rgba(20, 184, 166, 0.05)",
      videoUrl: "https://res.cloudinary.com/demo/video/upload/w_640,h_360,c_fill/sea.mp4"
    },
    {
      title: "AI Documentation Gen",
      desc: "Export README.md, API specs, and change logs automatically using smart AI templates.",
      icon: <BookOpen className="h-5 w-5 text-indigo-400" />,
      color: "from-indigo-400/10 to-violet-500/10 border-indigo-400/20",
      spotlightBorder: "rgba(129, 140, 248, 0.45)",
      spotlightBg: "rgba(129, 140, 248, 0.05)",
      videoUrl: "https://res.cloudinary.com/demo/video/upload/w_640,h_360,c_fill/dog.mp4"
    }
  ];

  // What kind of details you can share
  const shareableDetails = [
    {
      title: "Collaborative Project Boards",
      desc: "Add team members with fine-grained roles: Owner, Admin, Editor, or Viewer. Share task assignments and board state updates."
    },
    {
      title: "Scoped Credentials & Keys",
      desc: "Configure project-specific deployment keys, servers, and configuration notes. Shared only with authorized collaborators."
    },
    {
      title: "Interactive Markdown Notes",
      desc: "Write documentation, setup guides, or meeting minutes. Tag them to projects so everyone stays on the same page."
    },
    {
      title: "Unified Bug Lists",
      desc: "Report errors or task regressions, link them to specific project files, and collaborate to resolve them."
    }
  ];

  // Security footprint specs
  const securityFootprint = [
    {
      icon: <Lock className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />,
      title: "AES-256-CBC Encryption",
      desc: "Secrets and project credentials are encrypted inside the database using AES-256. Decryption keys are managed in-memory on the client, implementing a Zero-Knowledge paradigm."
    },
    {
      icon: <Key className="h-5 w-5 text-amber-500 dark:text-amber-400" />,
      title: "PBKDF2 Password Hashing",
      desc: "Master decrypt keys are hashed using PBKDF2 with unique cryptographic salt values to provide strong resilience against offline dictionary attacks."
    },
    {
      icon: <Server className="h-5 w-5 text-indigo-500 dark:text-indigo-405" />,
      title: "Row Level Security (RLS)",
      desc: "Backend database access layers enforce strict user verification. You can only query, modify, or view entities that you own or have been explicitly invited to."
    },
    {
      icon: <RefreshCw className="h-5 w-5 text-sky-500 dark:text-sky-400" />,
      title: "Encrypted Backups",
      desc: "Directly export your workspace data as an encrypted file. Restore your workspace on any environment securely with the same master decryption key."
    }
  ];

  return (
    <div className={`w-full overflow-y-auto bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-150 font-sans transition-colors duration-300 relative ${isWorkspaceView ? "h-full rounded-2xl border border-zinc-200 dark:border-zinc-800/80 p-4 md:p-6 bg-white dark:bg-zinc-950/40 backdrop-blur-md" : "min-h-screen"}`}>
      {/* Glow & Floating Effects */}
      {!isWorkspaceView && (
        <>
          <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[500px] h-[500px] bg-gradient-to-b from-orange-500/10 via-amber-400/5 to-transparent blur-[160px] rounded-full pointer-events-none z-0 dark:opacity-100 opacity-40" />
          <div className="absolute bottom-1/3 right-1/4 translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-t from-indigo-500/5 via-violet-500/5 to-transparent blur-[180px] rounded-full pointer-events-none z-0 dark:opacity-100 opacity-40" />
          
          {/* Floating developer symbols */}
          {floatingSymbols.map((item, idx) => (
            <motion.div
              key={idx}
              className={`absolute ${item.size} pointer-events-none select-none font-mono text-orange-500/20 dark:text-orange-400/15 z-0`}
              style={{ top: item.top, left: item.left }}
              animate={{
                y: [0, -50, 0],
                x: [0, 20, 0],
                rotate: [0, 180, 360],
                opacity: [0.15, 0.45, 0.15],
              }}
              transition={{
                duration: item.duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: item.delay,
              }}
            >
              {item.char}
            </motion.div>
          ))}
        </>
      )}

      <div className={`max-w-6xl mx-auto z-10 relative ${isWorkspaceView ? "" : "px-4 md:px-6 py-6 md:py-12"}`}>
        {/* Landing Page Navbar */}
        {!isWorkspaceView && (
          <header className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-900 pb-5 mb-8 md:mb-12 select-none">
            <div className="flex items-center gap-2">
              <ArtificialLogo className="h-8 w-12 text-brand-500" />
              <div>
                <span className="font-bold text-base md:text-lg tracking-tight text-zinc-900 dark:text-white">DevVault</span>
                <span className="block text-[9px] md:text-[10px] text-zinc-500 font-mono">SECURE DEVELOPER WORKSTATION</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 md:gap-4">
              <a href="#services" className="hidden sm:inline-block text-xs text-zinc-650 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors">Services</a>
              <a href="#security" className="hidden sm:inline-block text-xs text-zinc-650 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors">Security</a>
              {onNavigateToRoadmap && (
                <button 
                  onClick={onNavigateToRoadmap}
                  className="text-xs text-zinc-650 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer flex items-center gap-1 bg-orange-500/10 dark:bg-orange-500/5 px-2.5 py-1 rounded-full border border-orange-500/20 text-orange-650 dark:text-orange-400 font-semibold"
                >
                  <Sparkles className="h-3 w-3 text-orange-500" />
                  Roadmap
                </button>
              )}
              
              {/* Sun/Moon Toggle */}
              {setTheme && (
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="p-2 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer"
                  title="Toggle Theme Mode"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4 text-brand-500" /> : <Moon className="h-4 w-4 text-indigo-650 dark:text-indigo-400" />}
                </button>
              )}

              <Button variant="primary" size="sm" onClick={onEnterApp} className="text-xs">
                <LogIn className="h-3.5 w-3.5" />
                <span className="hidden xs:inline">Enter Workspace</span>
                <span className="xs:hidden">Enter</span>
              </Button>
            </div>
          </header>
        )}

        {/* Hero Section */}
        {!isWorkspaceView && (
          <section className="text-center py-8 md:py-20 max-w-3xl mx-auto flex flex-col items-center gap-5 md:gap-6">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 dark:bg-orange-500/5 text-orange-650 dark:text-orange-400 text-xs font-mono"
            >
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
              <span>Zero-Knowledge Developer Platform</span>
            </motion.div>
            
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-zinc-900 dark:text-white tracking-tight leading-tight md:leading-none bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 via-zinc-850 to-orange-500 dark:from-white dark:via-zinc-200 dark:to-orange-400"
            >
              Your Unified Developer Workstation Vault
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans max-w-2xl px-2"
            >
              A beautifully designed, secure workspace to organize credentials, projects, code snippets, notes, expenses, and GitHub metrics. Guided by local encryption and collaborative team layers.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5 mt-4 w-full sm:w-auto px-4 sm:px-0"
            >
              <Button variant="primary" size="lg" onClick={onEnterApp} className="w-full sm:w-auto">
                Get Started
                <ChevronRight className="h-4 w-4" />
              </Button>
            </motion.div>
          </section>
        )}

        {/* Services provided */}
        <section id="services" className="py-12 md:py-16 border-t border-zinc-200 dark:border-zinc-900">
          <div className="text-center max-w-xl mx-auto mb-10 md:mb-12">
            <div 
              className="relative inline-block cursor-default group"
              onMouseEnter={() => setHeaderHovered(true)}
              onMouseLeave={() => setHeaderHovered(false)}
            >
              <h2 className="text-xl md:text-3xl font-bold text-zinc-900 dark:text-white transition-all duration-500 group-hover:scale-105 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-orange-500 group-hover:to-amber-500 group-hover:drop-shadow-[0_0_15px_rgba(255,98,0,0.25)]">
                Services We Provide
              </h2>
              {/* Animated underline */}
              <div className="h-[2px] w-0 group-hover:w-1/2 bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500 mx-auto mt-2 rounded-full" />
              
              {/* Floating Sparkles when hovered */}
              <AnimatePresence>
                {headerHovered && (
                  <>
                    {/* Sparkle 1 */}
                    <motion.span
                      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5], x: -60, y: -40, rotate: 45 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.5, ease: "easeOut", repeat: Infinity }}
                      className="absolute top-1/4 left-0 text-orange-500 pointer-events-none"
                    >
                      <Sparkles className="h-4 w-4" />
                    </motion.span>
                    
                    {/* Sparkle 2 */}
                    <motion.span
                      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5], x: 70, y: -30, rotate: -30 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.8, ease: "easeOut", delay: 0.2, repeat: Infinity }}
                      className="absolute top-1/4 right-0 text-amber-500 pointer-events-none"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </motion.span>

                    {/* Sparkle 3 */}
                    <motion.span
                      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      animate={{ opacity: [0, 1, 0], scale: [0.6, 1.2, 0.6], x: -35, y: 30, rotate: 15 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.3, ease: "easeOut", delay: 0.4, repeat: Infinity }}
                      className="absolute bottom-1/4 left-4 text-orange-400 pointer-events-none"
                    >
                      ✦
                    </motion.span>

                    {/* Sparkle 4 */}
                    <motion.span
                      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                      animate={{ opacity: [0, 1, 0], scale: [0.6, 1.2, 0.6], x: 45, y: 25, rotate: 90 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.6, ease: "easeOut", delay: 0.1, repeat: Infinity }}
                      className="absolute bottom-1/4 right-4 text-amber-400 pointer-events-none"
                    >
                      ✦
                    </motion.span>
                  </>
                )}
              </AnimatePresence>
            </div>
            <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-2 leading-relaxed">
              DevVault provides a comprehensive, secure system layout mapping all key developer workspaces into one secure cockpit. Hover or select to preview each feature.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Side: Interactive Services List */}
            <div className="lg:col-span-5 flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {services.map((srv, idx) => {
                const isActive = activeServiceIdx === idx;
                return (
                  <motion.div
                    key={idx}
                    onClick={() => setActiveServiceIdx(idx)}
                    onMouseEnter={() => setActiveServiceIdx(idx)}
                    whileHover={{ x: 4 }}
                    className={`flex items-start gap-3.5 p-4 rounded-xl border transition-all duration-300 cursor-pointer select-none relative overflow-hidden ${
                      isActive 
                        ? "bg-white dark:bg-zinc-900 border-orange-500/30 dark:border-orange-500/20 shadow-md ring-1 ring-orange-500/10" 
                        : "bg-white/40 dark:bg-zinc-950/10 border-zinc-200 dark:border-zinc-900/60 opacity-70 hover:opacity-100"
                    }`}
                  >
                    {/* Active highlight glow indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-orange-500 to-amber-500" />
                    )}

                    <div className={`p-2 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 shrink-0 ${isActive ? "text-orange-500" : ""}`}>
                      {srv.icon}
                    </div>

                    <div className="flex-1">
                      <h4 className={`font-bold text-xs md:text-sm transition-colors ${isActive ? "text-zinc-900 dark:text-white" : "text-zinc-700 dark:text-zinc-400"}`}>
                        {srv.title}
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-normal">
                        {srv.desc}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Right Side: Sticky Video Feature Showcase */}
            <div className="lg:col-span-7 lg:sticky lg:top-6 flex flex-col gap-4">
              <div className="relative rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 p-3 shadow-xl backdrop-blur-md overflow-hidden aspect-video flex items-center justify-center">
                {/* Visual back glow corresponding to service color */}
                <div 
                  className="absolute inset-0 opacity-10 blur-[100px] pointer-events-none transition-all duration-700" 
                  style={{
                    background: `radial-gradient(circle, ${services[activeServiceIdx].spotlightBorder} 0%, transparent 70%)`
                  }}
                />

                <video
                  key={services[activeServiceIdx].videoUrl}
                  src={services[activeServiceIdx].videoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover rounded-xl shadow-inner relative z-10 bg-zinc-950"
                />
              </div>

              {/* Showcase Detail Block */}
              <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-900 bg-white/60 dark:bg-zinc-950/20 backdrop-blur-sm shadow-sm flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-mono tracking-wider uppercase font-extrabold text-orange-500 dark:text-orange-400">
                    Feature Demonstration
                  </span>
                  <h3 className="font-extrabold text-base text-zinc-900 dark:text-white mt-1">
                    {services[activeServiceIdx].title}
                  </h3>
                  <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-2 leading-relaxed">
                    {services[activeServiceIdx].desc} This secure workspace segment is fully integrated client-side, encrypted, and synced across your authenticated session.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Shareable Details */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={sectionRevealVariants}
          className="py-12 md:py-16 border-t border-zinc-200 dark:border-zinc-900"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <h2 className="text-xl md:text-3xl font-bold text-zinc-900 dark:text-white mb-3">What Details Can You Share?</h2>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed mb-6">
                Collaboration is at the heart of DevVault. While private vaults remain protected, you can establish project team scopes and securely distribute key structural records.
              </p>
              
              <motion.div 
                variants={listContainerVariants}
                className="flex flex-col gap-4"
              >
                {shareableDetails.map((detail, idx) => (
                  <motion.div 
                    variants={listItemVariants}
                    key={idx} 
                    className="flex gap-3"
                  >
                    <div className="h-5 w-5 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-650 dark:text-orange-400 text-[10px] font-mono shrink-0 mt-0.5 font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{detail.title}</h4>
                      <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-1 leading-relaxed">{detail.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            <motion.div 
              initial={{ opacity: 0, x: 40, rotateY: -10 }}
              whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.2 }}
              style={{ transformStyle: "preserve-3d", perspective: 1000 }}
              className="bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-850 p-5 md:p-6 rounded-2xl relative overflow-hidden backdrop-blur-md shadow-sm"
            >
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/10 blur-[50px] rounded-full pointer-events-none" />
              
              <div className="flex items-center gap-2 mb-6">
                <Share2 className="h-5 w-5 text-orange-500 dark:text-orange-400" />
                <h3 className="font-mono text-[10px] md:text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">COLLABORATIVE SHARING MATRIX</h3>
              </div>

              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden text-[11px] md:text-xs">
                <div className="grid grid-cols-3 bg-zinc-100 dark:bg-zinc-950 p-3 font-mono text-zinc-500 font-bold border-b border-zinc-250 dark:border-zinc-800">
                  <span>DATA TYPE</span>
                  <span>VISIBILITY</span>
                  <span>ENCRYPTION</span>
                </div>
                <div className="grid grid-cols-3 p-3 border-b border-zinc-200 dark:border-zinc-900 hover:bg-zinc-100/30 dark:hover:bg-zinc-900/10 transition-colors">
                  <span className="font-semibold text-zinc-900 dark:text-white">Project Boards</span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Invited Members</span>
                  <span className="text-zinc-500 font-mono">SSL Transport</span>
                </div>
                <div className="grid grid-cols-3 p-3 border-b border-zinc-200 dark:border-zinc-900 hover:bg-zinc-100/30 dark:hover:bg-zinc-900/10 transition-colors">
                  <span className="font-semibold text-zinc-900 dark:text-white">Project Secrets</span>
                  <span className="text-amber-650 dark:text-amber-400 font-medium">Role Restricted</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-mono">AES-256 encrypted</span>
                </div>
                <div className="grid grid-cols-3 p-3 border-b border-zinc-200 dark:border-zinc-900 hover:bg-zinc-100/30 dark:hover:bg-zinc-900/10 transition-colors">
                  <span className="font-semibold text-zinc-900 dark:text-white">Markdown Notes</span>
                  <span className="text-amber-655 dark:text-amber-400 font-medium">Project Scope</span>
                  <span className="text-zinc-500 font-mono">SSL Transport</span>
                </div>
                <div className="grid grid-cols-3 p-3 hover:bg-zinc-100/30 dark:hover:bg-zinc-900/10 transition-colors">
                  <span className="font-semibold text-zinc-900 dark:text-white">Bug Reports</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">Public/Project</span>
                  <span className="text-zinc-500 font-mono">No Encryption</span>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* Security Footprint */}
        <motion.section 
          id="security" 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          variants={sectionRevealVariants}
          className="py-12 md:py-16 border-t border-zinc-200 dark:border-zinc-900"
        >
          <div className="text-center max-w-xl mx-auto mb-10 md:mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/5 text-emerald-650 dark:text-emerald-400 text-xs font-mono mb-3">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Ironclad Security Layer</span>
            </div>
            <h2 className="text-xl md:text-3xl font-bold text-zinc-900 dark:text-white">How Much Security We Have?</h2>
            <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-2 leading-relaxed">
              DevVault incorporates state-of-the-art cryptographic libraries and infrastructure models to ensure your credentials stay under complete lockdown.
            </p>
          </div>

          <motion.div 
            variants={cardContainerVariants}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8"
          >
            {securityFootprint.map((sec, idx) => (
              <motion.div 
                key={idx} 
                variants={cardVariants}
                whileHover={{ y: -4, scale: 1.01, transition: { duration: 0.2 } }}
                className="flex gap-4 p-5 rounded-xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950/20 hover:border-zinc-300 dark:hover:border-zinc-800 transition-all duration-300 shadow-sm"
              >
                <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white w-fit h-fit shrink-0">
                  {sec.icon}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">{sec.title}</h3>
                  <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-1.5 leading-relaxed">{sec.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* Footer */}
        {!isWorkspaceView && (
          <footer className="border-t border-zinc-200 dark:border-zinc-900 pt-8 mt-12 md:mt-20 text-center flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 select-none">
            <div className="flex items-center gap-2">
              <ArtificialLogo className="h-6 w-10 text-brand-500" />
              <span className="font-bold text-zinc-900 dark:text-white">DevVault</span>
              <span>© 2026. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-4 text-zinc-550 dark:text-zinc-400">
              <span className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer">Security Audits</span>
              <span>•</span>
              <span className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer">API Agreement</span>
              {onNavigateToRoadmap && (
                <>
                  <span>•</span>
                  <span className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer text-orange-650 dark:text-orange-400 font-semibold" onClick={onNavigateToRoadmap}>Upcoming Features</span>
                </>
              )}
              <span>•</span>
              <span className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer" onClick={onEnterApp}>Enter Workspace</span>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
};
