/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { dbManager, encrypt, decrypt } from "./db";
import { signToken, verifyToken, hashPassword, verifyPassword } from "./auth";
import { User, Project, Secret, Snippet, Note, Expense, RepositoryTracker, Bug, Deployment, ProjectStatus, ProjectPriority, ExpenseType, BugStatus } from "./types";
import { GoogleGenAI } from "@google/genai";

export const apiRouter = Router();

// Middleware to require authentication
export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);

  if (!payload || !payload.userId) {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }

  const user = dbManager.getUserById(payload.userId);
  if (!user) {
    return res.status(401).json({ error: "Unauthorized: User not found" });
  }

  req.user = user;
  next();
}

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

apiRouter.post("/auth/register", (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const existingUser = dbManager.getUserByEmail(email);
  if (existingUser) {
    return res.status(400).json({ error: "Email is already registered" });
  }

  const newUser: User = {
    id: crypto.randomUUID(),
    email: email.trim().toLowerCase(),
    passwordHash: hashPassword(password),
    name: name.trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  dbManager.createUser(newUser);

  const token = signToken({ userId: newUser.id });
  const { passwordHash, ...userResponse } = newUser;
  res.status(201).json({ token, user: userResponse });
});

apiRouter.post("/auth/login", (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user = dbManager.getUserByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signToken({ userId: user.id });
  const { passwordHash, ...userResponse } = user;
  res.json({ token, user: userResponse });
});

apiRouter.get("/auth/me", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const { passwordHash, ...userResponse } = req.user;
  res.json({ user: userResponse });
});

apiRouter.post("/auth/change-password", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current password and new password are required" });
  }

  if (!verifyPassword(currentPassword, req.user.passwordHash)) {
    return res.status(400).json({ error: "Incorrect current password" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters long" });
  }

  const db = dbManager.getRawData();
  const index = db.users.findIndex((u) => u.id === req.user!.id);
  if (index !== -1) {
    db.users[index].passwordHash = hashPassword(newPassword);
    db.users[index].updatedAt = new Date().toISOString();
    dbManager.importRawData(db);
    return res.json({ message: "Password updated successfully" });
  }

  res.status(500).json({ error: "Failed to update password" });
});

// ==========================================
// SYSTEM STATS / DASHBOARD INFO (MODULE 1)
// ==========================================
apiRouter.get("/dashboard/stats", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const projects = dbManager.getProjects(userId);
  const secrets = dbManager.getSecrets(userId);
  const snippets = dbManager.getSnippets(userId);
  const notes = dbManager.getNotes(userId);
  const expenses = dbManager.getExpenses(userId);
  const repos = dbManager.getRepositories(userId);
  const bugs = dbManager.getBugs(userId);

  // Compute monthly and yearly costs
  let monthlyExpenses = 0;
  let yearlyExpenses = 0;

  expenses.forEach((e) => {
    if (e.billingCycle === "monthly") {
      monthlyExpenses += e.cost;
      yearlyExpenses += e.cost * 12;
    } else if (e.billingCycle === "yearly") {
      monthlyExpenses += e.cost / 12;
      yearlyExpenses += e.cost;
    } else if (e.billingCycle === "one-time") {
      monthlyExpenses += e.cost; // assume current month
      yearlyExpenses += e.cost;
    }
  });

  const activeProjectsCount = projects.filter(p => p.status === ProjectStatus.IN_PROGRESS).length;
  const openBugsCount = bugs.filter(b => b.status === BugStatus.OPEN || b.status === BugStatus.WORKING).length;

  res.json({
    summary: {
      projectsCount: projects.length,
      activeProjectsCount,
      secretsCount: secrets.length,
      snippetsCount: snippets.length,
      notesCount: notes.length,
      expensesCount: expenses.length,
      monthlyExpensesEstimate: Math.round(monthlyExpenses * 100) / 100,
      yearlyExpensesEstimate: Math.round(yearlyExpenses * 100) / 100,
      reposCount: repos.length,
      bugsCount: bugs.length,
      openBugsCount
    },
    recentNotes: notes.slice(-4).reverse(),
    recentProjects: projects.slice(-4).reverse(),
    serverStatus: {
      status: "online",
      nodeVersion: process.version,
      uptime: process.uptime(),
      platform: process.platform,
      memory: process.memoryUsage()
    }
  });
});

// ==========================================
// PROJECT MANAGER ENDPOINTS (MODULE 2)
// ==========================================
apiRouter.get("/projects", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json(dbManager.getProjects(req.user!.id));
});

apiRouter.post("/projects", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const {
    name, description, status, techStack, deadline, priority,
    repository, liveUrl, server, database, domain, apiKeys, notes, progress, attachments, tags
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Project name is required" });
  }

  const encryptedKeys = apiKeys ? encrypt(JSON.stringify(apiKeys)) : encrypt("{}");

  const newProject: Project = {
    id: crypto.randomUUID(),
    userId: req.user!.id,
    name: name.trim(),
    description: (description || "").trim(),
    status: status || ProjectStatus.PLANNING,
    techStack: techStack || [],
    deadline: deadline || "",
    priority: priority || ProjectPriority.MEDIUM,
    repository: repository || "",
    liveUrl: liveUrl || "",
    server: server || "",
    database: database || "",
    domain: domain || "",
    apiKeys: encryptedKeys,
    notes: notes || "",
    progress: progress !== undefined ? Number(progress) : 0,
    attachments: attachments || [],
    tags: tags || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  dbManager.createProject(newProject);
  res.status(201).json(newProject);
});

apiRouter.put("/projects/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const updates = { ...req.body };

  // If updating API Keys, encrypt them
  if (updates.apiKeys) {
    updates.apiKeys = encrypt(JSON.stringify(updates.apiKeys));
  }

  const updated = dbManager.updateProject(id, req.user!.id, updates);
  if (!updated) {
    return res.status(404).json({ error: "Project not found" });
  }
  res.json(updated);
});

apiRouter.get("/projects/:id/reveal-keys", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const project = dbManager.getProjectById(id, req.user!.id);
  if (!project) {
    return res.status(404).json({ error: "Project not found" });
  }
  try {
    const decryptedStr = decrypt(project.apiKeys);
    res.json(JSON.parse(decryptedStr));
  } catch (error) {
    res.json({});
  }
});

apiRouter.delete("/projects/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const success = dbManager.deleteProject(req.params.id, req.user!.id);
  if (!success) {
    return res.status(404).json({ error: "Project not found" });
  }
  res.json({ message: "Project deleted successfully" });
});

// ==========================================
// SECURE SECRETS MANAGER ENDPOINTS (MODULE 3)
// ==========================================
apiRouter.get("/secrets", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  // Return list of secrets but NEVER return plain values.
  const list = dbManager.getSecrets(req.user!.id);
  const sanitized = list.map((s) => ({
    id: s.id,
    label: s.label,
    key: s.key,
    folder: s.folder,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt
  }));
  res.json(sanitized);
});

apiRouter.post("/secrets", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { label, key, value, folder } = req.body;
  if (!label || !key || !value) {
    return res.status(400).json({ error: "Label, key, and value are required" });
  }

  const newSecret: Secret = {
    id: crypto.randomUUID(),
    userId: req.user!.id,
    label: label.trim(),
    key: key.trim(),
    encryptedValue: encrypt(value),
    folder: folder || "General",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  dbManager.createSecret(newSecret);
  res.status(201).json({
    id: newSecret.id,
    label: newSecret.label,
    key: newSecret.key,
    folder: newSecret.folder,
    createdAt: newSecret.createdAt
  });
});

apiRouter.post("/secrets/reveal/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const secrets = dbManager.getSecrets(req.user!.id);
  const secret = secrets.find((s) => s.id === req.params.id);
  if (!secret) {
    return res.status(404).json({ error: "Secret not found" });
  }
  const plainValue = decrypt(secret.encryptedValue);
  res.json({ value: plainValue });
});

apiRouter.delete("/secrets/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const success = dbManager.deleteSecret(req.params.id, req.user!.id);
  if (!success) {
    return res.status(404).json({ error: "Secret not found" });
  }
  res.json({ message: "Secret deleted successfully" });
});

// ==========================================
// SNIPPET ENDPOINTS (MODULE 4)
// ==========================================
apiRouter.get("/snippets", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json(dbManager.getSnippets(req.user!.id));
});

apiRouter.post("/snippets", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { title, code, language, tags, folder, isFavorite } = req.body;
  if (!title || !code) {
    return res.status(400).json({ error: "Title and code are required" });
  }

  const newSnippet: Snippet = {
    id: crypto.randomUUID(),
    userId: req.user!.id,
    title: title.trim(),
    code,
    language: language || "javascript",
    tags: tags || [],
    folder: folder || "General",
    isFavorite: !!isFavorite,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  dbManager.createSnippet(newSnippet);
  res.status(201).json(newSnippet);
});

apiRouter.put("/snippets/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const updated = dbManager.updateSnippet(req.params.id, req.user!.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: "Snippet not found" });
  }
  res.json(updated);
});

apiRouter.delete("/snippets/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const success = dbManager.deleteSnippet(req.params.id, req.user!.id);
  if (!success) {
    return res.status(404).json({ error: "Snippet not found" });
  }
  res.json({ message: "Snippet deleted" });
});

// ==========================================
// MARKDOWN NOTES ENDPOINTS (MODULE 5)
// ==========================================
apiRouter.get("/notes", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json(dbManager.getNotes(req.user!.id));
});

apiRouter.post("/notes", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { title, content, folder, tags, isFavorite } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }

  const newNote: Note = {
    id: crypto.randomUUID(),
    userId: req.user!.id,
    title: title.trim(),
    content: content || "",
    folder: folder || "General",
    tags: tags || [],
    isFavorite: !!isFavorite,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  dbManager.createNote(newNote);
  res.status(201).json(newNote);
});

apiRouter.put("/notes/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const updated = dbManager.updateNote(req.params.id, req.user!.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: "Note not found" });
  }
  res.json(updated);
});

apiRouter.delete("/notes/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const success = dbManager.deleteNote(req.params.id, req.user!.id);
  if (!success) {
    return res.status(404).json({ error: "Note not found" });
  }
  res.json({ message: "Note deleted successfully" });
});

// ==========================================
// EXPENSE ENDPOINTS (MODULE 6)
// ==========================================
apiRouter.get("/expenses", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json(dbManager.getExpenses(req.user!.id));
});

apiRouter.post("/expenses", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { label, type, cost, billingCycle, nextRenewal, description } = req.body;
  if (!label || !cost) {
    return res.status(400).json({ error: "Label and cost are required" });
  }

  const newExpense: Expense = {
    id: crypto.randomUUID(),
    userId: req.user!.id,
    label: label.trim(),
    type: type || ExpenseType.OTHER,
    cost: Number(cost),
    billingCycle: billingCycle || "monthly",
    nextRenewal: nextRenewal || "",
    description: description || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  dbManager.createExpense(newExpense);
  res.status(201).json(newExpense);
});

apiRouter.delete("/expenses/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const success = dbManager.deleteExpense(req.params.id, req.user!.id);
  if (!success) {
    return res.status(404).json({ error: "Expense not found" });
  }
  res.json({ message: "Expense deleted" });
});

// ==========================================
// GITHUB TRACKER ENDPOINTS (MODULE 7)
// ==========================================
apiRouter.get("/repositories", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json(dbManager.getRepositories(req.user!.id));
});

apiRouter.post("/repositories", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { name, url, branch } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: "Repository name and URL are required" });
  }

  // Simulate repository tracking stats
  const newRepo: RepositoryTracker = {
    id: crypto.randomUUID(),
    userId: req.user!.id,
    name: name.trim(),
    url: url.trim(),
    branch: branch || "main",
    stars: Math.floor(Math.random() * 250) + 12,
    issues: Math.floor(Math.random() * 20) + 2,
    commits: Math.floor(Math.random() * 500) + 50,
    openPr: Math.floor(Math.random() * 5),
    latestRelease: "v1.0.0",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  dbManager.createRepository(newRepo);
  res.status(201).json(newRepo);
});

apiRouter.delete("/repositories/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const success = dbManager.deleteRepository(req.params.id, req.user!.id);
  if (!success) {
    return res.status(404).json({ error: "Repository not found" });
  }
  res.json({ message: "Repository tracking stopped" });
});

// ==========================================
// BUG TRACKER ENDPOINTS (MODULE 9)
// ==========================================
apiRouter.get("/bugs", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json(dbManager.getBugs(req.user!.id));
});

apiRouter.post("/bugs", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { title, description, priority, status, projectId } = req.body;
  if (!title || !projectId) {
    return res.status(400).json({ error: "Title and Project ID are required" });
  }

  const newBug: Bug = {
    id: crypto.randomUUID(),
    userId: req.user!.id,
    projectId,
    title: title.trim(),
    description: description || "",
    priority: priority || ProjectPriority.MEDIUM,
    status: status || BugStatus.OPEN,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  dbManager.createBug(newBug);
  res.status(201).json(newBug);
});

apiRouter.put("/bugs/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const updated = dbManager.updateBug(req.params.id, req.user!.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: "Bug not found" });
  }
  res.json(updated);
});

apiRouter.delete("/bugs/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const success = dbManager.deleteBug(req.params.id, req.user!.id);
  if (!success) {
    return res.status(404).json({ error: "Bug not found" });
  }
  res.json({ message: "Bug deleted" });
});

// ==========================================
// DEPLOYMENT MANAGER ENDPOINTS (MODULE 10)
// ==========================================
apiRouter.get("/deployments", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json(dbManager.getDeployments(req.user!.id));
});

apiRouter.post("/deployments", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { projectId, frontendUrl, backendUrl, platform, notes } = req.body;
  if (!projectId || !platform) {
    return res.status(400).json({ error: "Project ID and Platform are required" });
  }

  const newDeployment: Deployment = {
    id: crypto.randomUUID(),
    userId: req.user!.id,
    projectId,
    frontendUrl: frontendUrl || "",
    backendUrl: backendUrl || "",
    platform,
    notes: notes || "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  dbManager.createDeployment(newDeployment);
  res.status(201).json(newDeployment);
});

apiRouter.put("/deployments/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const updated = dbManager.updateDeployment(req.params.id, req.user!.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: "Deployment not found" });
  }
  res.json(updated);
});

apiRouter.delete("/deployments/:id", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const success = dbManager.deleteDeployment(req.params.id, req.user!.id);
  if (!success) {
    return res.status(404).json({ error: "Deployment not found" });
  }
  res.json({ message: "Deployment deleted" });
});

// ==========================================
// AI ASSISTANT ENDPOINT (MODULE 8)
// ==========================================
apiRouter.post("/ai/chat", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { message, contextType, contextData } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key is not configured in environment." });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Enhance prompt with optional developer context
    let systemInstruction = "You are DevVault AI, an expert software developer and technical assistant. Provide accurate, polished, production-ready code blocks and concise solutions.";
    let finalPrompt = message;

    if (contextType === "project" && contextData) {
      systemInstruction += `\n\nContext: The user is working on a software project named "${contextData.name}". Tech Stack: ${JSON.stringify(contextData.techStack)}. Description: ${contextData.description}.`;
    } else if (contextType === "code" && contextData) {
      systemInstruction += `\n\nContext: The user is analyzing this snippet of code (language: ${contextData.language || "unknown"}):\n\`\`\`\n${contextData.code}\n\`\`\``;
    }

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: finalPrompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ reply: result.text || "I was unable to generate a response." });
  } catch (error: any) {
    console.error("Gemini API call failed:", error);
    res.status(500).json({ error: "AI Assistant failed to respond: " + (error.message || String(error)) });
  }
});

// ==========================================
// SETTINGS IMPORT/EXPORT
// ==========================================
apiRouter.get("/settings/export", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const fullData = dbManager.getRawData();
  // Filter data specifically for the logged-in user
  const userId = req.user!.id;
  const exportedData = {
    projects: fullData.projects.filter(p => p.userId === userId),
    secrets: fullData.secrets.filter(s => s.userId === userId),
    snippets: fullData.snippets.filter(s => s.userId === userId),
    notes: fullData.notes.filter(n => n.userId === userId),
    expenses: fullData.expenses.filter(e => e.userId === userId),
    repositories: fullData.repositories.filter(r => r.userId === userId),
    bugs: fullData.bugs.filter(b => b.userId === userId),
    deployments: fullData.deployments.filter(d => d.userId === userId)
  };
  res.setHeader("Content-Disposition", `attachment; filename=devvault-export-${userId}.json`);
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(exportedData, null, 2));
});

apiRouter.post("/settings/import", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { importedData } = req.body;
  if (!importedData) {
    return res.status(400).json({ error: "No data provided to import" });
  }

  const userId = req.user!.id;
  const currentDb = dbManager.getRawData();

  try {
    const data = typeof importedData === "string" ? JSON.parse(importedData) : importedData;

    // Filter and map imported records to current userId
    if (Array.isArray(data.projects)) {
      data.projects.forEach((p: any) => {
        p.userId = userId;
        if (!p.id) p.id = crypto.randomUUID();
        currentDb.projects.push(p);
      });
    }
    if (Array.isArray(data.secrets)) {
      data.secrets.forEach((s: any) => {
        s.userId = userId;
        if (!s.id) s.id = crypto.randomUUID();
        currentDb.secrets.push(s);
      });
    }
    if (Array.isArray(data.snippets)) {
      data.snippets.forEach((sn: any) => {
        sn.userId = userId;
        if (!sn.id) sn.id = crypto.randomUUID();
        currentDb.snippets.push(sn);
      });
    }
    if (Array.isArray(data.notes)) {
      data.notes.forEach((n: any) => {
        n.userId = userId;
        if (!n.id) n.id = crypto.randomUUID();
        currentDb.notes.push(n);
      });
    }
    if (Array.isArray(data.expenses)) {
      data.expenses.forEach((e: any) => {
        e.userId = userId;
        if (!e.id) e.id = crypto.randomUUID();
        currentDb.expenses.push(e);
      });
    }
    if (Array.isArray(data.repositories)) {
      data.repositories.forEach((r: any) => {
        r.userId = userId;
        if (!r.id) r.id = crypto.randomUUID();
        currentDb.repositories.push(r);
      });
    }
    if (Array.isArray(data.bugs)) {
      data.bugs.forEach((b: any) => {
        b.userId = userId;
        if (!b.id) b.id = crypto.randomUUID();
        currentDb.bugs.push(b);
      });
    }
    if (Array.isArray(data.deployments)) {
      data.deployments.forEach((d: any) => {
        d.userId = userId;
        if (!d.id) d.id = crypto.randomUUID();
        currentDb.deployments.push(d);
      });
    }

    dbManager.importRawData(currentDb);
    res.json({ message: "Data imported successfully!" });
  } catch (error) {
    res.status(400).json({ error: "Failed to parse import data: invalid JSON shape." });
  }
});
