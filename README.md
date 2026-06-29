# 🛠️ DevVault: Unified Developer Workspace

DevVault is a **local-first, secure developer portal** designed to centralize and streamline your software engineering workflows. It provides a single local control panel to manage projects, secure secrets, organize snippets, document databases, track project expenses, monitor bugs, manage deployments, and utilize AI assistance—all stored securely on your local disk.

> ℹ️ **Design Philosophy**: DevVault is built with security and convenience in mind. Your source code repositories, API credentials, and financial logs never leave your personal computer.

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
   * Open `.env` and fill in your variables:
     ```env
     PORT=3000
     NODE_ENV=development
     JWT_SECRET=your-random-jwt-signing-secret
     ENCRYPTION_KEY=your-32-byte-hex-or-string-aes-key
     GEMINI_API_KEY=your-gemini-api-key-here
     ```

### 🏃 Running the Application

* **Start in Development Mode**:
  Runs the server with Vite middleware integration. Supports Hot Module Replacement (HMR) and automatic reloading:
  ```bash
  npm run dev
  ```
  After launching, open your browser and navigate to: **[http://localhost:3000](http://localhost:3000)**.

* **Build and Run for Production**:
  Compiles the React application into static assets and bundles the Express API for optimal performance:
  ```bash
  # Clean old builds and build frontend/backend bundles
  npm run build
  
  # Start the compiled production server
  npm start
  ```

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
| **Database** | Synchronous Local JSON file (`db.json`) | Single-file persistence with low latency |
| **Security** | Crypto (AES-256-CBC, PBKDF2) | Protects API credentials, secrets, and session safety |

---

## 🔑 Security & Safety Features

DevVault is built from the ground up to protect your sensitive credentials. 

* **AES-256-CBC Encryption**: All keys, passwords, and tokens stored inside the Secrets Manager or Projects lists are encrypted with random IVs before being saved to the local file database.
* **PBKDF2 Password Hashing**: User authentication is protected with PBKDF2 hashing, using 10,000 iterations and cryptographically random salts.
* **No Telemetry**: Your data stays 100% local. The application compiles and runs purely in your local environment, making it safe for confidential business secrets and proprietary keys.
* **Sanitized Outputs**: The server never returns plain secrets in list responses. Decryption only happens on-demand via authenticated endpoints.

For a detailed analysis of our security protocols, see **[SECURITY.md](file:///d:/DAX/Devvault/SECURITY.md)**.

---

## 🗂️ Core Functional Modules

### 1. 📊 Centralized Dashboard
A unified interface displaying real-time metrics, project progression trackers, bug resolution counts, code snippet language counts, and active hosting budget forecasts.

### 2. 📂 Project Workspace Manager
Allows developers to monitor projects, track status (Planning, In-Progress, Paused, Completed), priority tiers, deadliness, domains, databases, repository URLs, and encrypted API configurations.

### 3. 🔐 Secrets Manager
A secure storage container for developer credentials (AWS, Stripe, Firebase keys). Organizes values into folders (e.g., Production, Staging, General) and hides plain values behind a secure, on-demand decryption click handler.

### 4. 📝 Code Snippet Library
Save, favorite, search, and categorize common code blocks and scripts across multiple programming languages (JavaScript, Python, SQL, CSS, etc.) with built-in copy controls.

### 5. ✍️ Markdown Note Taker
A full-featured Markdown workspace. Take developer notes, write schemas, design API drafts, and preview the rendering with real-time editing.

### 6. 💸 Project Expense Tracker
Track hosting bills, subscription cycles, domains, SSL licenses, and cloud budgets. Automatically projects monthly and yearly cost run-rates to prevent billing surprises.

### 7. 🐙 GitHub Repository Tracker
Integrates with the GitHub API to monitor repository stars, branches, commit totals, active issues, open pull requests, and latest release tags.

### 8. 🐛 Bug Tracker
Log, prioritize, and associate codebase issues and errors directly with specific projects to manage ticket queues locally.

### 9. 🚀 Deployment Manager
Document service links, cloud providers (Render, Railway, Vercel, VPS), deployment notes, and frontend/backend URLs.

### 10. 🤖 DevVault AI Assistant
An interactive chatbot powered by Gemini 3.5 Flash. It references context-specific project variables or selected code snippets to guide troubleshooting and answer complex API questions.

### 11. 📄 Automated Documentation Generator
Instantly generates standard Markdown documents (`README.md`, REST API Reference manuals, Architectural schematics, or Onboarding instructions) using project stack parameters and custom prompts.