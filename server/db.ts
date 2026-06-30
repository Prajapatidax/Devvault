/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import pg from "pg";
const { Pool } = pg;

import {
  User,
  Project,
  Secret,
  Snippet,
  Note,
  Expense,
  RepositoryTracker,
  Bug,
  Deployment,
  ProjectMember,
  Invitation,
  Notification,
  ActivityLog
} from "./types";

const DB_FILE = path.join(process.cwd(), "server", "db.json");

// Ensure the server directory exists for the JSON database fallback
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
  projectMembers: ProjectMember[];
  invitations: Invitation[];
  notifications: Notification[];
  activityLogs: ActivityLog[];
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
  deployments: [],
  projectMembers: [],
  invitations: [],
  notifications: [],
  activityLogs: []
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

// Convert snake_case from DB rows to camelCase for TS interfaces
function toCamel<T = any>(row: any): T {
  if (!row) return row;
  const res: any = {};
  for (const key of Object.keys(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    let val = row[key];
    if (val instanceof Date) {
      val = val.toISOString();
    }
    if (key === "cost" && typeof val === "string") {
      val = parseFloat(val);
    }
    res[camelKey] = val;
  }
  return res as T;
}

class DatabaseManager {
  private cache: DatabaseSchema | null = null;
  private pool: pg.Pool | null = null;
  private usePostgres = false;

  constructor() {}

  /**
   * Initializes the database. Connects to PostgreSQL if DATABASE_URL is set,
   * otherwise falls back to the local db.json storage.
   */
  async initialize(): Promise<void> {
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
      console.log("DATABASE_URL detected. Connecting to PostgreSQL/Supabase...");
      try {
        const isSupabase = databaseUrl.includes("supabase.com") || databaseUrl.includes("supabase.co");
        this.pool = new Pool({
          connectionString: databaseUrl,
          ssl: isSupabase || databaseUrl.includes("render.com") || databaseUrl.includes("elephantsql.com")
            ? { rejectUnauthorized: false }
            : undefined
        });

        // Test connection
        await this.pool.query("SELECT NOW()");
        this.usePostgres = true;
        console.log("Successfully connected to PostgreSQL database.");

        // Setup tables
        await this.runMigrations();

        // Migrate local JSON data if PostgreSQL database is empty
        await this.migrateJsonToPostgresIfNeeded();
      } catch (error) {
        console.error("Failed to connect to PostgreSQL. Falling back to local db.json", error);
        this.usePostgres = false;
        this.readJson();
      }
    } else {
      console.log("No DATABASE_URL found. Using local db.json database storage.");
      this.usePostgres = false;
      this.readJson();
    }
  }

  private async runMigrations(): Promise<void> {
    if (!this.pool) return;
    console.log("Running database migrations/table checks...");

    const queries = [
      // 1. Users
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,

      // 2. Projects
      `CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'planning',
        tech_stack JSONB NOT NULL DEFAULT '[]',
        deadline TEXT NOT NULL DEFAULT '',
        priority TEXT NOT NULL DEFAULT 'medium',
        repository TEXT NOT NULL DEFAULT '',
        live_url TEXT NOT NULL DEFAULT '',
        server TEXT NOT NULL DEFAULT '',
        database TEXT NOT NULL DEFAULT '',
        domain TEXT NOT NULL DEFAULT '',
        api_keys TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        progress INTEGER NOT NULL DEFAULT 0,
        attachments JSONB NOT NULL DEFAULT '[]',
        tags JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,

      // 3. Secrets
      `CREATE TABLE IF NOT EXISTS secrets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        key TEXT NOT NULL,
        encrypted_value TEXT NOT NULL,
        folder TEXT NOT NULL DEFAULT 'General',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,

      // 4. Snippets
      `CREATE TABLE IF NOT EXISTS snippets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        code TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'javascript',
        tags JSONB NOT NULL DEFAULT '[]',
        folder TEXT NOT NULL DEFAULT 'General',
        is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,

      // 5. Notes
      `CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        folder TEXT NOT NULL DEFAULT 'General',
        tags JSONB NOT NULL DEFAULT '[]',
        is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,

      // 6. Expenses
      `CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        label TEXT NOT NULL,
        type TEXT NOT NULL,
        cost NUMERIC NOT NULL DEFAULT 0,
        billing_cycle TEXT NOT NULL DEFAULT 'monthly',
        next_renewal TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,

      // 7. Repositories (GitHub tracker)
      `CREATE TABLE IF NOT EXISTS repositories (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        branch TEXT NOT NULL DEFAULT 'main',
        stars INTEGER NOT NULL DEFAULT 0,
        issues INTEGER NOT NULL DEFAULT 0,
        commits INTEGER NOT NULL DEFAULT 0,
        open_pr INTEGER NOT NULL DEFAULT 0,
        latest_release TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,

      // 8. Bugs
      `CREATE TABLE IF NOT EXISTS bugs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        priority TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'open',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,

      // 9. Deployments
      `CREATE TABLE IF NOT EXISTS deployments (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        frontend_url TEXT NOT NULL DEFAULT '',
        backend_url TEXT NOT NULL DEFAULT '',
        platform TEXT NOT NULL,
        notes TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,

      // 10. Project Members
      `CREATE TABLE IF NOT EXISTS project_members (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, user_id)
      );`,

      // 11. Invitations
      `CREATE TABLE IF NOT EXISTS invitations (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        inviter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')),
        message TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(project_id, email)
      );`,

      // 12. Notifications
      `CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
        invitation_id TEXT REFERENCES invitations(id) ON DELETE SET NULL,
        read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,

      // 13. Activity Logs
      `CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        details TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`
    ];

    for (const query of queries) {
      await this.pool.query(query);
    }

    // Backfill existing projects with owner member
    await this.pool.query(`
      INSERT INTO project_members (id, project_id, user_id, role, created_at, updated_at)
      SELECT 
        md5(p.id || p.user_id)::text,
        p.id,
        p.user_id,
        'owner',
        p.created_at,
        p.updated_at
      FROM projects p
      LEFT JOIN project_members pm ON p.id = pm.project_id AND pm.role = 'owner'
      WHERE pm.id IS NULL
      ON CONFLICT (project_id, user_id) DO NOTHING;
    `);

    console.log("Database migrations completed successfully.");
  }

  private async migrateJsonToPostgresIfNeeded(): Promise<void> {
    if (!this.pool || !this.usePostgres) return;
    try {
      const userCheck = await this.pool.query("SELECT COUNT(*) FROM users");
      const userCount = parseInt(userCheck.rows[0].count, 10);
      
      if (userCount === 0 && fs.existsSync(DB_FILE)) {
        const localData = this.readJson();
        const hasData = (localData.users && localData.users.length > 0) ||
                        (localData.projects && localData.projects.length > 0);
        
        if (hasData) {
          console.log("Local db.json has existing data but PostgreSQL is empty. Migrating data to PostgreSQL...");
          await this.importRawData(localData);
          console.log("Data migration to PostgreSQL completed successfully.");
        }
      }
    } catch (error) {
      console.error("Failed to migrate data from local db.json to PostgreSQL:", error);
    }
  }

  // --- JSON DATABASE FALLBACK METHODS ---
  private readJson(): DatabaseSchema {
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

  private writeJson(): void {
    if (!this.cache) return;
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.cache, null, 2), "utf8");
    } catch (error) {
      console.error("Failed to write database file:", error);
    }
  }

  // --- Users CRUD ---
  async getUsers(): Promise<User[]> {
    if (this.usePostgres) {
      const res = await this.pool!.query("SELECT * FROM users");
      return res.rows.map(toCamel);
    }
    return this.readJson().users;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (this.usePostgres) {
      const res = await this.pool!.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1", [email]);
      return res.rows[0] ? toCamel<User>(res.rows[0]) : undefined;
    }
    return this.readJson().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  async getUserById(id: string): Promise<User | undefined> {
    if (this.usePostgres) {
      const res = await this.pool!.query("SELECT * FROM users WHERE id = $1 LIMIT 1", [id]);
      return res.rows[0] ? toCamel<User>(res.rows[0]) : undefined;
    }
    return this.readJson().users.find((u) => u.id === id);
  }

  async createUser(user: User): Promise<User> {
    if (this.usePostgres) {
      await this.pool!.query(
        "INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)",
        [user.id, user.email, user.passwordHash, user.name, user.createdAt, user.updatedAt]
      );
      return user;
    }
    const db = this.readJson();
    db.users.push(user);
    this.writeJson();
    return user;
  }

  // --- Projects CRUD ---
  async getProjects(userId: string): Promise<Project[]> {
    if (this.usePostgres) {
      const res = await this.pool!.query(
        `SELECT p.* FROM projects p
         JOIN project_members pm ON p.id = pm.project_id
         WHERE pm.user_id = $1`,
        [userId]
      );
      return res.rows.map(toCamel);
    }
    const db = this.readJson();
    const pmList = db.projectMembers || [];
    const memberProjectIds = pmList.filter((pm) => pm.userId === userId).map((pm) => pm.projectId);
    return db.projects.filter((p) => p.userId === userId || memberProjectIds.includes(p.id));
  }

  async getProjectById(id: string, userId: string): Promise<Project | undefined> {
    if (this.usePostgres) {
      const res = await this.pool!.query(
        `SELECT p.* FROM projects p
         JOIN project_members pm ON p.id = pm.project_id
         WHERE p.id = $1 AND pm.user_id = $2
         LIMIT 1`,
        [id, userId]
      );
      return res.rows[0] ? toCamel<Project>(res.rows[0]) : undefined;
    }
    const db = this.readJson();
    const pmList = db.projectMembers || [];
    const isMember = pmList.some((pm) => pm.projectId === id && pm.userId === userId);
    return db.projects.find((p) => p.id === id && (p.userId === userId || isMember));
  }

  async createProject(project: Project): Promise<Project> {
    if (this.usePostgres) {
      await this.pool!.query(
        `INSERT INTO projects (
          id, user_id, name, description, status, tech_stack, deadline, priority, 
          repository, live_url, server, database, domain, api_keys, notes, progress, 
          attachments, tags, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
        [
          project.id,
          project.userId,
          project.name,
          project.description,
          project.status,
          JSON.stringify(project.techStack),
          project.deadline,
          project.priority,
          project.repository,
          project.liveUrl,
          project.server,
          project.database,
          project.domain,
          project.apiKeys,
          project.notes,
          project.progress,
          JSON.stringify(project.attachments),
          JSON.stringify(project.tags),
          project.createdAt,
          project.updatedAt
        ]
      );
      // Auto-insert creator as owner in project_members
      await this.pool!.query(
        "INSERT INTO project_members (id, project_id, user_id, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)",
        [crypto.randomUUID(), project.id, project.userId, "owner", project.createdAt, project.updatedAt]
      );
      return project;
    }
    const db = this.readJson();
    db.projects.push(project);
    db.projectMembers = db.projectMembers || [];
    db.projectMembers.push({
      id: crypto.randomUUID(),
      projectId: project.id,
      userId: project.userId,
      role: "owner",
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    });
    this.writeJson();
    return project;
  }

  async updateProject(id: string, userId: string, updates: Partial<Project>): Promise<Project | undefined> {
    if (this.usePostgres) {
      const existing = await this.getProjectById(id, userId);
      if (!existing) return undefined;

      const merged = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await this.pool!.query(
        `UPDATE projects SET 
          name = $1, description = $2, status = $3, tech_stack = $4, deadline = $5, 
          priority = $6, repository = $7, live_url = $8, server = $9, database = $10, 
          domain = $11, api_keys = $12, notes = $13, progress = $14, attachments = $15, 
          tags = $16, updated_at = $17 
        WHERE id = $18 AND user_id = $19`,
        [
          merged.name,
          merged.description,
          merged.status,
          JSON.stringify(merged.techStack),
          merged.deadline,
          merged.priority,
          merged.repository,
          merged.liveUrl,
          merged.server,
          merged.database,
          merged.domain,
          merged.apiKeys,
          merged.notes,
          merged.progress,
          JSON.stringify(merged.attachments),
          JSON.stringify(merged.tags),
          merged.updatedAt,
          id,
          userId
        ]
      );
      return merged;
    }

    const db = this.readJson();
    const index = db.projects.findIndex((p) => p.id === id && p.userId === userId);
    if (index === -1) return undefined;

    db.projects[index] = {
      ...db.projects[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.writeJson();
    return db.projects[index];
  }

  async deleteProject(id: string, userId: string): Promise<boolean> {
    if (this.usePostgres) {
      // Due to CASCADE delete constraint on foreign keys in Postgres, bugs and deployments will be deleted automatically.
      const res = await this.pool!.query("DELETE FROM projects WHERE id = $1 AND user_id = $2", [id, userId]);
      return (res.rowCount ?? 0) > 0;
    }

    const db = this.readJson();
    const len = db.projects.length;
    db.projects = db.projects.filter((p) => !(p.id === id && p.userId === userId));
    const success = db.projects.length < len;
    if (success) {
      db.bugs = db.bugs.filter((b) => b.projectId !== id);
      db.deployments = db.deployments.filter((d) => d.projectId !== id);
      this.writeJson();
    }
    return success;
  }

  // --- Secrets CRUD ---
  async getSecrets(userId: string): Promise<Secret[]> {
    if (this.usePostgres) {
      const res = await this.pool!.query("SELECT * FROM secrets WHERE user_id = $1", [userId]);
      return res.rows.map(toCamel);
    }
    return this.readJson().secrets.filter((s) => s.userId === userId);
  }

  async createSecret(secret: Secret): Promise<Secret> {
    if (this.usePostgres) {
      await this.pool!.query(
        "INSERT INTO secrets (id, user_id, label, key, encrypted_value, folder, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [
          secret.id,
          secret.userId,
          secret.label,
          secret.key,
          secret.encryptedValue,
          secret.folder,
          secret.createdAt,
          secret.updatedAt
        ]
      );
      return secret;
    }
    const db = this.readJson();
    db.secrets.push(secret);
    this.writeJson();
    return secret;
  }

  async deleteSecret(id: string, userId: string): Promise<boolean> {
    if (this.usePostgres) {
      const res = await this.pool!.query("DELETE FROM secrets WHERE id = $1 AND user_id = $2", [id, userId]);
      return (res.rowCount ?? 0) > 0;
    }
    const db = this.readJson();
    const len = db.secrets.length;
    db.secrets = db.secrets.filter((s) => !(s.id === id && s.userId === userId));
    const success = db.secrets.length < len;
    if (success) this.writeJson();
    return success;
  }

  // --- Snippets CRUD ---
  async getSnippets(userId: string): Promise<Snippet[]> {
    if (this.usePostgres) {
      const res = await this.pool!.query("SELECT * FROM snippets WHERE user_id = $1", [userId]);
      return res.rows.map(toCamel);
    }
    return this.readJson().snippets.filter((s) => s.userId === userId);
  }

  async createSnippet(snippet: Snippet): Promise<Snippet> {
    if (this.usePostgres) {
      await this.pool!.query(
        "INSERT INTO snippets (id, user_id, title, code, language, tags, folder, is_favorite, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
        [
          snippet.id,
          snippet.userId,
          snippet.title,
          snippet.code,
          snippet.language,
          JSON.stringify(snippet.tags),
          snippet.folder,
          snippet.isFavorite,
          snippet.createdAt,
          snippet.updatedAt
        ]
      );
      return snippet;
    }
    const db = this.readJson();
    db.snippets.push(snippet);
    this.writeJson();
    return snippet;
  }

  async updateSnippet(id: string, userId: string, updates: Partial<Snippet>): Promise<Snippet | undefined> {
    if (this.usePostgres) {
      const res = await this.pool!.query("SELECT * FROM snippets WHERE id = $1 AND user_id = $2 LIMIT 1", [id, userId]);
      const existing = res.rows[0] ? toCamel<Snippet>(res.rows[0]) : undefined;
      if (!existing) return undefined;

      const merged = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await this.pool!.query(
        "UPDATE snippets SET title = $1, code = $2, language = $3, tags = $4, folder = $5, is_favorite = $6, updated_at = $7 WHERE id = $8 AND user_id = $9",
        [
          merged.title,
          merged.code,
          merged.language,
          JSON.stringify(merged.tags),
          merged.folder,
          merged.isFavorite,
          merged.updatedAt,
          id,
          userId
        ]
      );
      return merged;
    }

    const db = this.readJson();
    const index = db.snippets.findIndex((s) => s.id === id && s.userId === userId);
    if (index === -1) return undefined;

    db.snippets[index] = {
      ...db.snippets[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.writeJson();
    return db.snippets[index];
  }

  async deleteSnippet(id: string, userId: string): Promise<boolean> {
    if (this.usePostgres) {
      const res = await this.pool!.query("DELETE FROM snippets WHERE id = $1 AND user_id = $2", [id, userId]);
      return (res.rowCount ?? 0) > 0;
    }
    const db = this.readJson();
    const len = db.snippets.length;
    db.snippets = db.snippets.filter((s) => !(s.id === id && s.userId === userId));
    const success = db.snippets.length < len;
    if (success) this.writeJson();
    return success;
  }

  // --- Notes CRUD ---
  async getNotes(userId: string): Promise<Note[]> {
    if (this.usePostgres) {
      const res = await this.pool!.query("SELECT * FROM notes WHERE user_id = $1", [userId]);
      return res.rows.map(toCamel);
    }
    return this.readJson().notes.filter((n) => n.userId === userId);
  }

  async createNote(note: Note): Promise<Note> {
    if (this.usePostgres) {
      await this.pool!.query(
        "INSERT INTO notes (id, user_id, title, content, folder, tags, is_favorite, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [
          note.id,
          note.userId,
          note.title,
          note.content,
          note.folder,
          JSON.stringify(note.tags),
          note.isFavorite,
          note.createdAt,
          note.updatedAt
        ]
      );
      return note;
    }
    const db = this.readJson();
    db.notes.push(note);
    this.writeJson();
    return note;
  }

  async updateNote(id: string, userId: string, updates: Partial<Note>): Promise<Note | undefined> {
    if (this.usePostgres) {
      const res = await this.pool!.query("SELECT * FROM notes WHERE id = $1 AND user_id = $2 LIMIT 1", [id, userId]);
      const existing = res.rows[0] ? toCamel<Note>(res.rows[0]) : undefined;
      if (!existing) return undefined;

      const merged = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await this.pool!.query(
        "UPDATE notes SET title = $1, content = $2, folder = $3, tags = $4, is_favorite = $5, updated_at = $6 WHERE id = $7 AND user_id = $8",
        [
          merged.title,
          merged.content,
          merged.folder,
          JSON.stringify(merged.tags),
          merged.isFavorite,
          merged.updatedAt,
          id,
          userId
        ]
      );
      return merged;
    }

    const db = this.readJson();
    const index = db.notes.findIndex((n) => n.id === id && n.userId === userId);
    if (index === -1) return undefined;

    db.notes[index] = {
      ...db.notes[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.writeJson();
    return db.notes[index];
  }

  async deleteNote(id: string, userId: string): Promise<boolean> {
    if (this.usePostgres) {
      const res = await this.pool!.query("DELETE FROM notes WHERE id = $1 AND user_id = $2", [id, userId]);
      return (res.rowCount ?? 0) > 0;
    }
    const db = this.readJson();
    const len = db.notes.length;
    db.notes = db.notes.filter((n) => !(n.id === id && n.userId === userId));
    const success = db.notes.length < len;
    if (success) this.writeJson();
    return success;
  }

  // --- Expenses CRUD ---
  async getExpenses(userId: string): Promise<Expense[]> {
    if (this.usePostgres) {
      const res = await this.pool!.query("SELECT * FROM expenses WHERE user_id = $1", [userId]);
      return res.rows.map(toCamel);
    }
    return this.readJson().expenses.filter((e) => e.userId === userId);
  }

  async createExpense(expense: Expense): Promise<Expense> {
    if (this.usePostgres) {
      await this.pool!.query(
        "INSERT INTO expenses (id, user_id, label, type, cost, billing_cycle, next_renewal, description, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
        [
          expense.id,
          expense.userId,
          expense.label,
          expense.type,
          expense.cost,
          expense.billingCycle,
          expense.nextRenewal,
          expense.description,
          expense.createdAt,
          expense.updatedAt
        ]
      );
      return expense;
    }
    const db = this.readJson();
    db.expenses.push(expense);
    this.writeJson();
    return expense;
  }

  async deleteExpense(id: string, userId: string): Promise<boolean> {
    if (this.usePostgres) {
      const res = await this.pool!.query("DELETE FROM expenses WHERE id = $1 AND user_id = $2", [id, userId]);
      return (res.rowCount ?? 0) > 0;
    }
    const db = this.readJson();
    const len = db.expenses.length;
    db.expenses = db.expenses.filter((e) => !(e.id === id && e.userId === userId));
    const success = db.expenses.length < len;
    if (success) this.writeJson();
    return success;
  }

  // --- Repositories CRUD ---
  async getRepositories(userId: string): Promise<RepositoryTracker[]> {
    if (this.usePostgres) {
      const res = await this.pool!.query("SELECT * FROM repositories WHERE user_id = $1", [userId]);
      return res.rows.map(toCamel);
    }
    return this.readJson().repositories.filter((r) => r.userId === userId);
  }

  async createRepository(repo: RepositoryTracker): Promise<RepositoryTracker> {
    if (this.usePostgres) {
      await this.pool!.query(
        "INSERT INTO repositories (id, user_id, name, url, branch, stars, issues, commits, open_pr, latest_release, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
        [
          repo.id,
          repo.userId,
          repo.name,
          repo.url,
          repo.branch,
          repo.stars,
          repo.issues,
          repo.commits,
          repo.openPr,
          repo.latestRelease,
          repo.createdAt,
          repo.updatedAt
        ]
      );
      return repo;
    }
    const db = this.readJson();
    db.repositories.push(repo);
    this.writeJson();
    return repo;
  }

  async updateRepository(id: string, userId: string, updates: Partial<RepositoryTracker>): Promise<RepositoryTracker | undefined> {
    if (this.usePostgres) {
      const res = await this.pool!.query("SELECT * FROM repositories WHERE id = $1 AND user_id = $2 LIMIT 1", [id, userId]);
      const existing = res.rows[0] ? toCamel<RepositoryTracker>(res.rows[0]) : undefined;
      if (!existing) return undefined;

      const merged = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await this.pool!.query(
        "UPDATE repositories SET name = $1, url = $2, branch = $3, stars = $4, issues = $5, commits = $6, open_pr = $7, latest_release = $8, updated_at = $9 WHERE id = $10 AND user_id = $11",
        [
          merged.name,
          merged.url,
          merged.branch,
          merged.stars,
          merged.issues,
          merged.commits,
          merged.openPr,
          merged.latestRelease,
          merged.updatedAt,
          id,
          userId
        ]
      );
      return merged;
    }

    const db = this.readJson();
    const index = db.repositories.findIndex((r) => r.id === id && r.userId === userId);
    if (index === -1) return undefined;

    db.repositories[index] = {
      ...db.repositories[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.writeJson();
    return db.repositories[index];
  }

  async deleteRepository(id: string, userId: string): Promise<boolean> {
    if (this.usePostgres) {
      const res = await this.pool!.query("DELETE FROM repositories WHERE id = $1 AND user_id = $2", [id, userId]);
      return (res.rowCount ?? 0) > 0;
    }
    const db = this.readJson();
    const len = db.repositories.length;
    db.repositories = db.repositories.filter((r) => !(r.id === id && r.userId === userId));
    const success = db.repositories.length < len;
    if (success) this.writeJson();
    return success;
  }

  // --- Bugs CRUD ---
  async getBugs(userId: string): Promise<Bug[]> {
    if (this.usePostgres) {
      const res = await this.pool!.query(
        `SELECT b.* FROM bugs b
         JOIN project_members pm ON b.project_id = pm.project_id
         WHERE pm.user_id = $1`,
        [userId]
      );
      return res.rows.map(toCamel);
    }
    const db = this.readJson();
    const pmList = db.projectMembers || [];
    const memberProjectIds = pmList.filter((pm) => pm.userId === userId).map((pm) => pm.projectId);
    return db.bugs.filter((b) => b.userId === userId || memberProjectIds.includes(b.projectId));
  }

  async createBug(bug: Bug): Promise<Bug> {
    if (this.usePostgres) {
      await this.pool!.query(
        "INSERT INTO bugs (id, user_id, project_id, title, description, priority, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [
          bug.id,
          bug.userId,
          bug.projectId,
          bug.title,
          bug.description,
          bug.priority,
          bug.status,
          bug.createdAt,
          bug.updatedAt
        ]
      );
      return bug;
    }
    const db = this.readJson();
    db.bugs.push(bug);
    this.writeJson();
    return bug;
  }

  async updateBug(id: string, userId: string, updates: Partial<Bug>): Promise<Bug | undefined> {
    if (this.usePostgres) {
      const res = await this.pool!.query(
        `SELECT b.* FROM bugs b
         JOIN project_members pm ON b.project_id = pm.project_id
         WHERE b.id = $1 AND pm.user_id = $2 LIMIT 1`,
        [id, userId]
      );
      const existing = res.rows[0] ? toCamel<Bug>(res.rows[0]) : undefined;
      if (!existing) return undefined;

      const merged = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await this.pool!.query(
        "UPDATE bugs SET project_id = $1, title = $2, description = $3, priority = $4, status = $5, updated_at = $6 WHERE id = $7",
        [
          merged.projectId,
          merged.title,
          merged.description,
          merged.priority,
          merged.status,
          merged.updatedAt,
          id
        ]
      );
      return merged;
    }

    const db = this.readJson();
    const index = db.bugs.findIndex((b) => b.id === id);
    if (index === -1) return undefined;
    const bug = db.bugs[index];
    const isMember = (db.projectMembers || []).some((pm) => pm.projectId === bug.projectId && pm.userId === userId);
    if (!isMember) return undefined;

    db.bugs[index] = {
      ...bug,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.writeJson();
    return db.bugs[index];
  }

  async deleteBug(id: string, userId: string): Promise<boolean> {
    if (this.usePostgres) {
      const res = await this.pool!.query(
        `DELETE FROM bugs WHERE id = $1 AND project_id IN (
          SELECT project_id FROM project_members WHERE user_id = $2
        )`,
        [id, userId]
      );
      return (res.rowCount ?? 0) > 0;
    }
    const db = this.readJson();
    const bug = db.bugs.find((b) => b.id === id);
    if (!bug) return false;
    const isMember = (db.projectMembers || []).some((pm) => pm.projectId === bug.projectId && pm.userId === userId);
    if (!isMember) return false;

    db.bugs = db.bugs.filter((b) => b.id !== id);
    this.writeJson();
    return true;
  }

  // --- Deployments CRUD ---
  async getDeployments(userId: string): Promise<Deployment[]> {
    if (this.usePostgres) {
      const res = await this.pool!.query(
        `SELECT d.* FROM deployments d
         JOIN project_members pm ON d.project_id = pm.project_id
         WHERE pm.user_id = $1`,
        [userId]
      );
      return res.rows.map(toCamel);
    }
    const db = this.readJson();
    const pmList = db.projectMembers || [];
    const memberProjectIds = pmList.filter((pm) => pm.userId === userId).map((pm) => pm.projectId);
    return db.deployments.filter((d) => d.userId === userId || memberProjectIds.includes(d.projectId));
  }

  async createDeployment(deployment: Deployment): Promise<Deployment> {
    if (this.usePostgres) {
      await this.pool!.query(
        "INSERT INTO deployments (id, user_id, project_id, frontend_url, backend_url, platform, notes, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [
          deployment.id,
          deployment.userId,
          deployment.projectId,
          deployment.frontendUrl,
          deployment.backendUrl,
          deployment.platform,
          deployment.notes,
          deployment.createdAt,
          deployment.updatedAt
        ]
      );
      return deployment;
    }
    const db = this.readJson();
    db.deployments.push(deployment);
    this.writeJson();
    return deployment;
  }

  async updateDeployment(id: string, userId: string, updates: Partial<Deployment>): Promise<Deployment | undefined> {
    if (this.usePostgres) {
      const res = await this.pool!.query(
        `SELECT d.* FROM deployments d
         JOIN project_members pm ON d.project_id = pm.project_id
         WHERE d.id = $1 AND pm.user_id = $2 LIMIT 1`,
        [id, userId]
      );
      const existing = res.rows[0] ? toCamel<Deployment>(res.rows[0]) : undefined;
      if (!existing) return undefined;

      const merged = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await this.pool!.query(
        "UPDATE deployments SET project_id = $1, frontend_url = $2, backend_url = $3, platform = $4, notes = $5, updated_at = $6 WHERE id = $7",
        [
          merged.projectId,
          merged.frontendUrl,
          merged.backendUrl,
          merged.platform,
          merged.notes,
          merged.updatedAt,
          id
        ]
      );
      return merged;
    }

    const db = this.readJson();
    const index = db.deployments.findIndex((d) => d.id === id);
    if (index === -1) return undefined;
    const dep = db.deployments[index];
    const isMember = (db.projectMembers || []).some((pm) => pm.projectId === dep.projectId && pm.userId === userId);
    if (!isMember) return undefined;

    db.deployments[index] = {
      ...dep,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.writeJson();
    return db.deployments[index];
  }

  async deleteDeployment(id: string, userId: string): Promise<boolean> {
    if (this.usePostgres) {
      const res = await this.pool!.query(
        `DELETE FROM deployments WHERE id = $1 AND project_id IN (
          SELECT project_id FROM project_members WHERE user_id = $2
        )`,
        [id, userId]
      );
      return (res.rowCount ?? 0) > 0;
    }
    const db = this.readJson();
    const dep = db.deployments.find((d) => d.id === id);
    if (!dep) return false;
    const isMember = (db.projectMembers || []).some((pm) => pm.projectId === dep.projectId && pm.userId === userId);
    if (!isMember) return false;

    db.deployments = db.deployments.filter((d) => d.id !== id);
    this.writeJson();
    return true;
  }

  // --- Export / Import ---
  async getRawData(): Promise<DatabaseSchema> {
    if (this.usePostgres) {
      const users = await this.pool!.query("SELECT * FROM users");
      const projects = await this.pool!.query("SELECT * FROM projects");
      const secrets = await this.pool!.query("SELECT * FROM secrets");
      const snippets = await this.pool!.query("SELECT * FROM snippets");
      const notes = await this.pool!.query("SELECT * FROM notes");
      const expenses = await this.pool!.query("SELECT * FROM expenses");
      const repositories = await this.pool!.query("SELECT * FROM repositories");
      const bugs = await this.pool!.query("SELECT * FROM bugs");
      const deployments = await this.pool!.query("SELECT * FROM deployments");
      const projectMembers = await this.pool!.query("SELECT * FROM project_members");
      const invitations = await this.pool!.query("SELECT * FROM invitations");
      const notifications = await this.pool!.query("SELECT * FROM notifications");
      const activityLogs = await this.pool!.query("SELECT * FROM activity_logs");

      return {
        users: users.rows.map(toCamel),
        projects: projects.rows.map(toCamel),
        secrets: secrets.rows.map(toCamel),
        snippets: snippets.rows.map(toCamel),
        notes: notes.rows.map(toCamel),
        expenses: expenses.rows.map(toCamel),
        repositories: repositories.rows.map(toCamel),
        bugs: bugs.rows.map(toCamel),
        deployments: deployments.rows.map(toCamel),
        projectMembers: projectMembers.rows.map(toCamel),
        invitations: invitations.rows.map(toCamel),
        notifications: notifications.rows.map(toCamel),
        activityLogs: activityLogs.rows.map(toCamel)
      };
    }
    return this.readJson();
  }

  async importRawData(newData: any): Promise<void> {
    if (!this.usePostgres) {
      const db = this.readJson();
      if (newData.users) db.users = newData.users;
      if (newData.projects) db.projects = newData.projects;
      if (newData.secrets) db.secrets = newData.secrets;
      if (newData.snippets) db.snippets = newData.snippets;
      if (newData.notes) db.notes = newData.notes;
      if (newData.expenses) db.expenses = newData.expenses;
      if (newData.repositories) db.repositories = newData.repositories;
      if (newData.bugs) db.bugs = newData.bugs;
      if (newData.deployments) db.deployments = newData.deployments;
      if (newData.projectMembers) db.projectMembers = newData.projectMembers;
      if (newData.invitations) db.invitations = newData.invitations;
      if (newData.notifications) db.notifications = newData.notifications;
      if (newData.activityLogs) db.activityLogs = newData.activityLogs;
      this.writeJson();
      return;
    }

    const client = await this.pool!.connect();
    try {
      await client.query("BEGIN");

      // Delete references first, then parent tables
      await client.query("DELETE FROM notifications");
      await client.query("DELETE FROM activity_logs");
      await client.query("DELETE FROM invitations");
      await client.query("DELETE FROM project_members");
      await client.query("DELETE FROM deployments");
      await client.query("DELETE FROM bugs");
      await client.query("DELETE FROM repositories");
      await client.query("DELETE FROM expenses");
      await client.query("DELETE FROM notes");
      await client.query("DELETE FROM snippets");
      await client.query("DELETE FROM secrets");
      await client.query("DELETE FROM projects");
      await client.query("DELETE FROM users");

      // Insert Users
      if (Array.isArray(newData.users)) {
        for (const u of newData.users) {
          await client.query(
            "INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)",
            [u.id, u.email, u.passwordHash, u.name, u.createdAt, u.updatedAt]
          );
        }
      }

      // Insert Projects
      if (Array.isArray(newData.projects)) {
        for (const p of newData.projects) {
          await client.query(
            `INSERT INTO projects (
              id, user_id, name, description, status, tech_stack, deadline, priority, 
              repository, live_url, server, database, domain, api_keys, notes, progress, 
              attachments, tags, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`,
            [
              p.id,
              p.userId,
              p.name,
              p.description || "",
              p.status || "planning",
              JSON.stringify(p.techStack || []),
              p.deadline || "",
              p.priority || "medium",
              p.repository || "",
              p.liveUrl || "",
              p.server || "",
              p.database || "",
              p.domain || "",
              p.apiKeys || "",
              p.notes || "",
              p.progress || 0,
              JSON.stringify(p.attachments || []),
              JSON.stringify(p.tags || []),
              p.createdAt,
              p.updatedAt
            ]
          );
        }
      }

      // Insert Secrets
      if (Array.isArray(newData.secrets)) {
        for (const s of newData.secrets) {
          await client.query(
            "INSERT INTO secrets (id, user_id, label, key, encrypted_value, folder, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
            [s.id, s.userId, s.label, s.key, s.encryptedValue, s.folder || "General", s.createdAt, s.updatedAt]
          );
        }
      }

      // Insert Snippets
      if (Array.isArray(newData.snippets)) {
        for (const s of newData.snippets) {
          await client.query(
            "INSERT INTO snippets (id, user_id, title, code, language, tags, folder, is_favorite, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
            [
              s.id,
              s.userId,
              s.title,
              s.code,
              s.language || "javascript",
              JSON.stringify(s.tags || []),
              s.folder || "General",
              s.isFavorite || false,
              s.createdAt,
              s.updatedAt
            ]
          );
        }
      }

      // Insert Notes
      if (Array.isArray(newData.notes)) {
        for (const n of newData.notes) {
          await client.query(
            "INSERT INTO notes (id, user_id, title, content, folder, tags, is_favorite, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
            [
              n.id,
              n.userId,
              n.title,
              n.content || "",
              n.folder || "General",
              JSON.stringify(n.tags || []),
              n.isFavorite || false,
              n.createdAt,
              n.updatedAt
            ]
          );
        }
      }

      // Insert Expenses
      if (Array.isArray(newData.expenses)) {
        for (const e of newData.expenses) {
          await client.query(
            "INSERT INTO expenses (id, user_id, label, type, cost, billing_cycle, next_renewal, description, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
            [
              e.id,
              e.userId,
              e.label,
              e.type,
              e.cost || 0,
              e.billingCycle || "monthly",
              e.nextRenewal || "",
              e.description || "",
              e.createdAt,
              e.updatedAt
            ]
          );
        }
      }

      // Insert Repositories
      if (Array.isArray(newData.repositories)) {
        for (const r of newData.repositories) {
          await client.query(
            "INSERT INTO repositories (id, user_id, name, url, branch, stars, issues, commits, open_pr, latest_release, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)",
            [
              r.id,
              r.userId,
              r.name,
              r.url,
              r.branch || "main",
              r.stars || 0,
              r.issues || 0,
              r.commits || 0,
              r.openPr || 0,
              r.latestRelease || "",
              r.createdAt,
              r.updatedAt
            ]
          );
        }
      }

      // Insert Bugs
      if (Array.isArray(newData.bugs)) {
        for (const b of newData.bugs) {
          await client.query(
            "INSERT INTO bugs (id, user_id, project_id, title, description, priority, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
            [
              b.id,
              b.userId,
              b.projectId,
              b.title,
              b.description || "",
              b.priority || "medium",
              b.status || "open",
              b.createdAt,
              b.updatedAt
            ]
          );
        }
      }

      // Insert Deployments
      if (Array.isArray(newData.deployments)) {
        for (const d of newData.deployments) {
          await client.query(
            "INSERT INTO deployments (id, user_id, project_id, frontend_url, backend_url, platform, notes, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
            [
              d.id,
              d.userId,
              d.projectId,
              d.frontendUrl || "",
              d.backendUrl || "",
              d.platform,
              d.notes || "",
              d.createdAt,
              d.updatedAt
            ]
          );
        }
      }

      // Insert Project Members
      if (Array.isArray(newData.projectMembers)) {
        for (const pm of newData.projectMembers) {
          await client.query(
            "INSERT INTO project_members (id, project_id, user_id, role, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)",
            [pm.id, pm.projectId, pm.userId, pm.role, pm.createdAt, pm.updatedAt]
          );
        }
      }

      // Insert Invitations
      if (Array.isArray(newData.invitations)) {
        for (const inv of newData.invitations) {
          await client.query(
            "INSERT INTO invitations (id, project_id, inviter_id, email, role, message, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
            [inv.id, inv.projectId, inv.inviterId, inv.email, inv.role, inv.message, inv.status, inv.createdAt, inv.updatedAt]
          );
        }
      }

      // Insert Notifications
      if (Array.isArray(newData.notifications)) {
        for (const n of newData.notifications) {
          await client.query(
            "INSERT INTO notifications (id, user_id, type, title, message, project_id, invitation_id, read, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
            [n.id, n.userId, n.type, n.title, n.message, n.projectId, n.invitationId, n.read, n.createdAt, n.updatedAt]
          );
        }
      }

      // Insert Activity Logs
      if (Array.isArray(newData.activityLogs)) {
        for (const log of newData.activityLogs) {
          await client.query(
            "INSERT INTO activity_logs (id, project_id, user_id, action, details, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
            [log.id, log.projectId, log.userId, log.action, log.details, log.createdAt]
          );
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Failed to import database into PostgreSQL:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // --- Project Members CRUD ---
  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    if (this.usePostgres) {
      const res = await this.pool!.query(
        `SELECT pm.*, u.name as user_name, u.email as user_email 
         FROM project_members pm 
         JOIN users u ON pm.user_id = u.id 
         WHERE pm.project_id = $1`,
        [projectId]
      );
      return res.rows.map(toCamel);
    }
    const db = this.readJson();
    const members = (db.projectMembers || []).filter((m) => m.projectId === projectId);
    return members.map((m) => {
      const user = db.users.find((u) => u.id === m.userId);
      return { ...m, userName: user?.name, userEmail: user?.email };
    });
  }

  async getProjectMember(projectId: string, userId: string): Promise<ProjectMember | undefined> {
    if (this.usePostgres) {
      const res = await this.pool!.query(
        `SELECT pm.*, u.name as user_name, u.email as user_email 
         FROM project_members pm 
         JOIN users u ON pm.user_id = u.id 
         WHERE pm.project_id = $1 AND pm.user_id = $2 
         LIMIT 1`,
        [projectId, userId]
      );
      return res.rows[0] ? toCamel<ProjectMember>(res.rows[0]) : undefined;
    }
    const db = this.readJson();
    const pm = (db.projectMembers || []).find((m) => m.projectId === projectId && m.userId === userId);
    if (!pm) return undefined;
    const user = db.users.find((u) => u.id === pm.userId);
    return { ...pm, userName: user?.name, userEmail: user?.email };
  }

  async createProjectMember(member: ProjectMember): Promise<ProjectMember> {
    if (this.usePostgres) {
      await this.pool!.query(
        `INSERT INTO project_members (id, project_id, user_id, role, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [member.id, member.projectId, member.userId, member.role, member.createdAt, member.updatedAt]
      );
      return member;
    }
    const db = this.readJson();
    db.projectMembers = db.projectMembers || [];
    db.projectMembers.push(member);
    this.writeJson();
    return member;
  }

  async updateProjectMemberRole(projectId: string, userId: string, role: string): Promise<boolean> {
    if (this.usePostgres) {
      const res = await this.pool!.query(
        `UPDATE project_members SET role = $1, updated_at = $2 
         WHERE project_id = $3 AND user_id = $4`,
        [role, new Date().toISOString(), projectId, userId]
      );
      return (res.rowCount ?? 0) > 0;
    }
    const db = this.readJson();
    const index = (db.projectMembers || []).findIndex((m) => m.projectId === projectId && m.userId === userId);
    if (index === -1) return false;
    db.projectMembers[index].role = role as any;
    db.projectMembers[index].updatedAt = new Date().toISOString();
    this.writeJson();
    return true;
  }

  async deleteProjectMember(projectId: string, userId: string): Promise<boolean> {
    if (this.usePostgres) {
      const res = await this.pool!.query(
        "DELETE FROM project_members WHERE project_id = $1 AND user_id = $2",
        [projectId, userId]
      );
      return (res.rowCount ?? 0) > 0;
    }
    const db = this.readJson();
    const len = db.projectMembers ? db.projectMembers.length : 0;
    db.projectMembers = (db.projectMembers || []).filter((m) => !(m.projectId === projectId && m.userId === userId));
    const success = db.projectMembers.length < len;
    if (success) this.writeJson();
    return success;
  }

  async transferProjectOwnership(projectId: string, currentOwnerId: string, newOwnerId: string): Promise<boolean> {
    if (this.usePostgres) {
      const client = await this.pool!.connect();
      try {
        await client.query("BEGIN");
        await client.query("UPDATE projects SET user_id = $1 WHERE id = $2", [newOwnerId, projectId]);
        await client.query("UPDATE project_members SET role = 'admin' WHERE project_id = $1 AND user_id = $2", [projectId, currentOwnerId]);
        await client.query("UPDATE project_members SET role = 'owner' WHERE project_id = $1 AND user_id = $2", [projectId, newOwnerId]);
        await client.query("COMMIT");
        return true;
      } catch (err) {
        await client.query("ROLLBACK");
        console.error("Failed to transfer ownership in PostgreSQL:", err);
        return false;
      } finally {
        client.release();
      }
    }
    const db = this.readJson();
    const pIndex = db.projects.findIndex((p) => p.id === projectId);
    if (pIndex === -1) return false;
    db.projects[pIndex].userId = newOwnerId;

    const pmList = db.projectMembers || [];
    const currentOwnerMember = pmList.find((m) => m.projectId === projectId && m.userId === currentOwnerId);
    const newOwnerMember = pmList.find((m) => m.projectId === projectId && m.userId === newOwnerId);

    if (currentOwnerMember) currentOwnerMember.role = "admin";
    if (newOwnerMember) {
      newOwnerMember.role = "owner";
    } else {
      pmList.push({
        id: crypto.randomUUID(),
        projectId,
        userId: newOwnerId,
        role: "owner",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    db.projectMembers = pmList;
    this.writeJson();
    return true;
  }

  // --- Invitations CRUD ---
  async getInvitationById(id: string): Promise<Invitation | undefined> {
    if (this.usePostgres) {
      const res = await this.pool!.query(
        `SELECT i.*, p.name as project_name, u.name as inviter_name 
         FROM invitations i 
         JOIN projects p ON i.project_id = p.id 
         JOIN users u ON i.inviter_id = u.id 
         WHERE i.id = $1 LIMIT 1`,
        [id]
      );
      return res.rows[0] ? toCamel<Invitation>(res.rows[0]) : undefined;
    }
    const db = this.readJson();
    const i = (db.invitations || []).find((inv) => inv.id === id);
    if (!i) return undefined;
    const project = db.projects.find((p) => p.id === i.projectId);
    const inviter = db.users.find((u) => u.id === i.inviterId);
    return { ...i, projectName: project?.name, inviterName: inviter?.name };
  }

  async getInvitationByProjectAndEmail(projectId: string, email: string): Promise<Invitation | undefined> {
    if (this.usePostgres) {
      const res = await this.pool!.query(
        `SELECT * FROM invitations 
         WHERE project_id = $1 AND LOWER(email) = LOWER($2) AND status = 'pending' 
         LIMIT 1`,
        [projectId, email]
      );
      return res.rows[0] ? toCamel<Invitation>(res.rows[0]) : undefined;
    }
    const db = this.readJson();
    return (db.invitations || []).find(
      (i) => i.projectId === projectId && i.email.toLowerCase() === email.toLowerCase() && i.status === "pending"
    );
  }

  async getInvitationsByProject(projectId: string): Promise<Invitation[]> {
    if (this.usePostgres) {
      const res = await this.pool!.query(
        `SELECT i.*, u.name as inviter_name 
         FROM invitations i 
         JOIN users u ON i.inviter_id = u.id 
         WHERE i.project_id = $1`,
        [projectId]
      );
      return res.rows.map(toCamel);
    }
    const db = this.readJson();
    const list = (db.invitations || []).filter((i) => i.projectId === projectId);
    return list.map((i) => {
      const inviter = db.users.find((u) => u.id === i.inviterId);
      return { ...i, inviterName: inviter?.name };
    });
  }

  async createInvitation(inv: Invitation): Promise<Invitation> {
    if (this.usePostgres) {
      await this.pool!.query(
        `INSERT INTO invitations (id, project_id, inviter_id, email, role, message, status, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [inv.id, inv.projectId, inv.inviterId, inv.email, inv.role, inv.message, inv.status, inv.createdAt, inv.updatedAt]
      );
      return inv;
    }
    const db = this.readJson();
    db.invitations = db.invitations || [];
    db.invitations.push(inv);
    this.writeJson();
    return inv;
  }

  async updateInvitationStatus(id: string, status: string): Promise<boolean> {
    if (this.usePostgres) {
      const res = await this.pool!.query(
        "UPDATE invitations SET status = $1, updated_at = $2 WHERE id = $3",
        [status, new Date().toISOString(), id]
      );
      return (res.rowCount ?? 0) > 0;
    }
    const db = this.readJson();
    const index = (db.invitations || []).findIndex((i) => i.id === id);
    if (index === -1) return false;
    db.invitations[index].status = status as any;
    db.invitations[index].updatedAt = new Date().toISOString();
    this.writeJson();
    return true;
  }

  async deleteInvitation(id: string): Promise<boolean> {
    if (this.usePostgres) {
      const res = await this.pool!.query("DELETE FROM invitations WHERE id = $1", [id]);
      return (res.rowCount ?? 0) > 0;
    }
    const db = this.readJson();
    const len = db.invitations ? db.invitations.length : 0;
    db.invitations = (db.invitations || []).filter((i) => i.id !== id);
    const success = db.invitations.length < len;
    if (success) this.writeJson();
    return success;
  }

  // --- Notifications CRUD ---
  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    if (this.usePostgres) {
      const res = await this.pool!.query(
        "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC",
        [userId]
      );
      return res.rows.map(toCamel);
    }
    const db = this.readJson();
    return (db.notifications || [])
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createNotification(notif: Notification): Promise<Notification> {
    if (this.usePostgres) {
      await this.pool!.query(
        `INSERT INTO notifications (id, user_id, type, title, message, project_id, invitation_id, read, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          notif.id,
          notif.userId,
          notif.type,
          notif.title,
          notif.message,
          notif.projectId,
          notif.invitationId,
          notif.read,
          notif.createdAt,
          notif.updatedAt
        ]
      );
      return notif;
    }
    const db = this.readJson();
    db.notifications = db.notifications || [];
    db.notifications.push(notif);
    this.writeJson();
    return notif;
  }

  async markNotificationAsRead(id: string, userId: string): Promise<boolean> {
    if (this.usePostgres) {
      const res = await this.pool!.query(
        "UPDATE notifications SET read = TRUE, updated_at = $1 WHERE id = $2 AND user_id = $3",
        [new Date().toISOString(), id, userId]
      );
      return (res.rowCount ?? 0) > 0;
    }
    const db = this.readJson();
    const index = (db.notifications || []).findIndex((n) => n.id === id && n.userId === userId);
    if (index === -1) return false;
    db.notifications[index].read = true;
    db.notifications[index].updatedAt = new Date().toISOString();
    this.writeJson();
    return true;
  }

  // --- Activity Logs CRUD ---
  async createActivityLog(log: ActivityLog): Promise<ActivityLog> {
    if (this.usePostgres) {
      await this.pool!.query(
        `INSERT INTO activity_logs (id, project_id, user_id, action, details, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [log.id, log.projectId, log.userId, log.action, log.details, log.createdAt]
      );
      return log;
    }
    const db = this.readJson();
    db.activityLogs = db.activityLogs || [];
    db.activityLogs.push(log);
    this.writeJson();
    return log;
  }

  async getActivityLogsByProject(projectId: string): Promise<ActivityLog[]> {
    if (this.usePostgres) {
      const res = await this.pool!.query(
        `SELECT al.*, u.name as user_name 
         FROM activity_logs al 
         JOIN users u ON al.user_id = u.id 
         WHERE al.project_id = $1 
         ORDER BY al.created_at DESC`,
        [projectId]
      );
      return res.rows.map(toCamel);
    }
    const db = this.readJson();
    const list = (db.activityLogs || []).filter((l) => l.projectId === projectId);
    return list
      .map((l) => {
        const user = db.users.find((u) => u.id === l.userId);
        return { ...l, userName: user?.name };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export const dbManager = new DatabaseManager();
