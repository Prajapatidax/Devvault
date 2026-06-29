/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  User,
  Project,
  Secret,
  Snippet,
  Note,
  Expense,
  RepositoryTracker,
  Bug,
  Deployment
} from "./types";

const DB_FILE = path.join(process.cwd(), "server", "db.json");

// Ensure the server directory exists
const serverDir = path.dirname(DB_FILE);
if (!fs.existsSync(serverDir)) {
  fs.mkdirSync(serverDir, { recursive: true });
}

interface DatabaseSchema {
  users: User[];
  projects: Project[];
  secrets: Secret[];
  snippets: Snippet[];
  notes: Note[];
  expenses: Expense[];
  repositories: RepositoryTracker[];
  bugs: Bug[];
  deployments: Deployment[];
}

const initialDb: DatabaseSchema = {
  users: [],
  projects: [],
  secrets: [],
  snippets: [],
  notes: [],
  expenses: [],
  repositories: [],
  bugs: [],
  deployments: []
};

// Encryption secret - derived from env or static fallback for development
const ENCRYPTION_SECRET = process.env.ENCRYPTION_KEY || "dev-vault-secret-key-super-secure-32-chars";

// Helper to derive a 32-byte key from our secret
function getEncryptionKey(): Buffer {
  return crypto.createHash("sha256").update(ENCRYPTION_SECRET).digest();
}

/**
 * Encrypts plain text into a secure token (IV + CipherText)
 */
export function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(16);
    const key = getEncryptionKey();
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return `${iv.toString("hex")}:${encrypted}`;
  } catch (error) {
    console.error("Encryption failed:", error);
    throw new Error("Failed to encrypt secret field");
  }
}

/**
 * Decrypts a secure token back to plain text
 */
export function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 2) {
      throw new Error("Invalid encrypted format");
    }
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = parts[1];
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Decryption failed:", error);
    return "******** [Decryption Failed - Check ENCRYPTION_KEY] *******";
  }
}

class DatabaseManager {
  private cache: DatabaseSchema | null = null;

  constructor() {
    this.read();
  }

  private read(): DatabaseSchema {
    if (this.cache) return this.cache;

    try {
      if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2), "utf8");
        this.cache = JSON.parse(JSON.stringify(initialDb));
        return this.cache!;
      }
      const data = fs.readFileSync(DB_FILE, "utf8");
      this.cache = JSON.parse(data);
      return this.cache!;
    } catch (error) {
      console.error("Failed to read database file:", error);
      this.cache = JSON.parse(JSON.stringify(initialDb));
      return this.cache!;
    }
  }

  private write(): void {
    if (!this.cache) return;
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.cache, null, 2), "utf8");
    } catch (error) {
      console.error("Failed to write database file:", error);
    }
  }

  // --- Users CRUD ---
  getUsers(): User[] {
    return this.read().users;
  }

  getUserByEmail(email: string): User | undefined {
    return this.read().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  getUserById(id: string): User | undefined {
    return this.read().users.find((u) => u.id === id);
  }

  createUser(user: User): User {
    const db = this.read();
    db.users.push(user);
    this.write();
    return user;
  }

  // --- Projects CRUD ---
  getProjects(userId: string): Project[] {
    return this.read().projects.filter((p) => p.userId === userId);
  }

  getProjectById(id: string, userId: string): Project | undefined {
    return this.read().projects.find((p) => p.id === id && p.userId === userId);
  }

  createProject(project: Project): Project {
    const db = this.read();
    db.projects.push(project);
    this.write();
    return project;
  }

  updateProject(id: string, userId: string, updates: Partial<Project>): Project | undefined {
    const db = this.read();
    const index = db.projects.findIndex((p) => p.id === id && p.userId === userId);
    if (index === -1) return undefined;

    db.projects[index] = {
      ...db.projects[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.write();
    return db.projects[index];
  }

  deleteProject(id: string, userId: string): boolean {
    const db = this.read();
    const len = db.projects.length;
    db.projects = db.projects.filter((p) => !(p.id === id && p.userId === userId));
    const success = db.projects.length < len;
    if (success) {
      // Cascade delete related items if desired
      db.bugs = db.bugs.filter((b) => b.projectId !== id);
      db.deployments = db.deployments.filter((d) => d.projectId !== id);
      this.write();
    }
    return success;
  }

  // --- Secrets CRUD ---
  getSecrets(userId: string): Secret[] {
    return this.read().secrets.filter((s) => s.userId === userId);
  }

  createSecret(secret: Secret): Secret {
    const db = this.read();
    db.secrets.push(secret);
    this.write();
    return secret;
  }

  deleteSecret(id: string, userId: string): boolean {
    const db = this.read();
    const len = db.secrets.length;
    db.secrets = db.secrets.filter((s) => !(s.id === id && s.userId === userId));
    const success = db.secrets.length < len;
    if (success) this.write();
    return success;
  }

  // --- Snippets CRUD ---
  getSnippets(userId: string): Snippet[] {
    return this.read().snippets.filter((s) => s.userId === userId);
  }

  createSnippet(snippet: Snippet): Snippet {
    const db = this.read();
    db.snippets.push(snippet);
    this.write();
    return snippet;
  }

  updateSnippet(id: string, userId: string, updates: Partial<Snippet>): Snippet | undefined {
    const db = this.read();
    const index = db.snippets.findIndex((s) => s.id === id && s.userId === userId);
    if (index === -1) return undefined;

    db.snippets[index] = {
      ...db.snippets[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.write();
    return db.snippets[index];
  }

  deleteSnippet(id: string, userId: string): boolean {
    const db = this.read();
    const len = db.snippets.length;
    db.snippets = db.snippets.filter((s) => !(s.id === id && s.userId === userId));
    const success = db.snippets.length < len;
    if (success) this.write();
    return success;
  }

  // --- Notes CRUD ---
  getNotes(userId: string): Note[] {
    return this.read().notes.filter((n) => n.userId === userId);
  }

  createNote(note: Note): Note {
    const db = this.read();
    db.notes.push(note);
    this.write();
    return note;
  }

  updateNote(id: string, userId: string, updates: Partial<Note>): Note | undefined {
    const db = this.read();
    const index = db.notes.findIndex((n) => n.id === id && n.userId === userId);
    if (index === -1) return undefined;

    db.notes[index] = {
      ...db.notes[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.write();
    return db.notes[index];
  }

  deleteNote(id: string, userId: string): boolean {
    const db = this.read();
    const len = db.notes.length;
    db.notes = db.notes.filter((n) => !(n.id === id && n.userId === userId));
    const success = db.notes.length < len;
    if (success) this.write();
    return success;
  }

  // --- Expenses CRUD ---
  getExpenses(userId: string): Expense[] {
    return this.read().expenses.filter((e) => e.userId === userId);
  }

  createExpense(expense: Expense): Expense {
    const db = this.read();
    db.expenses.push(expense);
    this.write();
    return expense;
  }

  deleteExpense(id: string, userId: string): boolean {
    const db = this.read();
    const len = db.expenses.length;
    db.expenses = db.expenses.filter((e) => !(e.id === id && e.userId === userId));
    const success = db.expenses.length < len;
    if (success) this.write();
    return success;
  }

  // --- Repositories CRUD ---
  getRepositories(userId: string): RepositoryTracker[] {
    return this.read().repositories.filter((r) => r.userId === userId);
  }

  createRepository(repo: RepositoryTracker): RepositoryTracker {
    const db = this.read();
    db.repositories.push(repo);
    this.write();
    return repo;
  }

  updateRepository(id: string, userId: string, updates: Partial<RepositoryTracker>): RepositoryTracker | undefined {
    const db = this.read();
    const index = db.repositories.findIndex((r) => r.id === id && r.userId === userId);
    if (index === -1) return undefined;

    db.repositories[index] = {
      ...db.repositories[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.write();
    return db.repositories[index];
  }

  deleteRepository(id: string, userId: string): boolean {
    const db = this.read();
    const len = db.repositories.length;
    db.repositories = db.repositories.filter((r) => !(r.id === id && r.userId === userId));
    const success = db.repositories.length < len;
    if (success) this.write();
    return success;
  }

  // --- Bugs CRUD ---
  getBugs(userId: string): Bug[] {
    return this.read().bugs.filter((b) => b.userId === userId);
  }

  createBug(bug: Bug): Bug {
    const db = this.read();
    db.bugs.push(bug);
    this.write();
    return bug;
  }

  updateBug(id: string, userId: string, updates: Partial<Bug>): Bug | undefined {
    const db = this.read();
    const index = db.bugs.findIndex((b) => b.id === id && b.userId === userId);
    if (index === -1) return undefined;

    db.bugs[index] = {
      ...db.bugs[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.write();
    return db.bugs[index];
  }

  deleteBug(id: string, userId: string): boolean {
    const db = this.read();
    const len = db.bugs.length;
    db.bugs = db.bugs.filter((b) => !(b.id === id && b.userId === userId));
    const success = db.bugs.length < len;
    if (success) this.write();
    return success;
  }

  // --- Deployments CRUD ---
  getDeployments(userId: string): Deployment[] {
    return this.read().deployments.filter((d) => d.userId === userId);
  }

  createDeployment(deployment: Deployment): Deployment {
    const db = this.read();
    db.deployments.push(deployment);
    this.write();
    return deployment;
  }

  updateDeployment(id: string, userId: string, updates: Partial<Deployment>): Deployment | undefined {
    const db = this.read();
    const index = db.deployments.findIndex((d) => d.id === id && d.userId === userId);
    if (index === -1) return undefined;

    db.deployments[index] = {
      ...db.deployments[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.write();
    return db.deployments[index];
  }

  deleteDeployment(id: string, userId: string): boolean {
    const db = this.read();
    const len = db.deployments.length;
    db.deployments = db.deployments.filter((d) => !(d.id === id && d.userId === userId));
    const success = db.deployments.length < len;
    if (success) this.write();
    return success;
  }

  // --- Export / Import ---
  getRawData(): DatabaseSchema {
    return this.read();
  }

  importRawData(newData: any): void {
    const db = this.read();
    if (newData.users) db.users = newData.users;
    if (newData.projects) db.projects = newData.projects;
    if (newData.secrets) db.secrets = newData.secrets;
    if (newData.snippets) db.snippets = newData.snippets;
    if (newData.notes) db.notes = newData.notes;
    if (newData.expenses) db.expenses = newData.expenses;
    if (newData.repositories) db.repositories = newData.repositories;
    if (newData.bugs) db.bugs = newData.bugs;
    if (newData.deployments) db.deployments = newData.deployments;
    this.write();
  }
}

export const dbManager = new DatabaseManager();
