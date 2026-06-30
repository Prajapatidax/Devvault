/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useToast, Button, Badge } from "./UI";
import { Notification } from "../types";
import { Bell, Check, X, MailCheck, ShieldCheck, MailWarning, Eye, RefreshCw } from "lucide-react";

interface NotificationsPageProps {
  onRefreshStats?: () => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onRefreshStats }) => {
  const { apiFetch } = useAuth();
  const { toast } = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error(err);
      toast("Failed to load notifications.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Hook into Realtime SSE broadcast updates
  useEffect(() => {
    const eventSource = new EventSource("/api/realtime");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Refresh when notifications or user-specific updates change
        if (data.type === "new_notification" || data.type === "my_role_changed" || data.type === "removed_from_project") {
          fetchNotifications();
          if (onRefreshStats) onRefreshStats();
        }
      } catch (err) {
        console.error("SSE parse error in NotificationsPage:", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [onRefreshStats]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await apiFetch(`/api/notifications/${id}/read`, {
        method: "PUT"
      });

      if (res.ok) {
        setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
        if (onRefreshStats) onRefreshStats();
      } else {
        toast("Failed to mark notification as read.", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error marking notification read.", "error");
    }
  };

  const handleAcceptInvitation = async (id: string, projectName: string) => {
    try {
      const res = await apiFetch(`/api/notifications/${id}/accept`, {
        method: "POST"
      });

      const data = await res.json();
      if (res.ok) {
        toast(`Joined project ${projectName}!`, "success");
        fetchNotifications();
        if (onRefreshStats) onRefreshStats();
      } else {
        toast(data.error || "Failed to accept invitation.", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error accepting invitation.", "error");
    }
  };

  const handleRejectInvitation = async (id: string) => {
    try {
      const res = await apiFetch(`/api/notifications/${id}/reject`, {
        method: "POST"
      });

      if (res.ok) {
        toast("Invitation rejected.", "info");
        fetchNotifications();
        if (onRefreshStats) onRefreshStats();
      } else {
        toast("Failed to reject invitation.", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error rejecting invitation.", "error");
    }
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "project_invitation":
        return <MailWarning className="h-5 w-5 text-indigo-400" />;
      case "role_changed":
        return <ShieldCheck className="h-5 w-5 text-amber-400" />;
      case "added_to_project":
        return <MailCheck className="h-5 w-5 text-emerald-400" />;
      case "removed_from_project":
        return <X className="h-5 w-5 text-red-400" />;
    }
  };

  const getNotificationBadge = (type: Notification["type"]) => {
    switch (type) {
      case "project_invitation":
        return <Badge variant="violet">Invitation</Badge>;
      case "role_changed":
        return <Badge variant="yellow">Role Change</Badge>;
      case "added_to_project":
        return <Badge variant="green">Added</Badge>;
      case "removed_from_project":
        return <Badge variant="red">Removed</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
            <Bell className="h-5 w-5 text-indigo-500 animate-pulse" /> Notifications Console
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Accept team invitations, track role changes, and view workspace updates.
          </p>
        </div>

        <Button variant="ghost" size="sm" onClick={fetchNotifications} className="border border-zinc-200 dark:border-zinc-800">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-xs font-mono text-zinc-500 gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-indigo-500" />
          <span>QUERYING NOTIFICATION CENTER...</span>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl bg-white/20 dark:bg-zinc-900/5">
          <span className="text-zinc-450 dark:text-zinc-500 text-xs font-mono">ALL CLEAR</span>
          <p className="text-[11px] text-zinc-400 mt-1 max-w-sm">
            No active project collaboration packets or notifications found.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {notifications.map((n) => {
            const isInvitation = n.type === "project_invitation" && n.invitationId;
            const titleMatch = n.message.match(/"([^"]+)"/); // Extract project name in quotes
            const projectName = titleMatch ? titleMatch[1] : "Project";

            return (
              <div
                key={n.id}
                className={`p-4 rounded-xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-sm ${
                  n.read
                    ? "bg-white/40 dark:bg-zinc-900/10 border-zinc-200 dark:border-zinc-800/60 opacity-75"
                    : "bg-white dark:bg-zinc-900/35 border-indigo-500/35 dark:border-indigo-500/20 shadow-md shadow-indigo-500/5"
                }`}
              >
                {/* Notification Info */}
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-850 rounded-lg mt-0.5">
                    {getNotificationIcon(n.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">{n.title}</span>
                      {getNotificationBadge(n.type)}
                      {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />}
                    </div>
                    <p className="text-xs text-zinc-550 dark:text-zinc-400 mt-1 leading-relaxed">
                      {n.message}
                    </p>
                    <span className="text-[9px] text-zinc-400 font-mono block mt-1.5">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Actions Panel */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Invitation acceptance actions */}
                  {isInvitation && !n.read ? (
                    <>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleAcceptInvitation(n.id, projectName)}
                        className="text-xs px-3.5 py-1.5"
                      >
                        <Check className="h-3.5 w-3.5" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleRejectInvitation(n.id)}
                        className="text-xs px-3.5 py-1.5"
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </>
                  ) : (
                    /* Read actions */
                    !n.read && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleMarkAsRead(n.id)}
                        className="border border-zinc-200 dark:border-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-850 hover:text-white"
                        title="Mark as Read"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
