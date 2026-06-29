/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { useToast, Button } from "./UI";
import { Send, Bot, User, Code2, Sparkles, FolderGit2, Trash2, Cpu, MessageSquare } from "lucide-react";
import { Project, Snippet } from "../types";

interface Message {
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}

export const AIAssistant: React.FC = () => {
  const { apiFetch } = useAuth();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "ai",
      text: "Hello! I am your DevVault AI Assistant. I can help you write code, design API endpoints, optimize databases, or build architectures. Choose a project or code snippet context to begin!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  // Context Selection
  const [contextType, setContextType] = useState<"none" | "project" | "code">("none");
  const [projects, setProjects] = useState<Project[]>([]);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedSnippetId, setSelectedSnippetId] = useState("");

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Scroll to bottom of chat
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Load projects and snippets for context selection
  useEffect(() => {
    async function loadData() {
      try {
        const projRes = await apiFetch("/api/projects");
        if (projRes.ok) {
          const projData = await projRes.json();
          setProjects(projData);
          if (projData.length > 0) setSelectedProjectId(projData[0].id);
        }

        const snipRes = await apiFetch("/api/snippets");
        if (snipRes.ok) {
          const snipData = await snipRes.json();
          setSnippets(snipData);
          if (snipData.length > 0) setSelectedSnippetId(snipData[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  }, []);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prompt = input.trim();
    if (!prompt || sending) return;

    // Build context
    let contextData = null;
    if (contextType === "project" && selectedProjectId) {
      const proj = projects.find((p) => p.id === selectedProjectId);
      if (proj) {
        contextData = {
          name: proj.name,
          techStack: proj.techStack,
          description: proj.description,
        };
      }
    } else if (contextType === "code" && selectedSnippetId) {
      const snip = snippets.find((s) => s.id === selectedSnippetId);
      if (snip) {
        contextData = {
          title: snip.title,
          language: snip.language,
          code: snip.code,
        };
      }
    }

    // Add user message
    const userMsg: Message = { sender: "user", text: prompt, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await apiFetch("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          message: prompt,
          contextType,
          contextData,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg: Message = { sender: "ai", text: data.reply, timestamp: new Date() };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        const errData = await res.json();
        toast(errData.error || "AI Response Failed", "error");
      }
    } catch (err: any) {
      console.error(err);
      toast("AI Assistant failed to respond: check API key configuration.", "error");
    } finally {
      setSending(false);
    }
  };

  const handleClearChat = () => {
    if (confirm("Clear current conversation history?")) {
      setMessages([
        {
          sender: "ai",
          text: "Conversation cleared. Ready to assist!",
          timestamp: new Date(),
        },
      ]);
    }
  };

  // Simple Markdown block renderer inside bubbles
  const renderMessageContent = (text: string) => {
    // Regex for markdown code block parsing
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, i) => {
      if (part.startsWith("```")) {
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        const lang = match ? match[1] : "";
        const code = match ? match[2] : part.slice(3, -3);

        const handleCopyCode = () => {
          navigator.clipboard.writeText(code);
          toast("Code copied!", "success");
        };

        return (
          <div key={i} className="my-3 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 text-[11px] text-zinc-300 font-mono relative group select-text">
            <div className="flex items-center justify-between px-3.5 py-1.5 bg-zinc-900 border-b border-zinc-800 text-[10px] text-zinc-500 font-semibold select-none">
              <span>{lang.toUpperCase() || "CODE"}</span>
              <button onClick={handleCopyCode} className="hover:text-white cursor-pointer transition-colors">
                Copy
              </button>
            </div>
            <pre className="p-4 overflow-x-auto select-text">{code.trim()}</pre>
          </div>
        );
      }

      // Inline markdown tags mapping
      let inlineText = part
        .replace(/`([^`]+)`/g, '<code class="bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 px-1 py-0.5 rounded text-indigo-650 dark:text-indigo-400 font-mono text-[10.5px]">$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

      return (
        <span
          key={i}
          className="whitespace-pre-wrap select-text leading-relaxed text-xs block"
          dangerouslySetInnerHTML={{ __html: inlineText }}
        />
      );
    });
  };

  return (
    <div className="flex flex-col gap-4 w-full h-[calc(100vh-10rem)] pb-3">
      {/* AI Context Configuration Header */}
      <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/10 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 select-none">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <Sparkles className="h-4 w-4 text-indigo-500 animate-pulse" />
            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 font-mono">AI CONTEXT</span>
          </div>

          <select
            value={contextType}
            onChange={(e) => setContextType(e.target.value as any)}
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 px-2 py-1.5 outline-none font-sans"
          >
            <option value="none">No Context Prompt</option>
            <option value="project">Project Details</option>
            <option value="code">Boilerplate Code</option>
          </select>

          {/* Conditional selects */}
          {contextType === "project" && (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 px-2 py-1.5 outline-none font-sans max-w-xs"
            >
              {projects.length === 0 ? (
                <option value="">No projects found</option>
              ) : (
                projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)
              )}
            </select>
          )}

          {contextType === "code" && (
            <select
              value={selectedSnippetId}
              onChange={(e) => setSelectedSnippetId(e.target.value)}
              className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-700 dark:text-zinc-300 px-2 py-1.5 outline-none font-sans max-w-xs"
            >
              {snippets.length === 0 ? (
                <option value="">No snippets found</option>
              ) : (
                snippets.map((s) => <option key={s.id} value={s.id}>{s.title} ({s.language})</option>)
              )}
            </select>
          )}
        </div>

        <Button variant="ghost" size="sm" onClick={handleClearChat} className="self-end text-zinc-500 hover:text-red-500 hover:bg-red-500/10">
          <Trash2 className="h-4 w-4" /> Clear History
        </Button>
      </div>

      {/* Main chat window container */}
      <div className="flex-1 flex flex-col min-h-0 bg-white/60 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800 rounded-xl relative overflow-hidden">
        {/* Chat bubbles list */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {messages.map((m, idx) => {
            const isUser = m.sender === "user";
            return (
              <div
                key={idx}
                className={`flex gap-3 max-w-[85%] ${
                  isUser ? "self-end flex-row-reverse" : "self-start"
                }`}
              >
                {/* Avatar */}
                <div className={`h-8 w-8 rounded-full border shrink-0 flex items-center justify-center text-xs font-bold ${
                  isUser
                    ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-850 text-indigo-600 dark:text-indigo-400"
                    : "bg-zinc-100 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300"
                }`}>
                  {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-indigo-500" />}
                </div>

                {/* Content Bubble */}
                <div className={`p-3.5 rounded-xl border text-xs ${
                  isUser
                    ? "bg-indigo-600 border-transparent text-white shadow-md shadow-indigo-500/10 rounded-tr-none"
                    : "bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-850 text-zinc-850 dark:text-zinc-250 rounded-tl-none"
                }`}>
                  {isUser ? (
                    <span className="whitespace-pre-wrap select-text leading-relaxed text-xs block">{m.text}</span>
                  ) : (
                    renderMessageContent(m.text)
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {sending && (
            <div className="flex gap-3 self-start max-w-[80%]">
              <div className="h-8 w-8 rounded-full border shrink-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
                <Bot className="h-4 w-4 text-indigo-500 animate-pulse" />
              </div>
              <div className="p-3.5 rounded-xl rounded-tl-none border border-zinc-200 dark:border-zinc-850 bg-white dark:bg-zinc-900/50 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 bg-zinc-400 rounded-full animate-bounce" />
                <span className="h-1.5 w-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="h-1.5 w-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar Form */}
        <form onSubmit={handleSend} className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/20 flex gap-3.5 shrink-0 select-none">
          <input
            type="text"
            placeholder={
              contextType === "project" ? "Ask a question about the active project..." :
              contextType === "code" ? "Ask about optimization or refactoring the code snippet..." :
              "Ask anything about systems engineering, docker, node..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
            className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 px-3.5 py-2.5 outline-none focus:border-indigo-500/50 disabled:opacity-50"
          />
          <Button type="submit" variant="primary" disabled={sending || !input.trim()} className="px-4.5">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
