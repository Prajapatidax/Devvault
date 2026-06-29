/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  email: string;
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
  notes: string;
  progress: number;
  attachments: { name: string; url: string }[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Secret {
  id: string;
  label: string;
  key: string;
  folder: string;
  createdAt: string;
  updatedAt: string;
}

export interface Snippet {
  id: string;
  userId: string;
  title: string;
  code: string;
  language: string;
  tags: string[];
  folder: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  folder: string;
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
  nextRenewal: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface RepositoryTracker {
  id: string;
  userId: string;
  name: string;
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
  projectId: string;
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
  projectId: string;
  frontendUrl: string;
  backendUrl: string;
  platform: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}
