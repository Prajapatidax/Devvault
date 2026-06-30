import dotenv from "dotenv";
// Load environment variables from .env immediately before importing other modules
dotenv.config();

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { apiRouter } from "./server/routes";
import { dbManager } from "./server/db";

async function startServer() {
  // Initialize database (Postgres or local JSON fallback)
  await dbManager.initialize();

  const app = express();
  const PORT = 3000;


  // Global Middlewares
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // API Router Mount
  app.use("/api", apiRouter);

  // API JSON Error Handler
  app.use("/api", (err: any, req: any, res: any, next: any) => {
    console.error("API Router Error:", err);
    res.status(err.status || 500).json({
      error: err.message || "Internal Server Error"
    });
  });

  // Serve static assets or mount Vite dev server
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode serving built static files...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DevVault server running successfully at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start DevVault server:", err);
  process.exit(1);
});
