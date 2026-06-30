/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import { useToast, Button, Input, TextArea, Modal } from "./UI";
import { Mail, Shield } from "lucide-react";

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onInviteSuccess?: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  projectId,
  onInviteSuccess
}) => {
  const { apiFetch } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "editor" | "viewer">("viewer");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast("Email is required", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/projects/${projectId}/invitations`, {
        method: "POST",
        body: JSON.stringify({ email, role, message })
      });

      const data = await res.json();
      if (res.ok) {
        toast("Invitation sent successfully!", "success");
        setEmail("");
        setMessage("");
        setRole("viewer");
        if (onInviteSuccess) onInviteSuccess();
        onClose();
      } else {
        toast(data.error || "Failed to send invitation.", "error");
      }
    } catch (err) {
      console.error(err);
      toast("An error occurred. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite Project Partner">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-xs text-zinc-550 dark:text-zinc-400">
          Invite users to collaborate on this project. They must have a registered account in DevVault to receive notifications.
        </p>

        <Input
          label="RECIPIENT EMAIL *"
          type="email"
          placeholder="developer@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={<Mail className="h-4 w-4 text-zinc-400" />}
          required
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-indigo-400" /> CHOOSE ROLE
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            className="w-full bg-white dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-800 dark:text-zinc-100 p-2.5 outline-none focus:border-indigo-500/50 backdrop-blur-md"
          >
            <option value="viewer">Viewer (Read-Only access)</option>
            <option value="editor">Editor (Write files, notes, deployments)</option>
            <option value="admin">Admin (Full write & invite editors/viewers)</option>
          </select>
        </div>

        <TextArea
          label="INVITATION MESSAGE (OPTIONAL)"
          placeholder="E.g., Hey! Join me in building this new API backend..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
        />

        <div className="flex justify-end gap-3 mt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={submitting}>
            Send Invitation
          </Button>
        </div>
      </form>
    </Modal>
  );
};
