# Technical Architecture & System Design

This document details the architectural blueprint, design patterns, folder layout, data schemas, and AI integration mechanisms of the **DevVault** application.

---

## 🏗️ System Overview

DevVault is a unified developer workstation workspace built with a **decoupled Client-Server Architecture** compiled inside a single TypeScript-capable execution environment.

```
                  +-----------------------------------+
                  |        Client (Browser)           |
                  |  - Vite, React 19, Lucide React   |
                  |  - TailwindCSS, Motion Animation  |
                  +-----------------+-----------------+
                                    |
                           JSON HTTP Requests
                                    |
                                    v
                  +-----------------+-----------------+
                  |        Server (Node.js)           |
                  |  - Express, tsx execution         |
                  |  - AES-256-CBC, PBKDF2 Hashing    |
                  |  - Google GenAI SDK               |
                  +-----------------+-----------------+
                                    |
                       SQL Queries (pg Pool) / JSON
                                    v
                  +-----------------+-----------------+
                  |        Database Storage           |
                  |  - PostgreSQL (Supabase / local)  |
                  |  - server/db.json (JSON fallback) |
                  +-----------------------------------+
```

### 1. Dual-Mode Server Pipeline (`server.ts`)
The server initialization routine in [server.ts](file:///d:/DAX/Devvault/server.ts) automatically adapts its execution pipeline based on the running environment:

* **Development Mode (`process.env.NODE_ENV !== "production"`)**:
  Instead of running separate processes for Vite (frontend) and Express (backend), the server dynamically imports Vite and embeds it directly into the Express application using Vite's **Middleware Mode**:
  ```typescript
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
  ```
  This enables hot-module-replacement (HMR), TypeScript compilation on the fly, and code-splitting, all served from a single port (`3000`).

* **Production Mode**:
  In production, the frontend is compiled into optimized HTML, JS, and CSS bundles inside the `dist/` folder via `vite build`. The Express server mounts a static asset handler pointing to `dist/` and redirects all non-API wildcard routes (`*`) to `dist/index.html` to support client-side Single Page Application routing.

---

## 📂 Directory Layout

```
.
├── dist/                   # Production compiled assets (Vite frontend + Server bundles)
├── server/                 # Express backend server logic
│   ├── auth.ts             # Password hashing and custom JWT handlers
│   ├── db.json             # Local JSON fallback file storing all records
│   ├── db.ts               # Database controller (PostgreSQL Pool + JSON fallback)
│   ├── routes.ts           # REST API endpoints (Auth, Projects, Secrets, AI, Tracker, etc.)
│   └── types.ts            # TypeScript interfaces for database structures
├── src/                    # Vite + React frontend client application
│   ├── components/         # Modular user interface components
│   │   ├── AuthContext.tsx # Context provider storing JWT token and authentication states
│   │   ├── AuthPage.tsx    # User Login & Sign-up interface
│   │   ├── UI.tsx          # Reusable tailwind primitives (Button, Modal, Toast, Badge)
│   │   ├── SecretsManager.tsx # Secret storage with reveal cache and folder selectors
│   │   ├── ProjectManager.tsx # Project workspace management boards
│   │   ├── AIAssistant.tsx # General developer AI chatbot
│   │   ├── DocumentationGen.tsx # AI templates to export READMEs, API guides, etc.
│   │   └── ...             # Feature dashboards (Snippets, Notes, Expenses, GitHub, etc.)
│   ├── App.tsx             # Main shell layout, sidebar navigation, theme switcher, and stats
│   ├── index.css           # Global Tailwind directive files and custom overrides
│   ├── main.tsx            # React bootstrap script
│   └── types.ts            # Frontend-side Shared type declarations
├── .env                    # System local environment configurations
├── package.json            # Scripts, dependency manifests, and tooling versions
├── server.ts               # Server bootstrap entry point
├── tsconfig.json           # Compiler specifications for TypeScript
└── vite.config.ts          # Vite asset pipeline configuration
```

---

## 💾 Database Schema & CRUD layer

DevVault supports storing all data in a **PostgreSQL (Supabase) database** using the `pg` client driver. It automatically sets up schema tables and indexes upon connecting. If no `DATABASE_URL` is configured, it falls back to a local JSON-based transactional datastore in `server/db.json`.

### 1. Database Schema (`server/types.ts`)
The typescript definitions for the database structure represent an RDBMS-like structure. The database root contains tables for:
* **`users`**: User records containing IDs, emails, and hashed passwords.
* **`projects`**: Custom projects with tech-stack arrays, deadline parameters, and encrypted credential keys.
* **`secrets`**: Custom user credentials containing labels, folder domains, and encrypted password/key values.
* **`snippets`**: Code cards sorted by programming languages and user favorites.
* **`notes`**: Markdown notes supporting tag grouping.
* **`expenses`**: Financial lines for server costs, domains, or SaaS subscriptions with automatic renewal calculation.
* **`repositories`**: Monitored GitHub repository names (e.g. `facebook/react`) for API sync.
* **`bugs`**: Tracked system bug items tied directly to project IDs.
* **`deployments`**: Server endpoints, platforms (Vercel, Render, Railway), and frontend/backend URLs.

### 2. Database Connections & Operations
The database class `DatabaseManager` handles reads and writes asynchronously:
* **PostgreSQL Connection**: A connection pool (`pg.Pool`) manages connections to your remote Supabase instance or local Postgres. SQL queries are executed with type-safe mapping from snake_case database columns to camelCase types.
* **Automated Migrations**: Upon start, the server checks for table existence and creates them if missing. It also performs an automated migration of any local `db.json` user profiles/records into PostgreSQL if the database is detected to be empty.
* **Local JSON Fallback Cache**: If no `DATABASE_URL` environment variable is defined, the server stores records in memory and synchronizes mutations to the filesystem in `server/db.json`.

---

## 🤖 AI Core Integration

DevVault embeds advanced AI assistance natively using the **Google GenAI SDK** (`@google/genai`) to run generation tasks inside [routes.ts](file:///d:/DAX/Devvault/server/routes.ts#L598-L644).

### 1. Model Configuration
* **Model**: `gemini-3.5-flash`
* **Temperature**: `0.7` (optimized for developer suggestions: creative enough for layout recommendations, rigid enough to respect syntax rules).
* **System Instructions**: Configured dynamically to enforce production-ready, clean code blocks and professional markdown style.

### 2. Context Injection API
The endpoint `POST /api/ai/chat` dynamically builds prompts by merging the user query with structural metadata:
* **Project Context**: When asking a question from the Project Workspace, the server appends the description, tech stack details, and project databases to the system context, enabling Gemini to answer questions with project-specific relevance.
* **Code Context**: When troubleshooting code from the Snippet Manager, the server embeds the code block and its target programming language, allowing the model to detect syntax errors and refactor snippets instantly.

### 3. Documentation Templates
The [DocumentationGen.tsx](file:///d:/DAX/Devvault/src/components/DocumentationGen.tsx) component uses specialized prompting arrays to format results based on standard blueprints:
1. **`readme`**: Formulates a complete project instruction guide (Setup, run scripts, layouts).
2. **`api`**: Formulates REST endpoint tables, headers, and status code specifications.
3. **`arch`**: Formulates service topology, schema layout diagrams, and storage structures.
4. **`guide`**: Formulates workspace configuration procedures and common CLI terminal commands.
