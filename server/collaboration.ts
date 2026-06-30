/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Response, NextFunction } from "express";
import crypto from "crypto";
import { dbManager } from "./db";
import { AuthenticatedRequest } from "./routes";
import { ActivityLog } from "./types";

/**
 * Express Middleware to require specific Project Role permissions
 */
export function requireProjectPermission(allowedRoles: ("owner" | "admin" | "editor" | "viewer")[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Look for project ID in route parameters, query parameters, or body
    const projectId = req.params.projectId || req.body.projectId || req.query.projectId || req.params.id;
    if (!projectId) {
      return res.status(400).json({ error: "Bad Request: Missing project ID" });
    }

    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized: User not authenticated" });
    }

    try {
      const member = await dbManager.getProjectMember(projectId, req.user.id);
      if (!member) {
        return res.status(403).json({ error: "Forbidden: You are not a member of this project" });
      }

      if (!allowedRoles.includes(member.role)) {
        return res.status(403).json({ error: `Forbidden: Action requires role ${allowedRoles.join(" or ")}` });
      }

      // Attach the active member info onto the request object
      (req as any).projectMember = member;
      next();
    } catch (error) {
      next(error);
    }
  };
}

interface SSEClient {
  userId: string;
  res: Response;
}

/**
 * Reusable Server-Sent Events (SSE) Realtime Manager
 */
export const RealtimeManager = {
  clients: new Set<SSEClient>(),

  /**
   * Registers a client connection
   */
  addClient(userId: string, req: any, res: Response) {
    const client: SSEClient = { userId, res };
    this.clients.add(client);

    // Set headers for EventStream
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });

    // Send connection success payload
    res.write("data: " + JSON.stringify({ type: "connected" }) + "\n\n");

    // Remove client when request closes
    req.on("close", () => {
      this.clients.delete(client);
    });
  },

  /**
   * Sends an event to a specific user
   */
  broadcastToUser(userId: string, event: any) {
    for (const client of this.clients) {
      if (client.userId === userId) {
        client.res.write("data: " + JSON.stringify(event) + "\n\n");
      }
    }
  },

  /**
   * Broadcasts an event to all connected members of a project
   */
  async broadcast(projectId: string, event: any) {
    try {
      const members = await dbManager.getProjectMembers(projectId);
      const memberUserIds = members.map((m) => m.userId);

      for (const client of this.clients) {
        if (memberUserIds.includes(client.userId)) {
          client.res.write("data: " + JSON.stringify(event) + "\n\n");
        }
      }
    } catch (error) {
      console.error("Realtime manager failed to broadcast event:", error);
    }
  }
};

/**
 * Reusable Activity Logger helper
 */
export const ActivityLogger = {
  async log(
    projectId: string,
    userId: string,
    action: ActivityLog["action"],
    details: string
  ): Promise<ActivityLog | null> {
    try {
      const logPayload: ActivityLog = {
        id: crypto.randomUUID(),
        projectId,
        userId,
        action,
        details,
        createdAt: new Date().toISOString()
      };

      const savedLog = await dbManager.createActivityLog(logPayload);
      
      // Fetch user name to include in broadcast
      const user = await dbManager.getUserById(userId);
      const broadcastLog = {
        ...savedLog,
        userName: user?.name || "System"
      };

      // Push real-time event
      RealtimeManager.broadcast(projectId, {
        type: "activity_logged",
        projectId,
        log: broadcastLog
      });

      return savedLog;
    } catch (error) {
      console.error("ActivityLogger failed to save activity log:", error);
      return null;
    }
  }
};
