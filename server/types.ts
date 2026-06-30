/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export enum ProjectStatus {
  PLANNING = "planning",
  IN_PROGRESS = "in-progress",
  PAUSED = "paused",
  COMPLETED = "completed",
}

export enum ProjectPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
  status: ProjectStatus;
  techStack: string[];
  deadline: string;
  priority: ProjectPriority;
  repository: string;
  liveUrl: string;
  server: string;
  database: string;
  domain: string;
  apiKeys: string; // Encrypted JSON string
  notes: string;
  progress: number; // 0 to 100
  attachments: { name: string; url: string }[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Secret {
  id: string;
  userId: string;
  label: string;
  key: string;
  encryptedValue: string; // Encrypted value
  folder: string; // folder name or "General"
  createdAt: string;
  updatedAt: string;
}

export interface Snippet {
  id: string;
  userId: string;
  title: string;
  code: string;
  language: string; // python, javascript, react, sql, fastapi, etc.
  tags: string[];
  folder: string; // folder name or "General"
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string; // Markdown text
  folder: string; // folder name or "General"
  tags: string[];
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export enum ExpenseType {
  DOMAIN = "domain",
  SERVER = "server",
  STORAGE = "storage",
  AI_API = "ai-api",
  HOSTING = "hosting",
  SUBSCRIPTION = "subscription",
  SSL = "ssl",
  OTHER = "other",
}

export interface Expense {
  id: string;
  userId: string;
  label: string;
  type: ExpenseType;
  cost: number;
  billingCycle: "monthly" | "yearly" | "one-time";
  nextRenewal: string; // ISO date
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface RepositoryTracker {
  id: string;
  userId: string;
  name: string; // e.g. "facebook/react"
  url: string;
  branch: string;
  stars: number;
  issues: number;
  commits: number;
  openPr: number;
  latestRelease: string;
  createdAt: string;
  updatedAt: string;
}

export enum BugStatus {
  OPEN = "open",
  WORKING = "working",
  RESOLVED = "resolved",
  CLOSED = "closed",
}

export interface Bug {
  id: string;
  userId: string;
  projectId: string; // links to a project
  title: string;
  description: string;
  priority: ProjectPriority;
  status: BugStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Deployment {
  id: string;
  userId: string;
  projectId: string; // links to a project
  frontendUrl: string;
  backendUrl: string;
  platform: string; // Render, Railway, Vercel, Docker, VPS, etc.
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type ProjectRole = "owner" | "admin" | "editor" | "viewer";

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  createdAt: string;
  updatedAt: string;
  // Included fields for API display convenience
  userName?: string;
  userEmail?: string;
}

export interface Invitation {
  id: string;
  projectId: string;
  inviterId: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  message?: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  updatedAt: string;
  projectName?: string;
  inviterName?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: "project_invitation" | "role_changed" | "removed_from_project" | "added_to_project";
  title: string;
  message: string;
  projectId?: string;
  invitationId?: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  projectId: string;
  userId: string;
  action: "member_invited" | "invitation_accepted" | "invitation_rejected" | "role_changed" | "member_removed" | "ownership_transferred";
  details: string;
  createdAt: string;
  userName?: string;
}

