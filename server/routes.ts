/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { dbManager, encrypt, decrypt } from "./db";
import { signToken, verifyToken, hashPassword, verifyPassword } from "./auth";
import { User, Project, Secret, Snippet, Note, Expense, RepositoryTracker, Bug, Deployment, ProjectStatus, ProjectPriority, ExpenseType, BugStatus, ProjectMember, Invitation, Notification, ActivityLog } from "./types";
import { requireProjectPermission, RealtimeManager, ActivityLogger } from "./collaboration";
import { GoogleGenAI } from "@google/genai";
import { fetchGithubStats } from "./github";

export const apiRouter = Router();

// Middleware to require authentication
export interface AuthenticatedRequest extends Request {
  user?: User;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);

  if (!payload || !payload.userId) {
    return res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
  }

  try {
    const user = await dbManager.getUserById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized: User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

apiRouter.post("/auth/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existingUser = await dbManager.getUserByEmail(email);
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

    await dbManager.createUser(newUser);

    const token = signToken({ userId: newUser.id });
    const { passwordHash, ...userResponse } = newUser;
    res.status(201).json({ token, user: userResponse });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/auth/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await dbManager.getUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken({ userId: user.id });
    const { passwordHash, ...userResponse } = user;
    res.json({ token, user: userResponse });
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/auth/me", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });

  const { passwordHash, ...userResponse } = req.user;
  res.json({ user: userResponse });
});

apiRouter.post("/auth/change-password", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
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

    const db = await dbManager.getRawData();
    const index = db.users.findIndex((u) => u.id === req.user!.id);
    if (index !== -1) {
      db.users[index].passwordHash = hashPassword(newPassword);
      db.users[index].updatedAt = new Date().toISOString();
      await dbManager.importRawData(db);
      return res.json({ message: "Password updated successfully" });
    }

    res.status(500).json({ error: "Failed to update password" });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// SYSTEM STATS / DASHBOARD INFO (MODULE 1)
// ==========================================
apiRouter.get("/dashboard/stats", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const projects = await dbManager.getProjects(userId);
    const secrets = await dbManager.getSecrets(userId);
    const snippets = await dbManager.getSnippets(userId);
    const notes = await dbManager.getNotes(userId);
    const expenses = await dbManager.getExpenses(userId);
    const repos = await dbManager.getRepositories(userId);
    const bugs = await dbManager.getBugs(userId);

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
  } catch (error) {
    next(error);
  }
});

// ==========================================
// PROJECT MANAGER ENDPOINTS (MODULE 2)
// ==========================================
apiRouter.get("/projects", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    res.json(await dbManager.getProjects(req.user!.id));
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/projects", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
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

    await dbManager.createProject(newProject);
    res.status(201).json(newProject);
  } catch (error) {
    next(error);
  }
});

apiRouter.put("/projects/:id", requireAuth, requireProjectPermission(["owner", "admin", "editor"]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    // If updating API Keys, encrypt them
    if (updates.apiKeys) {
      updates.apiKeys = encrypt(JSON.stringify(updates.apiKeys));
    }

    const updated = await dbManager.updateProject(id, req.user!.id, updates);
    if (!updated) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/projects/:id/reveal-keys", requireAuth, requireProjectPermission(["owner", "admin", "editor"]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const project = await dbManager.getProjectById(id, req.user!.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    try {
      const decryptedStr = decrypt(project.apiKeys);
      res.json(JSON.parse(decryptedStr));
    } catch (error) {
      res.json({});
    }
  } catch (error) {
    next(error);
  }
});

apiRouter.delete("/projects/:id", requireAuth, requireProjectPermission(["owner"]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const success = await dbManager.deleteProject(req.params.id, req.user!.id);
    if (!success) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// SECURE SECRETS MANAGER ENDPOINTS (MODULE 3)
// ==========================================
apiRouter.get("/secrets", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Return list of secrets but NEVER return plain values.
    const list = await dbManager.getSecrets(req.user!.id);
    const sanitized = list.map((s) => ({
      id: s.id,
      label: s.label,
      key: s.key,
      folder: s.folder,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    }));
    res.json(sanitized);
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/secrets", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
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

    await dbManager.createSecret(newSecret);
    res.status(201).json({
      id: newSecret.id,
      label: newSecret.label,
      key: newSecret.key,
      folder: newSecret.folder,
      createdAt: newSecret.createdAt
    });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/secrets/reveal/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const secrets = await dbManager.getSecrets(req.user!.id);
    const secret = secrets.find((s) => s.id === req.params.id);
    if (!secret) {
      return res.status(404).json({ error: "Secret not found" });
    }
    const plainValue = decrypt(secret.encryptedValue);
    res.json({ value: plainValue });
  } catch (error) {
    next(error);
  }
});

apiRouter.delete("/secrets/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const success = await dbManager.deleteSecret(req.params.id, req.user!.id);
    if (!success) {
      return res.status(404).json({ error: "Secret not found" });
    }
    res.json({ message: "Secret deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// SNIPPET ENDPOINTS (MODULE 4)
// ==========================================
apiRouter.get("/snippets", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    res.json(await dbManager.getSnippets(req.user!.id));
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/snippets", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
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

    await dbManager.createSnippet(newSnippet);
    res.status(201).json(newSnippet);
  } catch (error) {
    next(error);
  }
});

apiRouter.put("/snippets/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await dbManager.updateSnippet(req.params.id, req.user!.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Snippet not found" });
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

apiRouter.delete("/snippets/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const success = await dbManager.deleteSnippet(req.params.id, req.user!.id);
    if (!success) {
      return res.status(404).json({ error: "Snippet not found" });
    }
    res.json({ message: "Snippet deleted" });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// MARKDOWN NOTES ENDPOINTS (MODULE 5)
// ==========================================
apiRouter.get("/notes", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    res.json(await dbManager.getNotes(req.user!.id));
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/notes", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
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

    await dbManager.createNote(newNote);
    res.status(201).json(newNote);
  } catch (error) {
    next(error);
  }
});

apiRouter.put("/notes/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const updated = await dbManager.updateNote(req.params.id, req.user!.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Note not found" });
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

apiRouter.delete("/notes/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const success = await dbManager.deleteNote(req.params.id, req.user!.id);
    if (!success) {
      return res.status(404).json({ error: "Note not found" });
    }
    res.json({ message: "Note deleted successfully" });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// EXPENSE ENDPOINTS (MODULE 6)
// ==========================================
apiRouter.get("/expenses", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    res.json(await dbManager.getExpenses(req.user!.id));
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/expenses", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
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

    await dbManager.createExpense(newExpense);
    res.status(201).json(newExpense);
  } catch (error) {
    next(error);
  }
});

apiRouter.delete("/expenses/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const success = await dbManager.deleteExpense(req.params.id, req.user!.id);
    if (!success) {
      return res.status(404).json({ error: "Expense not found" });
    }
    res.json({ message: "Expense deleted" });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// GITHUB TRACKER ENDPOINTS (MODULE 7)
// ==========================================
apiRouter.get("/repositories", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    res.json(await dbManager.getRepositories(req.user!.id));
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/repositories", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, url, branch } = req.body;
    if (!name || !url) {
      return res.status(400).json({ error: "Repository name and URL are required" });
    }

    let stars = 0;
    let issues = 0;
    let commits = 0;
    let openPr = 0;
    let latestRelease = "v1.0.0";

    // Try to fetch real stats from GitHub API
    const liveStats = await fetchGithubStats(url, branch || "main");
    if (liveStats) {
      stars = liveStats.stars;
      issues = liveStats.issues;
      commits = liveStats.commits;
      openPr = liveStats.openPr;
      latestRelease = liveStats.latestRelease;
    } else {
      // Fallback to initial mock stats if GitHub API fails or is rate-limited
      stars = Math.floor(Math.random() * 250) + 12;
      issues = Math.floor(Math.random() * 20) + 2;
      commits = Math.floor(Math.random() * 500) + 50;
      openPr = Math.floor(Math.random() * 5);
    }

    const newRepo: RepositoryTracker = {
      id: crypto.randomUUID(),
      userId: req.user!.id,
      name: name.trim(),
      url: url.trim(),
      branch: branch || "main",
      stars,
      issues,
      commits,
      openPr,
      latestRelease,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dbManager.createRepository(newRepo);
    res.status(201).json(newRepo);
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/repositories/:id/sync", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const repos = await dbManager.getRepositories(userId);
    const repo = repos.find((r) => r.id === id);
    if (!repo) {
      return res.status(404).json({ error: "Repository not found or access denied" });
    }

    const liveStats = await fetchGithubStats(repo.url, repo.branch);
    if (!liveStats) {
      return res.status(400).json({ error: "Failed to fetch live stats from GitHub. Rate limit exceeded or invalid repository URL." });
    }

    const updated = await dbManager.updateRepository(id, userId, {
      stars: liveStats.stars,
      issues: liveStats.issues,
      commits: liveStats.commits,
      openPr: liveStats.openPr,
      latestRelease: liveStats.latestRelease
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/repositories/sync-all", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const repos = await dbManager.getRepositories(userId);
    const updatedRepos = [];

    for (const repo of repos) {
      try {
        const liveStats = await fetchGithubStats(repo.url, repo.branch);
        if (liveStats) {
          const updated = await dbManager.updateRepository(repo.id, userId, {
            stars: liveStats.stars,
            issues: liveStats.issues,
            commits: liveStats.commits,
            openPr: liveStats.openPr,
            latestRelease: liveStats.latestRelease
          });
          if (updated) {
            updatedRepos.push(updated);
            continue;
          }
        }
        updatedRepos.push(repo);
      } catch (err) {
        console.error(`Failed to sync repository ${repo.name}:`, err);
        updatedRepos.push(repo);
      }
    }

    res.json(updatedRepos);
  } catch (error) {
    next(error);
  }
});

apiRouter.delete("/repositories/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const success = await dbManager.deleteRepository(req.params.id, req.user!.id);
    if (!success) {
      return res.status(404).json({ error: "Repository not found" });
    }
    res.json({ message: "Repository tracking stopped" });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// BUG TRACKER ENDPOINTS (MODULE 9)
// ==========================================
// ==========================================
// BUG TRACKER ENDPOINTS (MODULE 9)
// ==========================================
apiRouter.get("/bugs", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    res.json(await dbManager.getBugs(req.user!.id));
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/bugs", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { title, description, priority, status, projectId } = req.body;
    if (!title || !projectId) {
      return res.status(400).json({ error: "Title and Project ID are required" });
    }

    // Verify project member has Editor/Admin/Owner permission
    const member = await dbManager.getProjectMember(projectId, req.user!.id);
    if (!member || member.role === "viewer") {
      return res.status(403).json({ error: "Forbidden: Viewers cannot create bugs" });
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

    await dbManager.createBug(newBug);
    res.status(201).json(newBug);
  } catch (error) {
    next(error);
  }
});

apiRouter.put("/bugs/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const bugs = await dbManager.getBugs(req.user!.id);
    const existingBug = bugs.find((b) => b.id === req.params.id);
    if (!existingBug) {
      return res.status(404).json({ error: "Bug not found or access denied" });
    }

    // Verify project member permission
    const member = await dbManager.getProjectMember(existingBug.projectId, req.user!.id);
    if (!member || member.role === "viewer") {
      return res.status(403).json({ error: "Forbidden: Viewers cannot edit bugs" });
    }

    const updated = await dbManager.updateBug(req.params.id, req.user!.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Bug not found" });
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

apiRouter.delete("/bugs/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const bugs = await dbManager.getBugs(req.user!.id);
    const existingBug = bugs.find((b) => b.id === req.params.id);
    if (!existingBug) {
      return res.status(404).json({ error: "Bug not found or access denied" });
    }

    // Verify project member permission
    const member = await dbManager.getProjectMember(existingBug.projectId, req.user!.id);
    if (!member || member.role === "viewer") {
      return res.status(403).json({ error: "Forbidden: Viewers cannot delete bugs" });
    }

    const success = await dbManager.deleteBug(req.params.id, req.user!.id);
    if (!success) {
      return res.status(404).json({ error: "Bug not found" });
    }
    res.json({ message: "Bug deleted" });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// DEPLOYMENT MANAGER ENDPOINTS (MODULE 10)
// ==========================================
apiRouter.get("/deployments", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    res.json(await dbManager.getDeployments(req.user!.id));
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/deployments", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId, frontendUrl, backendUrl, platform, notes } = req.body;
    if (!projectId || !platform) {
      return res.status(400).json({ error: "Project ID and Platform are required" });
    }

    // Verify project member has Editor/Admin/Owner permission
    const member = await dbManager.getProjectMember(projectId, req.user!.id);
    if (!member || member.role === "viewer") {
      return res.status(403).json({ error: "Forbidden: Viewers cannot create deployments" });
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

    await dbManager.createDeployment(newDeployment);
    res.status(201).json(newDeployment);
  } catch (error) {
    next(error);
  }
});

apiRouter.put("/deployments/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const deployments = await dbManager.getDeployments(req.user!.id);
    const existingDep = deployments.find((d) => d.id === req.params.id);
    if (!existingDep) {
      return res.status(404).json({ error: "Deployment not found or access denied" });
    }

    // Verify project member permission
    const member = await dbManager.getProjectMember(existingDep.projectId, req.user!.id);
    if (!member || member.role === "viewer") {
      return res.status(403).json({ error: "Forbidden: Viewers cannot edit deployments" });
    }

    const updated = await dbManager.updateDeployment(req.params.id, req.user!.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Deployment not found" });
    }
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

apiRouter.delete("/deployments/:id", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const deployments = await dbManager.getDeployments(req.user!.id);
    const existingDep = deployments.find((d) => d.id === req.params.id);
    if (!existingDep) {
      return res.status(404).json({ error: "Deployment not found or access denied" });
    }

    // Verify project member permission
    const member = await dbManager.getProjectMember(existingDep.projectId, req.user!.id);
    if (!member || member.role === "viewer") {
      return res.status(403).json({ error: "Forbidden: Viewers cannot delete deployments" });
    }

    const success = await dbManager.deleteDeployment(req.params.id, req.user!.id);
    if (!success) {
      return res.status(404).json({ error: "Deployment not found" });
    }
    res.json({ message: "Deployment deleted" });
  } catch (error) {
    next(error);
  }
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
apiRouter.get("/settings/export", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const fullData = await dbManager.getRawData();
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
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/settings/import", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { importedData } = req.body;
    if (!importedData) {
      return res.status(400).json({ error: "No data provided to import" });
    }

    const userId = req.user!.id;
    const currentDb = await dbManager.getRawData();

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

    await dbManager.importRawData(currentDb);
    res.json({ message: "Data imported successfully!" });
  } catch (error) {
    res.status(400).json({ error: "Failed to parse import data: invalid JSON shape." });
  }
});

// ==========================================
// TEAM COLLABORATION ENDPOINTS
// ==========================================

apiRouter.get("/realtime", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  RealtimeManager.addClient(req.user!.id, req, res);
});

apiRouter.get("/projects/:projectId/members", requireAuth, requireProjectPermission(["owner", "admin", "editor", "viewer"]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const members = await dbManager.getProjectMembers(projectId);
    res.json(members);
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/projects/:projectId/activity", requireAuth, requireProjectPermission(["owner", "admin", "editor", "viewer"]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const logs = await dbManager.getActivityLogsByProject(projectId);
    res.json(logs);
  } catch (error) {
    next(error);
  }
});

apiRouter.put("/projects/:projectId/members/:memberId", requireAuth, requireProjectPermission(["owner"]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId, memberId } = req.params;
    const { role } = req.body;

    if (memberId === req.user!.id) {
      return res.status(400).json({ error: "Owner cannot change their own role. Transfer ownership instead." });
    }

    if (!["admin", "editor", "viewer"].includes(role)) {
      return res.status(400).json({ error: "Invalid role specified." });
    }

    const member = await dbManager.getProjectMember(projectId, memberId);
    if (!member) {
      return res.status(404).json({ error: "Member not found." });
    }

    const success = await dbManager.updateProjectMemberRole(projectId, memberId, role);
    if (!success) {
      return res.status(500).json({ error: "Failed to update member role." });
    }

    // Log Activity
    const targetUser = await dbManager.getUserById(memberId);
    await ActivityLogger.log(
      projectId,
      req.user!.id,
      "role_changed",
      `Changed role of user ${targetUser?.name || memberId} to ${role}.`
    );

    // Create Notification
    const project = await dbManager.getProjectById(projectId, req.user!.id);
    await dbManager.createNotification({
      id: crypto.randomUUID(),
      userId: memberId,
      type: "role_changed",
      title: "Role Changed",
      message: `Your role in project "${project?.name || 'Collaboration'}" was changed to ${role} by ${req.user!.name}.`,
      projectId,
      read: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    RealtimeManager.broadcast(projectId, {
      type: "member_role_changed",
      projectId,
      userId: memberId,
      role
    });

    RealtimeManager.broadcastToUser(memberId, {
      type: "my_role_changed",
      projectId,
      role
    });

    res.json({ message: "Member role updated successfully." });
  } catch (error) {
    next(error);
  }
});

apiRouter.delete("/projects/:projectId/members/:memberId", requireAuth, requireProjectPermission(["owner", "admin"]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId, memberId } = req.params;
    const inviterMember = (req as any).projectMember;

    if (memberId === req.user!.id) {
      return res.status(400).json({ error: "You cannot remove yourself from the project. Transfer ownership or have another Admin remove you." });
    }

    const targetMember = await dbManager.getProjectMember(projectId, memberId);
    if (!targetMember) {
      return res.status(404).json({ error: "Member not found." });
    }

    // Role safety checks: Admin can only remove Editor or Viewer
    if (inviterMember.role === "admin" && (targetMember.role === "owner" || targetMember.role === "admin")) {
      return res.status(403).json({ error: "Forbidden: Admins can only remove Editors and Viewers." });
    }

    if (targetMember.role === "owner") {
      return res.status(400).json({ error: "Cannot remove the project Owner." });
    }

    const success = await dbManager.deleteProjectMember(projectId, memberId);
    if (!success) {
      return res.status(500).json({ error: "Failed to remove member." });
    }

    // Log Activity
    const targetUser = await dbManager.getUserById(memberId);
    await ActivityLogger.log(
      projectId,
      req.user!.id,
      "member_removed",
      `Removed member ${targetUser?.name || memberId} from the project.`
    );

    // Create Notification
    const project = await dbManager.getProjectById(projectId, req.user!.id);
    await dbManager.createNotification({
      id: crypto.randomUUID(),
      userId: memberId,
      type: "removed_from_project",
      title: "Removed from Project",
      message: `You were removed from project "${project?.name || 'Collaboration'}" by ${req.user!.name}.`,
      projectId,
      read: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    RealtimeManager.broadcast(projectId, {
      type: "member_left",
      projectId,
      userId: memberId
    });

    RealtimeManager.broadcastToUser(memberId, {
      type: "removed_from_project",
      projectId
    });

    res.json({ message: "Member removed successfully." });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/projects/:projectId/transfer-ownership", requireAuth, requireProjectPermission(["owner"]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { newOwnerId } = req.body;

    if (!newOwnerId) {
      return res.status(400).json({ error: "New owner user ID is required." });
    }

    if (newOwnerId === req.user!.id) {
      return res.status(400).json({ error: "You are already the owner of this project." });
    }

    const targetMember = await dbManager.getProjectMember(projectId, newOwnerId);
    if (!targetMember) {
      return res.status(400).json({ error: "New owner must be a member of the project first." });
    }

    const success = await dbManager.transferProjectOwnership(projectId, req.user!.id, newOwnerId);
    if (!success) {
      return res.status(500).json({ error: "Failed to transfer project ownership." });
    }

    // Log Activity
    const targetUser = await dbManager.getUserById(newOwnerId);
    await ActivityLogger.log(
      projectId,
      req.user!.id,
      "ownership_transferred",
      `Transferred project ownership to ${targetUser?.name || newOwnerId}.`
    );

    // Create Notification
    const project = await dbManager.getProjectById(projectId, newOwnerId);
    await dbManager.createNotification({
      id: crypto.randomUUID(),
      userId: newOwnerId,
      type: "role_changed",
      title: "Ownership Transferred",
      message: `You are now the Owner of project "${project?.name || 'Collaboration'}"! Ownership was transferred to you by ${req.user!.name}.`,
      projectId,
      read: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    RealtimeManager.broadcast(projectId, {
      type: "ownership_transferred",
      projectId,
      newOwnerId,
      oldOwnerId: req.user!.id
    });

    RealtimeManager.broadcastToUser(newOwnerId, {
      type: "my_role_changed",
      projectId,
      role: "owner"
    });

    res.json({ message: "Ownership transferred successfully." });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/projects/:projectId/invitations", requireAuth, requireProjectPermission(["owner", "admin"]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { email, role, message } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: "Email and role are required." });
    }

    if (!["admin", "editor", "viewer"].includes(role)) {
      return res.status(400).json({ error: "Invalid invitation role. Choose Admin, Editor, or Viewer." });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const targetUser = await dbManager.getUserByEmail(trimmedEmail);
    if (!targetUser) {
      return res.status(404).json({ error: `User with email ${trimmedEmail} not found in DevVault.` });
    }

    if (targetUser.id === req.user!.id) {
      return res.status(400).json({ error: "You cannot invite yourself to the project." });
    }

    const existingMember = await dbManager.getProjectMember(projectId, targetUser.id);
    if (existingMember) {
      return res.status(400).json({ error: "This user is already a member of this project." });
    }

    const existingInv = await dbManager.getInvitationByProjectAndEmail(projectId, trimmedEmail);
    if (existingInv) {
      return res.status(400).json({ error: "An invitation is already pending for this user email." });
    }

    const newInv: Invitation = {
      id: crypto.randomUUID(),
      projectId,
      inviterId: req.user!.id,
      email: trimmedEmail,
      role: role as any,
      message: message || "",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dbManager.createInvitation(newInv);

    // Create Notification
    const project = await dbManager.getProjectById(projectId, req.user!.id);
    await dbManager.createNotification({
      id: crypto.randomUUID(),
      userId: targetUser.id,
      type: "project_invitation",
      title: "Project Invitation",
      message: `${req.user!.name} invited you to join project "${project?.name || 'Collaboration'}" as a ${role}.`,
      projectId,
      invitationId: newInv.id,
      read: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Log Activity
    await ActivityLogger.log(
      projectId,
      req.user!.id,
      "member_invited",
      `Invited user ${targetUser.name} (${trimmedEmail}) to join as ${role}.`
    );

    // Alert recipient of new notification
    RealtimeManager.broadcastToUser(targetUser.id, {
      type: "new_notification"
    });

    // Alert project members of pending invitations list update
    RealtimeManager.broadcast(projectId, {
      type: "invitations_updated",
      projectId
    });

    res.status(201).json({ message: "Invitation sent successfully." });
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/projects/:projectId/invitations", requireAuth, requireProjectPermission(["owner", "admin"]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const invitations = await dbManager.getInvitationsByProject(projectId);
    res.json(invitations);
  } catch (error) {
    next(error);
  }
});

apiRouter.delete("/projects/:projectId/invitations/:invitationId", requireAuth, requireProjectPermission(["owner", "admin"]), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId, invitationId } = req.params;
    const invitation = await dbManager.getInvitationById(invitationId);
    if (!invitation || invitation.projectId !== projectId) {
      return res.status(404).json({ error: "Invitation not found." });
    }

    const success = await dbManager.deleteInvitation(invitationId);
    if (!success) {
      return res.status(500).json({ error: "Failed to cancel invitation." });
    }

    RealtimeManager.broadcast(projectId, {
      type: "invitations_updated",
      projectId
    });

    res.json({ message: "Invitation cancelled successfully." });
  } catch (error) {
    next(error);
  }
});

apiRouter.get("/notifications", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const list = await dbManager.getNotificationsByUser(req.user!.id);
    res.json(list);
  } catch (error) {
    next(error);
  }
});

apiRouter.put("/notifications/:id/read", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const success = await dbManager.markNotificationAsRead(req.params.id, req.user!.id);
    if (!success) {
      return res.status(404).json({ error: "Notification not found." });
    }
    res.json({ message: "Notification marked as read." });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/notifications/:id/accept", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const notifId = req.params.id;
    const notifications = await dbManager.getNotificationsByUser(req.user!.id);
    const notification = notifications.find((n) => n.id === notifId);

    if (!notification || notification.userId !== req.user!.id) {
      return res.status(404).json({ error: "Notification not found." });
    }

    if (notification.type !== "project_invitation" || !notification.invitationId) {
      return res.status(400).json({ error: "Invalid notification type." });
    }

    const invitation = await dbManager.getInvitationById(notification.invitationId);
    if (!invitation || invitation.status !== "pending") {
      return res.status(404).json({ error: "Invitation expired, rejected, or not found." });
    }

    // Insert user into project members
    const newMember: ProjectMember = {
      id: crypto.randomUUID(),
      projectId: invitation.projectId,
      userId: req.user!.id,
      role: invitation.role,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await dbManager.createProjectMember(newMember);

    // Delete/Clean up invitation
    await dbManager.deleteInvitation(invitation.id);

    // Mark notification as read
    await dbManager.markNotificationAsRead(notifId, req.user!.id);

    // Log Activity
    await ActivityLogger.log(
      invitation.projectId,
      req.user!.id,
      "invitation_accepted",
      `Accepted project invitation and joined as ${invitation.role}.`
    );

    // Broadcast Real-time Updates to Project Members
    RealtimeManager.broadcast(invitation.projectId, {
      type: "member_joined",
      projectId: invitation.projectId,
      member: {
        ...newMember,
        userName: req.user!.name,
        userEmail: req.user!.email
      }
    });

    res.json({ message: "Invitation accepted. You are now a project member." });
  } catch (error) {
    next(error);
  }
});

apiRouter.post("/notifications/:id/reject", requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const notifId = req.params.id;
    const notifications = await dbManager.getNotificationsByUser(req.user!.id);
    const notification = notifications.find((n) => n.id === notifId);

    if (!notification || notification.userId !== req.user!.id) {
      return res.status(404).json({ error: "Notification not found." });
    }

    if (notification.type !== "project_invitation" || !notification.invitationId) {
      return res.status(400).json({ error: "Invalid notification type." });
    }

    const invitation = await dbManager.getInvitationById(notification.invitationId);
    if (invitation) {
      // Delete/Clean up invitation
      await dbManager.deleteInvitation(invitation.id);

      // Log Activity
      await ActivityLogger.log(
        invitation.projectId,
        req.user!.id,
        "invitation_rejected",
        `Rejected project invitation.`
      );
    }

    // Mark notification as read
    await dbManager.markNotificationAsRead(notifId, req.user!.id);

    if (invitation) {
      RealtimeManager.broadcast(invitation.projectId, {
        type: "invitations_updated",
        projectId: invitation.projectId
      });
    }

    res.json({ message: "Invitation rejected." });
  } catch (error) {
    next(error);
  }
});
