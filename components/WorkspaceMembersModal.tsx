"use client";

import { useEffect, useState } from "react";
import { Check, Copy, RefreshCw, Trash2, X } from "lucide-react";
import { WORKSPACE } from "@/lib/content";

type Member = {
  userId: string;
  role: string;
  name: string;
  email: string;
  imageUrl: string;
  joinedAt: string;
};

type Props = {
  workspaceId: string;
  isOwner: boolean;
  onClose: () => void;
};

export default function WorkspaceMembersModal({ workspaceId, isOwner, onClose }: Props) {
  const [inviteUrl, setInviteUrl] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [invRes, memRes] = await Promise.all([
          isOwner ? fetch(`/api/workspace/${workspaceId}/invite`) : Promise.resolve(null),
          fetch(`/api/workspace/${workspaceId}/members`),
        ]);
        if (invRes?.ok) {
          const { inviteUrl: url } = await invRes.json() as { inviteUrl: string };
          setInviteUrl(url);
        }
        if (memRes.ok) {
          const { members: list } = await memRes.json() as { members: Member[] };
          setMembers(list);
        }
      } catch {
        setError("Could not load sharing info.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [workspaceId, isOwner]);

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRotate() {
    if (!window.confirm("Reset the invite link? The old link will stop working.")) return;
    setRotating(true);
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/invite`, { method: "POST" });
      if (res.ok) {
        const { inviteUrl: url } = await res.json() as { inviteUrl: string };
        setInviteUrl(url);
      }
    } finally {
      setRotating(false);
    }
  }

  async function handleRoleChange(targetUserId: string, role: string) {
    const res = await fetch(`/api/workspace/${workspaceId}/members/${targetUserId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      setMembers((prev) => prev.map((m) => m.userId === targetUserId ? { ...m, role } : m));
    }
  }

  async function handleRemove(targetUserId: string, name: string) {
    if (!window.confirm(`Remove ${name} from this workspace?`)) return;
    const res = await fetch(`/api/workspace/${workspaceId}/members/${targetUserId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.userId !== targetUserId));
    }
  }

  const roleLabel = (role: string) =>
    WORKSPACE.roleLabels[role as keyof typeof WORKSPACE.roleLabels] ?? role;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="rounded-xl w-full max-w-md shadow-2xl flex flex-col"
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderTop: "3px solid var(--accent)",
          maxHeight: "85vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}
        >
          <h2 className="font-display text-lg" style={{ color: "var(--text-primary)" }}>
            {WORKSPACE.shareTitle}
          </h2>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-5 overflow-y-auto flex-1">
          {loading && (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
          )}
          {error && (
            <p className="text-sm" style={{ color: "#ef4444" }}>{error}</p>
          )}

          {/* Invite link section — owner only */}
          {isOwner && !loading && inviteUrl && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                {WORKSPACE.inviteSection}
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={inviteUrl}
                  className="flex-1 text-xs rounded-md px-3 py-2 outline-none truncate"
                  style={{
                    background: "var(--surface-3)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                  }}
                />
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-md shrink-0"
                  style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent)" }}
                  title={WORKSPACE.copyLink}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Copied!" : WORKSPACE.copyLink}
                </button>
              </div>
              <button
                onClick={handleRotate}
                disabled={rotating}
                className="flex items-center gap-1.5 text-xs self-start"
                style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: rotating ? "not-allowed" : "pointer" }}
              >
                <RefreshCw size={11} style={{ opacity: rotating ? 0.4 : 1 }} />
                {WORKSPACE.resetLink}
              </button>
            </div>
          )}

          {/* Members list */}
          {!loading && members.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                {WORKSPACE.membersSection}
              </p>
              {members.map((m) => (
                <div
                  key={m.userId}
                  className="flex items-center gap-3 py-2 px-3 rounded-lg"
                  style={{ background: "var(--surface-3)" }}
                >
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold"
                    style={{
                      background: m.imageUrl ? undefined : "var(--accent-dim)",
                      color: "var(--accent)",
                      backgroundImage: m.imageUrl ? `url(${m.imageUrl})` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    {!m.imageUrl && (m.name[0] ?? "?").toUpperCase()}
                  </div>

                  {/* Name + email */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ color: "var(--text-primary)" }}>{m.name}</p>
                    {m.email && (
                      <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{m.email}</p>
                    )}
                  </div>

                  {/* Role — dropdown for owner (editing others), badge for self or non-owner view */}
                  {isOwner && m.role !== "owner" ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                      className="text-xs rounded-md px-2 py-1 outline-none"
                      style={{
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        color: "var(--text-secondary)",
                        cursor: "pointer",
                      }}
                    >
                      <option value="editor">{roleLabel("editor")}</option>
                      <option value="viewer">{roleLabel("viewer")}</option>
                    </select>
                  ) : (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: "var(--surface-1)", color: "var(--text-muted)" }}
                    >
                      {roleLabel(m.role)}
                    </span>
                  )}

                  {/* Remove button — owner only, not for self */}
                  {isOwner && m.role !== "owner" && (
                    <button
                      onClick={() => handleRemove(m.userId, m.name)}
                      className="shrink-0"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", lineHeight: 0 }}
                      title={WORKSPACE.removeMember}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
