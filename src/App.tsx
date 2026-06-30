/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./components/AuthContext";
import { ToastProvider, useToast, Button, Badge } from "./components/UI";
import { AuthPage } from "./components/AuthPage";
import { motion, AnimatePresence } from "motion/react";

// Page Components
import { ProjectManager } from "./components/ProjectManager";
import { SecretsManager } from "./components/SecretsManager";
import { SnippetManager } from "./components/SnippetManager";
import { MarkdownNotes } from "./components/MarkdownNotes";
import { ExpenseTracker } from "./components/ExpenseTracker";
import { GitHubTracker } from "./components/GitHubTracker";
import { AIAssistant } from "./components/AIAssistant";
import { BugTracker } from "./components/BugTracker";
import { DeploymentManager } from "./components/DeploymentManager";
import { DocumentationGen } from "./components/DocumentationGen";
import { SettingsPage } from "./components/SettingsPage";
import { NotificationsPage } from "./components/NotificationsPage";

import {
  LayoutDashboard,
  FolderGit2,
  KeyRound,
  FileCode2,
  FileText,
  DollarSign,
  Github,
  Bot,
  Bug,
  Cpu,
  Settings,
  LogOut,
  Terminal,
  Activity,
  Server,
  Network,
  Lock,
  User,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Layers,
  Search,
  BookOpen,
  Loader2,
  Sun,
  Moon,
  Bell
} from "lucide-react";

// Types for navigation
type ActiveTab =
  | "dashboard"
  | "projects"
  | "secrets"
  | "snippets"
  | "notes"
  | "expenses"
  | "github"
  | "ai"
  | "bugs"
  | "deployments"
  | "docs"
  | "settings"
  | "notifications";

export function ArtificialLogo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 60" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Central circle */}
      <circle cx="50" cy="30" r="8" fill="url(#brandGradient)" />
      
      {/* Left connector */}
      <path d="M50 30 C40 30 35 15 25 15 C15 15 15 30 25 30 C35 30 40 30 50 30 Z" fill="url(#brandGradient)" opacity="0.85" />
      <path d="M50 30 C40 30 35 45 25 45 C15 45 15 30 25 30 C35 30 40 30 50 30 Z" fill="url(#brandGradient)" opacity="0.85" />
      
      {/* Right connector */}
      <path d="M50 30 C60 30 65 15 75 15 C85 15 85 30 75 30 C65 30 60 30 50 30 Z" fill="url(#brandGradient)" opacity="0.85" />
      <path d="M50 30 C60 30 65 45 75 45 C85 45 85 30 75 30 C65 30 60 30 50 30 Z" fill="url(#brandGradient)" opacity="0.85" />

      {/* Nodes */}
      <circle cx="25" cy="15" r="9" fill="url(#brandGradient)" />
      <circle cx="25" cy="45" r="9" fill="url(#brandGradient)" />
      <circle cx="75" cy="15" r="9" fill="url(#brandGradient)" />
      <circle cx="75" cy="45" r="9" fill="url(#brandGradient)" />
      <circle cx="50" cy="30" r="9" fill="url(#brandGradient)" />
      
      <defs>
        <linearGradient id="brandGradient" x1="15" y1="15" x2="85" y2="45" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ff7b00" />
          <stop offset="50%" stopColor="#ff5c00" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function DevVaultWorkspace() {
  const { user, logout, apiFetch } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>("dashboard");
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Theme state managed in Workspace
  const [theme, setTheme] = useState<"light" | "dark" | "system">(() => {
    return (localStorage.getItem("devvault_theme") as any) || "dark";
  });

  // Apply Theme effects
  useEffect(() => {
    const root = window.document.documentElement;
    localStorage.setItem("devvault_theme", theme);
    
    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      root.classList.remove("light", "dark");
      root.classList.add(systemTheme);
    } else {
      root.classList.remove("light", "dark");
      root.classList.add(theme);
    }
  }, [theme]);

  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Fetch initial dashboard stats and notifications from real Express backend
  const fetchStats = async () => {
    try {
      const res = await apiFetch("/api/dashboard/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }

      const notifRes = await apiFetch("/api/notifications");
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        const unreadCount = notifData.filter((n: any) => !n.read).length;
        setUnreadNotifications(unreadCount);
      }
    } catch (error) {
      console.error("Failed to load dashboard stats", error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [apiFetch, activeTab]);

  // Hook into Server-Sent Events for Realtime notifications
  useEffect(() => {
    const eventSource = new EventSource("/api/realtime");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "new_notification" || data.type === "my_role_changed" || data.type === "removed_from_project") {
          toast(data.message || "New notification received!", "info");
          fetchStats();
        }
      } catch (err) {
        console.error("SSE parsing error in App:", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [apiFetch]);

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, confirmed: true },
    { id: "projects", label: "Project Manager", icon: <FolderGit2 className="h-4 w-4" />, confirmed: true },
    { id: "secrets", label: "Secrets Manager", icon: <KeyRound className="h-4 w-4" />, confirmed: true },
    { id: "snippets", label: "Snippet Manager", icon: <FileCode2 className="h-4 w-4" />, confirmed: true },
    { id: "notes", label: "Markdown Notes", icon: <FileText className="h-4 w-4" />, confirmed: true },
    { id: "expenses", label: "Expense Tracker", icon: <DollarSign className="h-4 w-4" />, confirmed: true },
    { id: "github", label: "GitHub Tracker", icon: <Github className="h-4 w-4" />, confirmed: true },
    { id: "ai", label: "AI Assistant", icon: <Bot className="h-4 w-4" />, confirmed: true },
    { id: "bugs", label: "Bug Tracker", icon: <Bug className="h-4 w-4" />, confirmed: true },
    { id: "deployments", label: "Deployment Manager", icon: <Cpu className="h-4 w-4" />, confirmed: true },
    { id: "docs", label: "Documentation Gen", icon: <BookOpen className="h-4 w-4" />, confirmed: true },
    { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" />, confirmed: true },
    { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" />, confirmed: true },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-100/50 dark:bg-zinc-950 font-sans text-zinc-800 dark:text-zinc-200 antialiased selection:bg-orange-500/30 transition-colors duration-300 p-3 bg-gradient-to-br from-orange-50/20 to-amber-50/10 dark:from-zinc-950 dark:to-zinc-950 relative">
      {/* Sunbeam gradient top-center */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-[350px] bg-gradient-to-b from-orange-500/10 via-amber-400/5 to-transparent blur-[120px] rounded-full pointer-events-none z-0" />

      {/* Main outer border frame */}
      <div className="flex-1 flex h-full w-full overflow-hidden border-[5px] border-brand-500 rounded-[24px] bg-zinc-50 dark:bg-zinc-950 shadow-2xl relative z-10">
        {/* 1. SIDEBAR NAVIGATION */}
        <aside className="w-64 bg-white/80 dark:bg-zinc-950/60 border-r border-zinc-200 dark:border-zinc-800/80 flex flex-col justify-between shrink-0 backdrop-blur-md transition-colors duration-300 select-none">
          <div className="flex flex-col overflow-hidden">
            {/* Sidebar Header / Brand */}
            <div className="flex items-center gap-1.5 px-4.5 py-4.5 border-b border-zinc-200 dark:border-zinc-800/60">
              <div className="flex items-center justify-center p-1 bg-transparent text-brand-500">
                <ArtificialLogo className="h-7 w-12" />
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-zinc-850 dark:text-white">DevVault</span>
                <span className="block text-[10px] text-zinc-500 font-mono">v1.0.0-beta</span>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as ActiveTab);
                    }}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all group cursor-pointer ${
                      isActive
                        ? "bg-white dark:bg-zinc-800/50 text-zinc-900 dark:text-white border border-zinc-200 dark:border-zinc-700/50 shadow-sm"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-850 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/40 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={isActive ? "text-indigo-650 dark:text-indigo-405" : "text-zinc-400 dark:text-zinc-550 group-hover:text-zinc-650 dark:group-hover:text-zinc-300"}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {item.id === "notifications" && unreadNotifications > 0 && (
                      <span className="bg-indigo-650 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {unreadNotifications}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User Account Section */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-100/10 dark:bg-zinc-900/10 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/30 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-300">
                {user?.name ? user.name[0].toUpperCase() : "U"}
              </div>
              <div className="overflow-hidden">
                <span className="block text-xs font-semibold text-zinc-800 dark:text-white truncate">{user?.name}</span>
                <span className="block text-[10px] text-zinc-500 truncate">{user?.email}</span>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
              title="Lock Wallet"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </aside>

        {/* 2. MAIN CONTENT STAGE */}
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-50/30 dark:bg-zinc-950/30 backdrop-blur-sm relative transition-colors duration-300">
          {/* Background glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/5 blur-[120px] rounded-full pointer-events-none" />

          {/* Global Navbar */}
          <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-8 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm z-10 shrink-0 select-none">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">WORKSPACE</span>
              <ChevronRight className="h-3 w-3 text-zinc-300 dark:text-zinc-700" />
              <Badge variant="violet">DEV_VAULT_STAGE_2</Badge>
            </div>

          <div className="flex items-center gap-4.5">
            {/* Real-time server uptime feedback */}
            {stats?.serverStatus && (
              <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500 bg-white dark:bg-zinc-950/80 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>SYS_UP: {Math.round(stats.serverStatus.uptime)}s</span>
              </div>
            )}
            
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-850" />
            
            {/* Dark / Light Toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer"
              title="Toggle Theme Mode"
            >
              {theme === "dark" ? <Sun className="h-4 w-4 text-brand-500" /> : <Moon className="h-4 w-4 text-brand-600" />}
            </button>

            <Button size="sm" variant="ghost" onClick={() => toast("Quick search global filter integration coming in beta 2!", "info")}>
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Content View Routing Pane */}
        <div className="flex-1 overflow-y-auto p-6 z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="max-w-5xl mx-auto h-full"
            >
              {activeTab === "dashboard" && (
                <div className="flex flex-col gap-6.5">
                  {/* Greeting banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/30 backdrop-blur-md shadow-sm">
                    <div>
                      <h2 className="text-xl font-bold text-zinc-800 dark:text-white tracking-tight flex items-center gap-2">
                        Welcome to DevVault, <span className="text-brand-500">{user?.name}</span>
                        <Sparkles className="h-4 w-4 text-brand-500 animate-pulse" />
                      </h2>
                      <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-1">
                        All modules have been successfully unsealed. Your projects, secrets, API packets, and notes are online and protected.
                      </p>
                    </div>
                    <Badge variant="green">Online & Protected</Badge>
                  </div>

                  {/* Architecture Overview Bento Grid */}
                  <div>
                    <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 tracking-wider font-mono uppercase mb-3">
                      SYSTEM METRICS & BLUEPRINT CORE
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Grid Item 1: Database Specs */}
                      <div className="p-4.5 rounded-xl border border-zinc-205 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/30 flex flex-col justify-between backdrop-blur-sm shadow-sm">
                        <div>
                          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-455 mb-2">
                            <Layers className="h-4.5 w-4.5" />
                            <h4 className="text-xs font-mono font-bold uppercase tracking-wider">
                              Database Layout
                            </h4>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            Active projects config, key pairs, markdown notes, expenditures ledger, and exceptions logged inside <code>server/db.json</code>.
                          </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-zinc-150 dark:border-zinc-800/50 flex justify-between items-center text-[10px] font-mono text-zinc-500">
                          <span>Stored Projects: {stats?.summary?.projectsCount || 0}</span>
                          <span className="text-indigo-650 dark:text-indigo-400 font-bold">ACTIVE</span>
                        </div>
                      </div>

                      {/* Grid Item 2: Backend Microservices */}
                      <div className="p-4.5 rounded-xl border border-zinc-205 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/30 flex flex-col justify-between backdrop-blur-sm shadow-sm">
                        <div>
                          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-455 mb-2">
                            <Activity className="h-4.5 w-4.5" />
                            <h4 className="text-xs font-mono font-bold uppercase tracking-wider">
                              Operational Ledger
                            </h4>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            Secured REST interfaces mapping data models directly to client controls. Cost estimates computed in background runrates.
                          </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-zinc-150 dark:border-zinc-800/50 flex justify-between items-center text-[10px] font-mono text-zinc-500">
                          <span>Monthly Runrate: ${stats?.summary?.monthlyExpensesEstimate || 0}</span>
                          <span className="text-indigo-650 dark:text-indigo-400 font-bold">STABLE</span>
                        </div>
                      </div>

                      {/* Grid Item 3: Encryption Engine */}
                      <div className="p-4.5 rounded-xl border border-zinc-205 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/30 flex flex-col justify-between backdrop-blur-sm shadow-sm">
                        <div>
                          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-455 mb-2">
                            <Lock className="h-4.5 w-4.5" />
                            <h4 className="text-xs font-mono font-bold uppercase tracking-wider">
                              Crypto Vault
                            </h4>
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            Credentials, environment secrets, and configuration keys encrypted symmetrically with PBKDF2 salting.
                          </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-zinc-150 dark:border-zinc-800/50 flex justify-between items-center text-[10px] font-mono text-zinc-500">
                          <span>Active Keys: {stats?.summary?.secretsCount || 0} stored</span>
                          <span className="text-indigo-650 dark:text-indigo-400 font-bold">ARMED</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modules quick access grid */}
                  <div>
                    <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 tracking-wider font-mono uppercase mb-3">
                      WORKSPACE MODULES QUICK LAUNCH
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 select-none">
                      <button onClick={() => setActiveTab("projects")} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/65 dark:bg-zinc-900/10 hover:bg-zinc-100 dark:hover:bg-zinc-900/30 transition-all text-left flex flex-col gap-2 cursor-pointer shadow-sm">
                        <FolderGit2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-bold">Project Manager</span>
                        <span className="text-[10px] text-zinc-500">{stats?.summary?.projectsCount || 0} active</span>
                      </button>
                      
                      <button onClick={() => setActiveTab("secrets")} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/65 dark:bg-zinc-900/10 hover:bg-zinc-100 dark:hover:bg-zinc-900/30 transition-all text-left flex flex-col gap-2 cursor-pointer shadow-sm">
                        <KeyRound className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-bold">Secrets Manager</span>
                        <span className="text-[10px] text-zinc-500">{stats?.summary?.secretsCount || 0} locked</span>
                      </button>

                      <button onClick={() => setActiveTab("snippets")} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/65 dark:bg-zinc-900/10 hover:bg-zinc-100 dark:hover:bg-zinc-900/30 transition-all text-left flex flex-col gap-2 cursor-pointer shadow-sm">
                        <FileCode2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-bold">Snippet Manager</span>
                        <span className="text-[10px] text-zinc-500">{stats?.summary?.snippetsCount || 0} boilerplate</span>
                      </button>

                      <button onClick={() => setActiveTab("notes")} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/65 dark:bg-zinc-900/10 hover:bg-zinc-100 dark:hover:bg-zinc-900/30 transition-all text-left flex flex-col gap-2 cursor-pointer shadow-sm">
                        <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-bold">Markdown Notes</span>
                        <span className="text-[10px] text-zinc-500">{stats?.summary?.notesCount || 0} slates</span>
                      </button>
                    </div>
                  </div>

                  {/* Server Telemetry Monitor */}
                  <div className="bg-white/60 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-5 font-mono">
                    <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Server className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      Runtime Container Telemetry
                    </h4>

                    {loadingStats ? (
                      <div className="flex items-center gap-2 text-xs text-zinc-550 dark:text-zinc-500">
                        <Loader2 className="h-4.5 w-4.5 animate-spin text-indigo-650 dark:text-indigo-400" />
                        <span>Querying server metrics...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-850 p-3 rounded-lg">
                          <span className="text-zinc-450 dark:text-zinc-500 block text-[10px] uppercase">STATUS</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold mt-1 block">ONLINE</span>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-850 p-3 rounded-lg">
                          <span className="text-zinc-450 dark:text-zinc-500 block text-[10px] uppercase">PLATFORM</span>
                          <span className="text-zinc-700 dark:text-zinc-300 font-semibold mt-1 block uppercase">
                            {stats?.serverStatus?.platform || "Linux"}
                          </span>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-850 p-3 rounded-lg">
                          <span className="text-zinc-455 dark:text-zinc-500 block text-[10px] uppercase">NODE VERSION</span>
                          <span className="text-zinc-700 dark:text-zinc-300 font-semibold mt-1 block">
                            {stats?.serverStatus?.nodeVersion || "v20"}
                          </span>
                        </div>
                        <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-zinc-850 p-3 rounded-lg">
                          <span className="text-zinc-455 dark:text-zinc-500 block text-[10px] uppercase">RAM ALLOC</span>
                          <span className="text-zinc-700 dark:text-zinc-300 font-semibold mt-1 block">
                            {stats?.serverStatus?.memory ? `${Math.round(stats.serverStatus.memory.heapUsed / 1024 / 1024)} MB` : "N/A"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Modular views */}
              {activeTab === "projects" && <ProjectManager />}
              {activeTab === "secrets" && <SecretsManager />}
              {activeTab === "snippets" && <SnippetManager />}
              {activeTab === "notes" && <MarkdownNotes />}
              {activeTab === "expenses" && <ExpenseTracker />}
              {activeTab === "github" && <GitHubTracker />}
              {activeTab === "ai" && <AIAssistant />}
              {activeTab === "bugs" && <BugTracker />}
              {activeTab === "deployments" && <DeploymentManager />}
              {activeTab === "docs" && <DocumentationGen />}
              {activeTab === "notifications" && <NotificationsPage onRefreshStats={fetchStats} />}
              {activeTab === "settings" && <SettingsPage theme={theme} setTheme={setTheme} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      </div> {/* extra wrapper end */}
    </div>
  );
}

function MainWorkspace() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-[#0d0c0a] font-mono text-xs text-zinc-550 dark:text-zinc-500 gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
        <span>DECRYPTING VAULT SECTORS...</span>
      </div>
    );
  }

  return user ? <DevVaultWorkspace /> : <AuthPage />;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainWorkspace />
      </AuthProvider>
    </ToastProvider>
  );
}
