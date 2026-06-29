/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useToast, Button, Input, Modal, Badge } from "./UI";
import { Plus, Search, Folder, Key, Eye, EyeOff, Copy, Trash2, ShieldCheck, ShieldAlert, FolderPlus } from "lucide-react";
import { Secret } from "../types";

export const SecretsManager: React.FC = () => {
  const { apiFetch } = useAuth();
  const { toast } = useToast();

  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>("All");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [folder, setFolder] = useState("General");
  const [customFolder, setCustomFolder] = useState("");
  const [showCustomFolderInput, setShowCustomFolderInput] = useState(false);

  // Decrypted values cache
  const [decryptedCache, setDecryptedCache] = useState<{ [id: string]: string }>({});
  const [revealingIds, setRevealingIds] = useState<{ [id: string]: boolean }>({});

  const fetchSecrets = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/secrets");
      if (res.ok) {
        const data = await res.json();
        setSecrets(data);
      }
    } catch (err) {
      console.error(err);
      toast("Failed to load secrets", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecrets();
  }, []);

  const handleOpenCreateModal = () => {
    setLabel("");
    setKey("");
    setValue("");
    setFolder("General");
    setCustomFolder("");
    setShowCustomFolderInput(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label || !key || !value) {
      toast("Please fill in all fields", "error");
      return;
    }

    const finalFolder = showCustomFolderInput ? customFolder.trim() : folder;
    if (!finalFolder) {
      toast("Folder name is required", "error");
      return;
    }

    try {
      const res = await apiFetch("/api/secrets", {
        method: "POST",
        body: JSON.stringify({
          label,
          key,
          value,
          folder: finalFolder,
        }),
      });

      if (res.ok) {
        toast("Secret stored and encrypted successfully!", "success");
        setIsModalOpen(false);
        fetchSecrets();
      } else {
        const data = await res.json();
        toast(data.error || "Failed to store secret", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Failed to store secret", "error");
    }
  };

  const handleToggleReveal = async (id: string) => {
    if (decryptedCache[id]) {
      // Toggle off by removing from cache
      const updated = { ...decryptedCache };
      delete updated[id];
      setDecryptedCache(updated);
      return;
    }

    setRevealingIds((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await apiFetch(`/api/secrets/reveal/${id}`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setDecryptedCache((prev) => ({ ...prev, [id]: data.value }));
      } else {
        toast("Failed to decrypt secret", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error decrypting secret", "error");
    } finally {
      setRevealingIds((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleCopy = (id: string) => {
    const textToCopy = decryptedCache[id];
    if (!textToCopy) return;

    navigator.clipboard.writeText(textToCopy);
    toast("Secret value copied to clipboard!", "success");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this secret?")) return;

    try {
      const res = await apiFetch(`/api/secrets/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast("Secret deleted successfully", "success");
        // Clear cache if needed
        if (decryptedCache[id]) {
          const updated = { ...decryptedCache };
          delete updated[id];
          setDecryptedCache(updated);
        }
        fetchSecrets();
      } else {
        toast("Failed to delete secret", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Failed to delete secret", "error");
    }
  };

  // Get unique folders
  const folders = ["All", ...Array.from(new Set(secrets.map((s) => s.folder || "General")))];

  // Filtering secrets
  const filteredSecrets = secrets.filter((s) => {
    const matchesSearch = s.label.toLowerCase().includes(search.toLowerCase()) || 
      s.key.toLowerCase().includes(search.toLowerCase());
      
    const matchesFolder = selectedFolder === "All" || s.folder === selectedFolder;
    
    return matchesSearch && matchesFolder;
  });

  return (
    <div className="flex flex-col md:flex-row gap-6 w-full pb-10">
      {/* Sidebar for folder directories */}
      <aside className="w-full md:w-56 shrink-0 flex flex-col gap-2.5">
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 font-mono tracking-wider">DIRECTORIES</span>
        </div>
        <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-x-visible gap-1.5 p-1 bg-zinc-100/50 dark:bg-zinc-950/20 md:bg-transparent rounded-xl">
          {folders.map((f) => {
            const isActive = selectedFolder === f;
            const count = f === "All" ? secrets.length : secrets.filter((s) => s.folder === f).length;
            
            return (
              <button
                key={f}
                onClick={() => setSelectedFolder(f)}
                className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-all ${
                  isActive
                    ? "bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/50 text-zinc-900 dark:text-white shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900/30 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Folder className={`h-3.5 w-3.5 ${isActive ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-400 dark:text-zinc-500"}`} />
                  <span>{f}</span>
                </div>
                <Badge variant={isActive ? "violet" : "gray"}>{count}</Badge>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main Panel */}
      <div className="flex-1 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100">Secrets Manager</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Store API keys, database credentials, and SSL certificates encrypted with AES-256-CBC.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={handleOpenCreateModal} className="self-start">
            <Plus className="h-4 w-4" /> Add Secret
          </Button>
        </div>

        {/* Search bar */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search credentials by label or key name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-850 dark:text-zinc-200 pl-9 pr-3 py-2.5 outline-none focus:border-indigo-500/50"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-xs text-zinc-500 font-mono gap-2">
            <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span>UNSEALING CRYPTO VAULT...</span>
          </div>
        ) : filteredSecrets.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-white/20 dark:bg-zinc-900/5">
            <span className="text-zinc-400 dark:text-zinc-500 text-xs font-mono">NO SECRETS STORED</span>
            <p className="text-[11px] text-zinc-450 mt-1 max-w-sm">
              Keep database passwords or API keys safe here, hidden from source control.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSecrets.map((s) => {
              const isRevealed = !!decryptedCache[s.id];
              const isRevealing = revealingIds[s.id];
              
              return (
                <div
                  key={s.id}
                  className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/20 backdrop-blur-sm shadow-sm flex flex-col justify-between gap-3 relative"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="overflow-hidden">
                      <span className="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 block uppercase">{s.folder}</span>
                      <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-200 truncate mt-0.5" title={s.label}>{s.label}</h4>
                      <code className="text-xs text-zinc-900 dark:text-indigo-300 font-bold block mt-1.5 truncate">
                        <Key className="h-3 w-3 inline mr-1 text-zinc-400" />
                        {s.key}
                      </code>
                    </div>

                    <Button variant="danger" size="sm" onClick={() => handleDelete(s.id)} title="Delete Secret" className="p-1.5">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Masked/Unmasked Value Area */}
                  <div className="flex items-center justify-between gap-2 bg-zinc-50 dark:bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-850 font-mono text-[11px] w-full overflow-hidden">
                    <span className="text-zinc-600 dark:text-zinc-300 select-all truncate flex-1 pr-2">
                      {isRevealed ? decryptedCache[s.id] : "••••••••••••••••"}
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleReveal(s.id)}
                        isLoading={isRevealing}
                        className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-900"
                        title={isRevealed ? "Hide Secret" : "Decrypt Secret"}
                      >
                        {isRevealed ? <EyeOff className="h-3.5 w-3.5 text-zinc-550" /> : <Eye className="h-3.5 w-3.5 text-indigo-500" />}
                      </Button>

                      {isRevealed && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCopy(s.id)}
                          className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-900"
                          title="Copy decrypted value"
                        >
                          <Copy className="h-3.5 w-3.5 text-zinc-550" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Secure Encrypted Secret"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">SECRET FOLDER</span>
            <div className="flex gap-2">
              {!showCustomFolderInput ? (
                <>
                  <select
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                    className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-800 dark:text-zinc-200 p-2.5 outline-none"
                  >
                    <option value="General">General</option>
                    <option value="API Keys">API Keys</option>
                    <option value="Databases">Databases</option>
                    <option value="Production">Production</option>
                    <option value="Staging">Staging</option>
                    {/* Add existing folders dynamically */}
                    {Array.from(new Set(secrets.map((s) => s.folder).filter(Boolean))).map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="accent"
                    size="sm"
                    onClick={() => setShowCustomFolderInput(true)}
                    title="Create custom folder name"
                  >
                    <FolderPlus className="h-4 w-4" /> Custom
                  </Button>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="E.g., Webhooks, AWS-S3"
                    value={customFolder}
                    onChange={(e) => setCustomFolder(e.target.value)}
                    className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-850 dark:text-zinc-200 px-3 py-2 outline-none"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowCustomFolderInput(false)}
                  >
                    Use List
                  </Button>
                </>
              )}
            </div>
          </div>

          <Input
            label="SECRET LABEL"
            placeholder="E.g., Stripe Sandbox Secret Key"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />

          <Input
            label="VARIABLE KEY NAME"
            placeholder="E.g., STRIPE_SECRET_KEY"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            required
            className="font-mono"
          />

          <Input
            label="SECRET VALUE (PLAINTEXT)"
            placeholder="E.g., sk_test_51Nx..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
            type="password"
          />

          <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 rounded-lg text-[10px] text-indigo-750 dark:text-indigo-400 font-mono">
            <ShieldCheck className="h-4 w-4 text-indigo-500 shrink-0 animate-pulse" />
            <span>Encrypted with a derived 256-bit PBKDF2 Master Key key-stream prior to JSON writing.</span>
          </div>

          <Button type="submit" variant="primary" className="mt-2 py-3">
            Secure Crypt & Store
          </Button>
        </form>
      </Modal>
    </div>
  );
};
