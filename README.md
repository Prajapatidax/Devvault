# 🛠️ DevVault: Unified Developer Workspace

DevVault is a **local-first, secure developer portal** designed to centralize and streamline your software engineering workflows. It provides a single local control panel to manage projects, secure secrets, organize snippets, document databases, track project expenses, monitor bugs, manage deployments, and utilize AI assistance—stored securely in PostgreSQL (Supabase) with a local file fallback.

> **Design Philosophy**: DevVault is built with security and convenience in mind. Your data is stored securely in your dedicated PostgreSQL (Supabase) database, with a zero-config local JSON file backup option for easy local development.

---

## ⚡ Quick Links
* **Security Breakdown**: Learn why DevVault is secure in [SECURITY.md](file:///d:/DAX/Devvault/SECURITY.md).
* **Architecture Specifications**: Explore files, directories, database layouts, and dev pipelines in [ARCHITECTURE.md](file:///d:/DAX/Devvault/ARCHITECTURE.md).

---

## 🚀 Getting Started

### 📋 Prerequisites
* **Node.js**: Version `18.x` or higher installed on your system.
* **Google Gemini API Key**: Required for AI Assistant and Documentation Auto-Generation capabilities.

### ⚙️ Installation & Configuration

1. Clone or copy this workspace to your local directory.
2. Open your terminal in the directory and install all node packages:
   ```bash
   npm install
   ```
3. Set up your local environment file:
   * Copy the `.env.example` file to a new file named `.env`:
     ```bash
     cp .env.example .env
     ```
   * Open the newly created `.env` file and fill in your variables:
     ```env
     PORT=3000
     NODE_ENV=development
     JWT_SECRET=your-random-jwt-signing-secret
     ENCRYPTION_KEY=your-32-byte-hex-or-string-aes-key
     GEMINI_API_KEY=your-gemini-api-key-here
     DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/[database] # Optional: omit to fallback to local db.json
     ```

> [!IMPORTANT]
> Make sure `ENCRYPTION_KEY` is a secure 32-character key. This key is used to encrypt and decrypt all your sensitive project credentials and secrets locally. Keep it safe!

### 🏃 Running the Application

* **Start in Development Mode** (runs server with Vite middleware support, HMR, and auto-reload):
  ```bash
  npm run dev
  ```
  After starting, open your browser and navigate to: **[http://localhost:3000](http://localhost:3000)**.

* **Build and Run for Production** (compiles front-end and packages server code):
  ```bash
  npm run build
  npm start
  ```

---

## 📖 Step-by-Step Usage Guide

Below is a detailed walkthrough of how to set up, initialize, and use each module of DevVault.

### 🔐 1. Workspace Initialization & Login
1. When you first launch the app, you will be presented with the **Auth Screen**.
2. If this is your first run, toggle to **Initialize Workspace**.
3. Fill in the fields:
   * **Full Name**: Enter your name (e.g., `test` or your own name).
   * **Email Address**: Enter your local account email (e.g., `test@example.com`).
   * **Master Decrypt Key**: Choose a secure master password. This password hashes into the auth system and authorizes your local JWT sessions.
4. Click **Provision Vault & Begin** to create the workspace.
5. In the future, log in via the **Sign In** tab using the same email and Master Decrypt Key.

---

### 📂 2. Managing Projects
The **Project Manager** acts as the command center for your applications.
1. Click **Projects** in the sidebar.
2. To add a project, click the **+ New Project** button.
3. Fill in project details:
   * **Project Name** & **Description**.
   * **Development Status** (Planning, In Progress, Paused, Completed).
   * **Priority Tier** (Low, Medium, High, Critical).
   * **Tech Stack** (add tags like React, Node.js, SQLite).
   * **Repository & URL links** (GitHub Repository, Live URL).
   * **Database Specs & Domain**.
   * **Environment Secrets Configuration**: Write keys in a JSON format. These will be encrypted automatically.
4. Click **Save Project**.

---

### 🔑 3. Managing Secrets Securely
Store API keys, credentials, or client secrets in the **Secrets Manager**.
1. Navigate to **Secrets** in the sidebar.
2. Create folders to categorize your secrets (e.g., `Production`, `Staging`, `General`).
3. Click **+ Add Secret**.
4. Define:
   * **Secret Label** (e.g., `Stripe Sandbox Key`).
   * **Key Name** (e.g., `STRIPE_SECRET_KEY`).
   * **Value** (e.g., `sk_test_...`).
   * **Folder** classification.
5. Once saved, values are stored in the database encrypted with **AES-256-CBC**.
6. Hover and click the **Eye icon** next to any secret to decrypt and reveal it temporarily.

---

### 📝 4. Snippet Library
Save and organize reusable boilerplate codes, utilities, or scripts.
1. Navigate to **Snippets**.
2. Click **+ New Snippet**.
3. Specify:
   * **Title** (e.g., `Axios Client Instance`).
   * **Language** (e.g., `javascript`, `typescript`, `python`, `sql`).
   * **Code Content** and optional **Description/Tags**.
4. Use the **Search bar** to quickly filter by title, code terms, or language tag.
5. Click the copy icon to instantly copy snippets to your clipboard.

---

### ✍️ 5. Markdown Note Taker
Keep architectural notes, specifications, or todo lists in raw Markdown.
1. Go to **Notes**.
2. Select an existing note or click **+ New Note**.
3. Write your documentation in the text editor.
4. Toggle the **Preview** tab to see your rendered markdown in real-time.
5. Categorize notes with **Tags** (e.g., `General`, `Sprint`, `Database`) for quick filtering.

---

### 🤖 6. AI Assistant & Documentation Generator
Utilize local context powered by Google's Gemini models.
* **AIAssistant**:
  1. Open the **AI Assistant** tab.
  2. Ask questions about your code, debug stack traces, or draft configurations.
  3. You can reference specific projects or secrets in the chat context.
* **Auto-Documentation Generator**:
  1. Navigate to **Doc Generator**.
  2. Choose a template (e.g., `README.md`, `API Guide`, `Database Schema`).
  3. Select the target project to import its tech stack, databases, and general details.
  4. Write a custom instruction prompt if you want specific sections emphasized.
  5. Click **Generate Documentation** to get a formatted Markdown document ready to save or export.

---

### 💸 7. Project Expense & Budget Tracker
Monitor SaaS and server bills associated with your projects.
1. Navigate to **Expenses**.
2. Click **+ Add Subscription**.
3. Enter:
   * **Subscription Name** (e.g., `Vercel Pro Team`).
   * **Cost** & **Billing Period** (Monthly, Yearly).
   * **Renewal Date** & associated **Project**.
4. The dashboard will automatically calculate your aggregate **Monthly Run Rate** and **Yearly Hosting Budget** to help you keep server costs under control.

---

### 🐛 8. Bug & Ticket Tracker
Log bugs and coordinate issues.
1. Go to **Bug Tracker**.
2. Click **+ Add Ticket**.
3. Add a title, choose the associated project, set priority, and describe the bug details.
4. Toggle the status between **Open**, **In-Progress**, and **Resolved** as you resolve the issue.

---

### 🚀 9. Deployments & GitHub Integration
* **GitHub Sync**: Connect to your repo paths to quickly pull open branch names, star counts, commit logs, and issues.
* **Deployment Board**: Register your service endpoints (backend API server, front-end Vercel pages, staging URLs) along with cloud hosts (Render, AWS EC2, VPS) to keep all status urls readily accessible.

---

## 🛠️ Technology Stack

| Layer | Technology Used | Purpose |
|---|---|---|
| **Frontend** | React 19, TypeScript | Reactive interface rendering and view management |
| **Styling** | TailwindCSS v4 | Modern styling and dark/light responsive layout |
| **Animations** | Motion (Framer Motion) | Micro-interactions and smooth tab animations |
| **Icons** | Lucide React | Clean, scalable visual symbols |
| **Backend** | Node.js, Express, tsx | API routers, auth middleware, and filesystem controllers |
| **AI Engine** | Google GenAI SDK (`@google/genai`) | Drives DevVault AI and documentation generators |
| **Database** | PostgreSQL (Supabase) / JSON Fallback | Robust PostgreSQL storage with a zero-config local JSON file fallback |
| **Security** | Crypto (AES-256-CBC, PBKDF2) | Protects API credentials, secrets, and session safety |

---

## 🔑 Security & Safety Features

DevVault is built from the ground up to protect your sensitive credentials:

* **AES-256-CBC Encryption**: All keys, passwords, and tokens stored inside the Secrets Manager or Projects lists are encrypted with random IVs before being saved to the local file database.
* **PBKDF2 Password Hashing**: User authentication is protected with PBKDF2 hashing, using 10,000 iterations and cryptographically random salts.
* **No Telemetry**: Your data stays 100% local. The application compiles and runs purely in your local environment, making it safe for confidential business secrets and proprietary keys.
* **Sanitized Outputs**: The server never returns plain secrets in list responses. Decryption only happens on-demand via authenticated endpoints.

For a detailed analysis of our security protocols, see **[SECURITY.md](file:///d:/DAX/Devvault/SECURITY.md)**.