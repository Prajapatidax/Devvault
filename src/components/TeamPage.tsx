/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useToast, Button, Input, Badge } from "./UI";
import { InviteModal } from "./InviteModal";
import { ProjectMember, Invitation, ActivityLog, ProjectRole } from "../types";
import { 
  Users, UserMinus, ShieldAlert, ArrowLeftRight, Clock, 
  Search, ArrowUpDown, Trash2, MailX, AlertCircle, RefreshCw, X 
} from "lucide-react";

interface TeamPageProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

export const TeamPage: React.FC<TeamPageProps> = ({ projectId, projectName, onClose }) => {
  const { user, apiFetch } = useAuth();
  const { toast } = useToast();

  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "role" | "date">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Permission level of current user
  const [myRole, setMyRole] = useState<ProjectRole | null>(null);

  // Invite Modal State
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  // Transfer Ownership Modal/Confirm state
  const [transferringId, setTransferringId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Members
      const membersRes = await apiFetch(`/api/projects/${projectId}/members`);
      if (membersRes.ok) {
        const data = await membersRes.json();
        setMembers(data);
        
        // Find current user's role
        const me = data.find((m: ProjectMember) => m.userId === user?.id);
        if (me) {
          setMyRole(me.role);
        }
      }

      // 2. Fetch pending invitations (if Owner or Admin)
      const invsRes = await apiFetch(`/api/projects/${projectId}/invitations`);
      if (invsRes.ok) {
        const data = await invsRes.json();
        setInvitations(data);
      } else {
        setInvitations([]);
      }

      // 3. Fetch activity logs
      const logsRes = await apiFetch(`/api/projects/${projectId}/activity`);
      if (logsRes.ok) {
        const data = await logsRes.json();
        setActivityLogs(data);
      }
    } catch (err) {
      console.error(err);
      toast("Error loading team specifications.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  // Hook into Realtime SSE broadcast updates
  useEffect(() => {
    const eventSource = new EventSource("/api/realtime");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Refresh triggers on member/invitation updates for this project
        if (data.projectId === projectId) {
          if (
            data.type === "member_joined" ||
            data.type === "member_left" ||
            data.type === "member_role_changed" ||
            data.type === "ownership_transferred" ||
            data.type === "invitations_updated" ||
            data.type === "activity_logged"
          ) {
            fetchData();
          }
        }
      } catch (err) {
        console.error("Failed to parse SSE payload:", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [projectId]);

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const res = await apiFetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: "PUT",
        body: JSON.stringify({ role: newRole })
      });

      const data = await res.json();
      if (res.ok) {
        toast("Role updated successfully!", "success");
        fetchData();
      } else {
        toast(data.error || "Failed to update role.", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error modifying member role.", "error");
    }
  };

  const handleRemoveMember = async (memberId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from the project?`)) return;

    try {
      const res = await apiFetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: "DELETE"
      });

      const data = await res.json();
      if (res.ok) {
        toast(`${userName} removed from project.`, "success");
        fetchData();
      } else {
        toast(data.error || "Failed to remove member.", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error removing member.", "error");
    }
  };

  const handleTransferOwnership = async (targetUserId: string, userName: string) => {
    if (!confirm(`WARNING: Are you sure you want to TRANSFER ownership to ${userName}? You will lose owner controls and become an Admin.`)) return;

    try {
      const res = await apiFetch(`/api/projects/${projectId}/transfer-ownership`, {
        method: "POST",
        body: JSON.stringify({ newOwnerId: targetUserId })
      });

      const data = await res.json();
      if (res.ok) {
        toast(`Ownership successfully transferred to ${userName}!`, "success");
        fetchData();
      } else {
        toast(data.error || "Failed to transfer ownership.", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error transferring ownership.", "error");
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const res = await apiFetch(`/api/projects/${projectId}/invitations/${invitationId}`, {
        method: "DELETE"
      });

      const data = await res.json();
      if (res.ok) {
        toast("Invitation cancelled.", "success");
        fetchData();
      } else {
        toast(data.error || "Failed to cancel invitation.", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Error cancelling invitation.", "error");
    }
  };

  const toggleSort = (field: "name" | "role" | "date") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  // Searching & Sorting filters logic
  const filteredMembers = members.filter((m) => {
    const searchVal = search.toLowerCase();
    return (
      (m.userName || "").toLowerCase().includes(searchVal) ||
      (m.userEmail || "").toLowerCase().includes(searchVal) ||
      m.role.toLowerCase().includes(searchVal)
    );
  }).sort((a, b) => {
    let comp = 0;
    if (sortBy === "name") {
      comp = (a.userName || "").localeCompare(b.userName || "");
    } else if (sortBy === "role") {
      comp = a.role.localeCompare(b.role);
    } else if (sortBy === "date") {
      comp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return sortOrder === "asc" ? comp : -comp;
  });

  const getRoleBadge = (role: ProjectRole) => {
    switch (role) {
      case "owner": return <Badge variant="red">Owner</Badge>;
      case "admin": return <Badge variant="violet">Admin</Badge>;
      case "editor": return <Badge variant="green">Editor</Badge>;
      case "viewer": return <Badge variant="gray">Viewer</Badge>;
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "bg-red-500/10 text-red-400 border-red-500/20",
      "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
      "bg-amber-500/10 text-amber-400 border-amber-500/20",
      "bg-pink-500/10 text-pink-400 border-pink-500/20",
      "bg-sky-500/10 text-sky-400 border-sky-500/20",
    ];
    const charCode = name.charCodeAt(0) || 0;
    return colors[charCode % colors.length];
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-lg text-indigo-650 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/30">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-850 dark:text-zinc-150 flex items-center gap-1.5">
              Team Space: <span className="text-indigo-650 dark:text-indigo-400">{projectName}</span>
            </h2>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Manage member roles, invitations, and check developer activity.
            </p>
          </div>
        </div>
        
        <Button variant="ghost" size="sm" onClick={onClose} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-xs font-mono text-zinc-500 gap-2">
          <RefreshCw className="h-5 w-5 animate-spin text-indigo-500" />
          <span>QUERYING COLLABORATION PACKETS...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Members Space */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 font-mono tracking-wider uppercase">
                Active Members ({filteredMembers.length})
              </h3>
              
              {/* Search & Sort */}
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Filter members..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-800 dark:text-zinc-200 pl-8 pr-3.5 py-1.5 outline-none focus:border-indigo-500/50"
                  />
                </div>

                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => toggleSort("name")}
                  className={`text-[10px] py-1 px-2 border border-zinc-200 dark:border-zinc-800 font-mono ${sortBy === "name" ? "text-indigo-400 font-bold" : ""}`}
                >
                  <ArrowUpDown className="h-3 w-3" /> Name
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={() => toggleSort("role")}
                  className={`text-[10px] py-1 px-2 border border-zinc-200 dark:border-zinc-800 font-mono ${sortBy === "role" ? "text-indigo-400 font-bold" : ""}`}
                >
                  <ArrowUpDown className="h-3 w-3" /> Role
                </Button>
              </div>
            </div>

            {/* Members List */}
            <div className="flex flex-col gap-2.5">
              {filteredMembers.map((m) => {
                const isMe = m.userId === user?.id;
                const canManage = myRole === "owner" && !isMe;
                
                return (
                  <div 
                    key={m.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/15 backdrop-blur-sm gap-3.5"
                  >
                    {/* User profile details */}
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-full border flex items-center justify-center font-bold text-sm ${getAvatarColor(m.userName || "U")}`}>
                        {m.userName ? m.userName[0].toUpperCase() : "U"}
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-zinc-800 dark:text-white">
                            {m.userName} {isMe && <span className="text-[10px] text-zinc-455 font-mono">(You)</span>}
                          </span>
                          {getRoleBadge(m.role)}
                        </div>
                        <span className="block text-[10px] text-zinc-550 dark:text-zinc-400 truncate">{m.userEmail}</span>
                        <span className="block text-[9px] text-zinc-400 dark:text-zinc-500 font-mono flex items-center gap-1 mt-0.5">
                          <Clock className="h-2.5 w-2.5" /> Joined {new Date(m.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Owner controls */}
                      {canManage && (
                        <>
                          {/* Role selector dropdown */}
                          <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                            className="bg-white dark:bg-zinc-950 border border-zinc-205 dark:border-zinc-800 rounded-lg text-[10px] text-zinc-700 dark:text-zinc-300 px-2.5 py-1.5 outline-none font-semibold focus:border-indigo-500/50"
                          >
                            <option value="admin">Admin</option>
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>

                          {/* Ownership Transfer */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleTransferOwnership(m.userId, m.userName || "user")}
                            className="border border-zinc-200 dark:border-zinc-800 hover:text-indigo-400 text-zinc-405"
                            title="Transfer Project Ownership"
                          >
                            <ArrowLeftRight className="h-3 w-3" />
                          </Button>
                        </>
                      )}

                      {/* Remove Member button (Owners can remove anyone; Admins can remove editors/viewers) */}
                      {((myRole === "owner" && !isMe) || 
                        (myRole === "admin" && (m.role === "editor" || m.role === "viewer"))) && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleRemoveMember(m.userId, m.userName || "member")}
                          title="Remove Member"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Invite triggers */}
            {(myRole === "owner" || myRole === "admin") && (
              <div className="mt-2 p-5 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-100/10 dark:bg-zinc-900/5 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                  <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Invite new team players</h4>
                  <p className="text-[10px] text-zinc-550 dark:text-zinc-400 mt-0.5">
                    Grant admin permissions, write access, or read-only workspaces.
                  </p>
                </div>
                <Button variant="primary" size="sm" onClick={() => setIsInviteOpen(true)}>
                  Invite Member
                </Button>
              </div>
            )}
          </div>

          {/* Sidebar Panel (Invitations & Activity logs) */}
          <div className="flex flex-col gap-5">
            {/* Pending Invitations list */}
            {(myRole === "owner" || myRole === "admin") && (
              <div className="bg-white/40 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4.5 flex flex-col gap-3">
                <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 font-mono tracking-wider uppercase">
                  Pending Invitations ({invitations.length})
                </h3>

                {invitations.length === 0 ? (
                  <div className="text-[10px] text-zinc-500 font-mono border border-dashed border-zinc-200 dark:border-zinc-850 p-4 rounded-lg text-center bg-zinc-50/50 dark:bg-zinc-950/20">
                    NO PENDING INVITATIONS
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                    {invitations.map((inv) => (
                      <div 
                        key={inv.id}
                        className="p-3 bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-850 rounded-lg flex items-center justify-between text-xs gap-3"
                      >
                        <div className="overflow-hidden">
                          <span className="block font-semibold text-zinc-700 dark:text-zinc-300 truncate">{inv.email}</span>
                          <span className="text-[9px] font-mono text-zinc-500 block">Role: <span className="text-indigo-400 capitalize">{inv.role}</span></span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCancelInvitation(inv.id)}
                          className="hover:text-red-500 p-1 border border-zinc-200 dark:border-zinc-850 text-zinc-400"
                          title="Cancel Invitation"
                        >
                          <MailX className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Project Activity Log */}
            <div className="bg-white/40 dark:bg-zinc-900/10 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4.5 flex flex-col gap-3">
              <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 font-mono tracking-wider uppercase">
                Activity Logs
              </h3>

              {activityLogs.length === 0 ? (
                <div className="text-[10px] text-zinc-500 font-mono border border-dashed border-zinc-200 dark:border-zinc-850 p-4 rounded-lg text-center bg-zinc-50/50 dark:bg-zinc-950/20">
                  NO RECENT ACTIVITY
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
                  {activityLogs.map((log) => (
                    <div 
                      key={log.id} 
                      className="border-l-2 border-indigo-500/40 pl-2 text-[10px] flex flex-col gap-0.5 leading-relaxed"
                    >
                      <span className="text-zinc-650 dark:text-zinc-300">{log.details}</span>
                      <span className="text-[8px] text-zinc-400 font-mono">
                        {log.userName || "System"} • {new Date(log.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Invite member modal */}
      <InviteModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        projectId={projectId}
        onInviteSuccess={fetchData}
      />
    </div>
  );
};
