/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useToast, Button, Badge } from "./UI";
import { FileText, Copy, Save, Sparkles, BookOpen, Settings2, FileCode, CheckCircle, RefreshCcw, Loader2 } from "lucide-react";
import { Project } from "../types";

export const DocumentationGen: React.FC = () => {
  const { apiFetch } = useAuth();
  const { toast } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  
  // Doc Config
  const [template, setTemplate] = useState("readme");
  const [guidelines, setGuidelines] = useState("");
  
  // Generation output state
  const [generating, setGenerating] = useState(false);
  const [generationOutput, setGenerationOutput] = useState("");
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);

  useEffect(() => {
    async function loadProjects() {
      setLoadingProjects(true);
      try {
        const res = await apiFetch("/api/projects");
        if (res.ok) {
          const data = await res.json();
          setProjects(data);
          if (data.length > 0) {
            setSelectedProjectId(data[0].id);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingProjects(false);
      }
    }
    loadProjects();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      toast("Please select a project", "error");
      return;
    }

    const proj = projects.find((p) => p.id === selectedProjectId);
    if (!proj) return;

    setGenerating(true);
    setGenerationOutput("");
    setSavedNoteId(null);

    const templatePrompts: { [key: string]: string } = {
      readme: "Generate a standard README.md containing project title, high-level description, prerequisites, detailed step-by-step setup guides, run scripts, testing directives, and folder layouts.",
      api: "Generate a comprehensive API Reference specifications document in Markdown containing REST resource tables, headers, payload inputs, status responses, and error handlers.",
      arch: "Generate a deep-dive Technical Architecture Specifications report detailing service design, database schemas, encryption algorithms, credentials packets, and hosting topology.",
      guide: "Generate a Getting Started Developer Onboarding Guide including workspace configuration, env declarations, database seeding scripts, and common terminal CLI workflow commands.",
    };

    const templateNames: { [key: string]: string } = {
      readme: "README.md",
      api: "API Specifications Guide",
      arch: "Technical Architecture Guide",
      guide: "Developer Getting Started Guide",
    };

    const message = `Please write a highly polished, production-ready, Markdown-formatted ${templateNames[template]} document.
    
    Instruction details: ${templatePrompts[template]}
    Additional user guidelines to strictly follow: ${guidelines || "none"}.
    
    Here are the project variables:
    - Name: ${proj.name}
    - Description: ${proj.description}
    - Tech Stack: ${proj.techStack?.join(", ") || "none"}
    - Database: ${proj.database || "N/A"}
    - Server Host: ${proj.server || "N/A"}
    - Domain URL: ${proj.liveUrl || "N/A"}`;

    try {
      const res = await apiFetch("/api/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          message,
          contextType: "project",
          contextData: {
            name: proj.name,
            techStack: proj.techStack,
            description: proj.description,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setGenerationOutput(data.reply);
        toast("Documentation generated successfully!", "success");
      } else {
        const data = await res.json();
        toast(data.error || "Failed to generate docs", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Failed to call AI assistant. Confirm API key is set.", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generationOutput) return;
    navigator.clipboard.writeText(generationOutput);
    toast("Documentation copied to clipboard!", "success");
  };

  const handleSaveAsNote = async () => {
    if (!generationOutput) return;
    const proj = projects.find((p) => p.id === selectedProjectId);
    const title = proj ? `${proj.name} - ${template.toUpperCase()}` : `${template.toUpperCase()} Doc`;

    try {
      const res = await apiFetch("/api/notes", {
        method: "POST",
        body: JSON.stringify({
          title,
          content: generationOutput,
          folder: "Documentation",
          tags: ["AI-Generated", template],
          isFavorite: false,
        }),
      });

      if (res.ok) {
        const newNote = await res.json();
        setSavedNoteId(newNote.id);
        toast("Saved directly to Markdown Notes!", "success");
      } else {
        toast("Failed to save note", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error saving note", "error");
    }
  };

  const selectedProjectObj = projects.find((p) => p.id === selectedProjectId);

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100">AI Documentation Generator</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          Generate comprehensive READMEs, architectural blueprints, or API reference guides powered by Gemini.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Input Configuration Form */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/20 backdrop-blur-sm shadow-sm flex flex-col gap-4 select-none">
          <div className="flex items-center gap-2 border-b border-zinc-150 dark:border-zinc-850 pb-2">
            <Settings2 className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200 font-mono">SPECIFICATIONS</span>
          </div>

          <form onSubmit={handleGenerate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">SELECT TARGET PROJECT *</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                required
                className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 p-2.5 outline-none font-sans"
              >
                {loadingProjects ? (
                  <option value="">Querying projects...</option>
                ) : projects.length === 0 ? (
                  <option value="">No projects registered yet</option>
                ) : (
                  projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)
                )}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">DOCUMENT TEMPLATE *</label>
              <select
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                required
                className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 p-2.5 outline-none font-sans"
              >
                <option value="readme">Standard README.md</option>
                <option value="api">API Endpoint Reference Specifications</option>
                <option value="arch">Technical Architecture Blueprint</option>
                <option value="guide">Getting Started Developer Guide</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">ADDITIONAL PROMPT GUIDELINES</label>
              <textarea
                placeholder="E.g., Include environment variable declarations, emphasize JWT authorization filters, specify SQLite db..."
                value={guidelines}
                onChange={(e) => setGuidelines(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-800 dark:text-zinc-100 placeholder-zinc-450 dark:placeholder-zinc-650 focus:border-indigo-500/50 transition-all outline-none p-3 min-h-[80px]"
              />
            </div>

            {selectedProjectObj && (
              <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-850 bg-zinc-50 dark:bg-zinc-950/40 text-[11px] leading-relaxed flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 font-mono">WORKSPACE CONTEXT INJECTED</span>
                <div>
                  <span className="font-bold block">Tech Stack:</span>
                  <span className="text-zinc-550 dark:text-zinc-400 font-mono">{selectedProjectObj.techStack?.join(", ") || "none"}</span>
                </div>
                <div>
                  <span className="font-bold block">Database:</span>
                  <span className="text-zinc-550 dark:text-zinc-400 font-mono">{selectedProjectObj.database || "N/A"}</span>
                </div>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={generating || projects.length === 0}
              className="py-3 font-semibold w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Drafting Doc...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Generate Developer Doc
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Right Output Window */}
        <div className="lg:col-span-3 flex flex-col min-h-[400px] border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/10 backdrop-blur-sm rounded-xl overflow-hidden relative">
          <header className="p-4 border-b border-zinc-200 dark:border-zinc-850 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-950/20 shrink-0 select-none">
            <span className="text-xs font-bold text-zinc-700 dark:text-zinc-200 font-mono flex items-center gap-1.5">
              <FileCode className="h-4 w-4 text-indigo-400" /> OUTPUT PREVIEW (MARKDOWN)
            </span>

            {generationOutput && (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={handleCopy} className="text-[10px] border border-zinc-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-950 px-2 py-1">
                  <Copy className="h-3.5 w-3.5" /> Copy
                </Button>
                
                {savedNoteId ? (
                  <Badge variant="green">
                    <CheckCircle className="h-3 w-3 inline mr-1" /> Saved
                  </Badge>
                ) : (
                  <Button size="sm" variant="accent" onClick={handleSaveAsNote} className="text-[10px] px-2 py-1">
                    <Save className="h-3.5 w-3.5" /> Save to Notes
                  </Button>
                )}
              </div>
            )}
          </header>

          <div className="flex-1 overflow-y-auto p-5 select-text">
            {generating ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-zinc-400 dark:text-zinc-500 font-mono text-[10.5px]">
                <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <div className="flex flex-col items-center text-center">
                  <span>PROMPT COMPILED</span>
                  <span>WAITING FOR GEMINI RESPONSE PACKETS...</span>
                </div>
              </div>
            ) : generationOutput ? (
              <pre className="text-xs font-mono text-zinc-800 dark:text-zinc-300 whitespace-pre-wrap select-text leading-relaxed font-sans">{generationOutput}</pre>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center text-zinc-400 dark:text-zinc-500 font-mono text-xs gap-2 select-none">
                <FileText className="h-8 w-8 text-zinc-300 dark:text-zinc-750" />
                <span>DOCUMENT REPOSITORY EMPTY</span>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-sans mt-0.5 max-w-xs">
                  Compile parameters and submit an AI generation query on the left.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
