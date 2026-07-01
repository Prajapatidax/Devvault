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
  isWorkspaceView?: boolean; // If true, rendering inside the authenticated workspace
  theme?: "light" | "dark" | "system";
  setTheme?: (theme: "light" | "dark" | "system") => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterApp,
  isWorkspaceView = false,
  theme = "dark",
  setTheme
}) => {
  const { user, apiFetch } = useAuth();
  const { toast } = useToast();

  const [videoInfo, setVideoInfo] = useState({ videoId: "SqcY0GlETPk", videoUrl: "" });
  const [loadingVideo, setLoadingVideo] = useState(true);
  
  // Edit Video States
  const [isEditing, setIsEditing] = useState(false);
  const [videoInputUrl, setVideoInputUrl] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchVideoInfo = async () => {
    try {
      const res = await fetch("/api/landing-video");
      if (res.ok) {
        const data = await res.json();
        setVideoInfo(data);
        setVideoInputUrl(data.videoUrl);
      }
    } catch (err) {
      console.error("Failed to load landing video info:", err);
    } finally {
      setLoadingVideo(false);
    }
  };

  useEffect(() => {
    fetchVideoInfo();
  }, []);

  const handleUpdateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoInputUrl.trim()) {
      toast("Please enter a valid YouTube URL", "error");
      return;
    }

    setUpdating(true);
    try {
      const res = await apiFetch("/api/landing-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ videoUrl: videoInputUrl }),
      });

      if (res.ok) {
        const data = await res.json();
        setVideoInfo({ videoId: data.videoId, videoUrl: data.videoUrl });
        toast("Tutorial video updated successfully!", "success");
        setIsEditing(false);
      } else {
        const errData = await res.json();
        toast(errData.error || "Failed to update video", "error");
      }
    } catch (err) {
      console.error(err);
      toast("An error occurred while updating the video", "error");
    } finally {
      setUpdating(false);
    }
  };

  // Modern grid services list
  const services = [
    {
      title: "Project Manager",
      desc: "Track workspace board statuses, technical stacks, priority items, and team deadlines.",
      icon: <FolderGit2 className="h-5 w-5 text-amber-500" />,
      color: "from-amber-500/10 to-orange-500/10 border-amber-500/20"
    },
    {
      title: "Secrets Manager",
      desc: "Lock credentials and passwords with military-grade client-side encryption and IV salts.",
      icon: <KeyRound className="h-5 w-5 text-emerald-500" />,
      color: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20"
    },
    {
      title: "Snippet Manager",
      desc: "Save reusable code templates and standard developer configurations in one card board.",
      icon: <FileCode2 className="h-5 w-5 text-indigo-500" />,
      color: "from-indigo-500/10 to-blue-500/10 border-indigo-500/20"
    },
    {
      title: "Markdown Notes",
      desc: "Write project wikis, API guidelines, and documentation in full Markdown slates.",
      icon: <FileText className="h-5 w-5 text-pink-500" />,
      color: "from-pink-500/10 to-rose-500/10 border-pink-500/20"
    },
    {
      title: "Expense Tracker",
      desc: "Monitor deployment infrastructure bills, renewals, and project operational costs.",
      icon: <DollarSign className="h-5 w-5 text-violet-500" />,
      color: "from-violet-500/10 to-purple-500/10 border-violet-500/20"
    },
    {
      title: "GitHub Tracker",
      desc: "Analyze repository commits, star counts, branches, and open pull request metrics.",
      icon: <Github className="h-5 w-5 text-sky-500 text-slate-700 dark:text-sky-400" />,
      color: "from-sky-500/10 to-cyan-500/10 border-sky-500/20"
    },
    {
      title: "Developer AI Assistant",
      desc: "Ask the integrated Google Gemini model code-related questions and generate boilerplate code.",
      icon: <Bot className="h-5 w-5 text-red-500" />,
      color: "from-red-500/10 to-orange-500/10 border-red-500/20"
    },
    {
      title: "Bug Tracker",
      desc: "File issue tickets directly on active projects, assign severity, and watch repair statuses.",
      icon: <Bug className="h-5 w-5 text-yellow-500" />,
      color: "from-yellow-500/10 to-amber-500/10 border-yellow-500/20"
    },
    {
      title: "Deployment Hub",
      desc: "Store web app staging URLs, backend server domains, platform locations, and notes.",
      icon: <Cpu className="h-5 w-5 text-teal-500" />,
      color: "from-teal-500/10 to-emerald-500/10 border-teal-500/20"
    },
    {
      title: "AI Documentation Gen",
      desc: "Export README.md, API specs, and change logs automatically using smart AI templates.",
      icon: <BookOpen className="h-5 w-5 text-indigo-400" />,
      color: "from-indigo-400/10 to-violet-500/10 border-indigo-400/20"
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
      {/* Glow Effects */}
      {!isWorkspaceView && (
        <>
          <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[500px] h-[500px] bg-gradient-to-b from-orange-500/10 via-amber-400/5 to-transparent blur-[160px] rounded-full pointer-events-none z-0 dark:opacity-100 opacity-40" />
          <div className="absolute bottom-1/3 right-1/4 translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-t from-indigo-500/5 via-violet-500/5 to-transparent blur-[180px] rounded-full pointer-events-none z-0 dark:opacity-100 opacity-40" />
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
              <a href="#tutorial" className="hidden sm:inline-block text-xs text-zinc-650 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors">Tutorial</a>
              
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
              <a href="#tutorial" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto justify-center">
                  <Play className="h-4 w-4 fill-current text-orange-500" />
                  Watch Video Tutorial
                </Button>
              </a>
            </motion.div>
          </section>
        )}

        {/* Video instruction bar */}
        <section id="tutorial" className="py-8 md:py-12 border-t border-zinc-200 dark:border-zinc-900">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
            <div>
              <h2 className="text-lg md:text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Play className="h-5 w-5 text-orange-500" />
                How to Use DevVault
              </h2>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-1">Watch this quick walkthrough video to master the vault workspace.</p>
            </div>
            
            {/* Show edit button only when logged in */}
            {user && (
              <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)} className="text-xs self-start sm:self-auto">
                <Edit className="h-3.5 w-3.5" />
                Update Tutorial Video
              </Button>
            )}
          </div>

          <div className="relative group rounded-xl md:rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 overflow-hidden shadow-xl p-1.5 md:p-4 backdrop-blur-sm">
            {loadingVideo ? (
              <div className="aspect-video w-full flex flex-col items-center justify-center text-xs text-zinc-500 gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
                <span>Loading video stream...</span>
              </div>
            ) : (
              <div className="relative aspect-video w-full rounded-lg md:rounded-xl overflow-hidden shadow-inner bg-zinc-950">
                <iframe
                  className="absolute inset-0 w-full h-full border-0"
                  src={`https://www.youtube.com/embed/${videoInfo.videoId}`}
                  title="YouTube video player"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                ></iframe>
              </div>
            )}
          </div>
        </section>

        {/* Services provided */}
        <section id="services" className="py-12 md:py-16 border-t border-zinc-200 dark:border-zinc-900">
          <div className="text-center max-w-xl mx-auto mb-10 md:mb-12">
            <h2 className="text-xl md:text-3xl font-bold text-zinc-900 dark:text-white">Services We Provide</h2>
            <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-2 leading-relaxed">
              DevVault provides a comprehensive, secure system layout mapping all key developer workspaces into one secure cockpit.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:grid-cols-2 lg:gap-6">
            {services.map((srv, idx) => (
              <div
                key={idx}
                className="p-5 md:p-6 rounded-xl border border-zinc-250 dark:border-zinc-900 bg-white dark:bg-zinc-900/10 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/40 hover:border-zinc-300 dark:hover:border-zinc-800 transition-all duration-300 flex flex-col gap-3 group shadow-sm"
              >
                <div className="p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-950 w-fit border border-zinc-200 dark:border-zinc-850 group-hover:border-zinc-300 dark:group-hover:border-zinc-700/85 transition-colors">
                  {srv.icon}
                </div>
                <h3 className="font-bold text-zinc-900 dark:text-white text-sm">{srv.title}</h3>
                <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed">{srv.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Shareable Details */}
        <section className="py-12 md:py-16 border-t border-zinc-200 dark:border-zinc-900">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <h2 className="text-xl md:text-3xl font-bold text-zinc-900 dark:text-white mb-3">What Details Can You Share?</h2>
              <p className="text-xs text-zinc-550 dark:text-zinc-400 leading-relaxed mb-6">
                Collaboration is at the heart of DevVault. While private vaults remain protected, you can establish project team scopes and securely distribute key structural records.
              </p>
              
              <div className="flex flex-col gap-4">
                {shareableDetails.map((detail, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="h-5 w-5 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-650 dark:text-orange-400 text-[10px] font-mono shrink-0 mt-0.5 font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{detail.title}</h4>
                      <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-1 leading-relaxed">{detail.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-850 p-5 md:p-6 rounded-2xl relative overflow-hidden backdrop-blur-md shadow-sm">
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
            </div>
          </div>
        </section>

        {/* Security Footprint */}
        <section id="security" className="py-12 md:py-16 border-t border-zinc-200 dark:border-zinc-900">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {securityFootprint.map((sec, idx) => (
              <div key={idx} className="flex gap-4 p-5 rounded-xl border border-zinc-200 dark:border-zinc-900 bg-white dark:bg-zinc-950/20 hover:border-zinc-300 dark:hover:border-zinc-800 transition-all duration-300 shadow-sm">
                <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white w-fit h-fit shrink-0">
                  {sec.icon}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">{sec.title}</h3>
                  <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-1.5 leading-relaxed">{sec.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

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
              <span>•</span>
              <span className="hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer" onClick={onEnterApp}>Enter Workspace</span>
            </div>
          </footer>
        )}
      </div>

      {/* Edit Video Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-950/70 dark:bg-zinc-950/85 backdrop-blur-sm"
              onClick={() => setIsEditing(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 relative z-10 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-zinc-900 dark:text-white text-base">Update Tutorial Video</h3>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-1 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-150 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateVideo} className="flex flex-col gap-4">
                <Input
                  label="YOUTUBE VIDEO LINK OR ID"
                  id="video-url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={videoInputUrl}
                  onChange={(e) => setVideoInputUrl(e.target.value)}
                  icon={<Play className="h-4 w-4 text-zinc-400" />}
                  required
                />
                
                <p className="text-[10px] text-zinc-500 leading-normal">
                  Supported formats: Standard Watch URL, Shareable Short URL (youtu.be), Embed URL, or the raw 11-character Video ID.
                </p>

                <div className="flex justify-end gap-3 mt-2">
                  <Button variant="secondary" type="button" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" isLoading={updating}>
                    <Save className="h-3.5 w-3.5" />
                    Save URL
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
