"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Pencil, Plus, Share2, Trash2, X } from "lucide-react";
import { WORKSPACE } from "@/lib/content";
import { Sparkles } from "lucide-react";
import WorkspaceMembersModal from "@/components/WorkspaceMembersModal";

export type WorkspaceEntry = { id: string; name: string; role: string };

type Props = {
  workspaces: WorkspaceEntry[];
  activeWorkspaceId: string;
  onSwitch: (id: string) => void;
  onCreate: (name: string) => Promise<void>;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  initialOpen?: boolean;
  highlightId?: string;
};

type Mode = "idle" | "creating" | "renaming";

export default function WorkspaceSwitcher({
  workspaces, activeWorkspaceId, onSwitch, onCreate, onRename, onDelete,
  initialOpen, highlightId,
}: Props) {
  const [open, setOpen] = useState(initialOpen ?? false);
  const [mode, setMode] = useState<Mode>("idle");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const active = workspaces.find((w) => w.id === activeWorkspaceId);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Focus input when mode changes
  useEffect(() => {
    if (mode !== "idle") inputRef.current?.focus();
  }, [mode]);

  function resetMode() {
    setMode("idle");
    setRenamingId(null);
    setInputValue("");
    setError(null);
  }

  function startCreating() {
    setMode("creating");
    setInputValue("");
    setError(null);
  }

  function startRenaming(id: string, currentName: string) {
    setMode("renaming");
    setRenamingId(id);
    setInputValue(currentName);
    setError(null);
  }

  async function handleSubmit() {
    const val = inputValue.trim();
    if (!val) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === "creating") {
        await onCreate(val);
        resetMode();
        setOpen(false);
      } else if (mode === "renaming" && renamingId) {
        await onRename(renamingId, val);
        resetMode();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    const confirmed = window.confirm(
      WORKSPACE.deleteConfirm.replace("{name}", name)
    );
    if (!confirmed) return;
    setBusy(true);
    setError(null);
    try {
      await onDelete(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") resetMode();
  }

  return (
    <>
    <div ref={containerRef} style={{ position: "relative" }}>
      {/* Trigger */}
      <button
        onClick={() => { setOpen((o) => !o); resetMode(); }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors"
        style={{
          background: open ? "var(--surface-2)" : "transparent",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
          cursor: "pointer",
          maxWidth: 180,
        }}
      >
        <span
          style={{
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            flex: 1, textAlign: "left",
          }}
        >
          {active?.name ?? "—"}
        </span>
        <ChevronDown size={12} style={{ flexShrink: 0, opacity: 0.6 }} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 200,
            minWidth: 220,
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            padding: "6px 0",
          }}
        >
          {/* Workspace list */}
          {workspaces.map((ws) => (
            <div key={ws.id}>
              {mode === "renaming" && renamingId === ws.id ? (
                /* Inline rename form */
                <div className="flex items-center gap-1 px-3 py-1.5">
                  <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={WORKSPACE.createPlaceholder}
                    disabled={busy}
                    style={{
                      flex: 1, fontSize: 13, padding: "3px 6px",
                      background: "var(--surface-2)", border: "1px solid var(--border)",
                      borderRadius: 5, color: "var(--text-primary)", outline: "none",
                    }}
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={busy || !inputValue.trim()}
                    style={{
                      fontSize: 11, padding: "3px 7px", borderRadius: 5,
                      background: "var(--accent)", color: "#fff", border: "none",
                      cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1,
                    }}
                  >
                    {WORKSPACE.saveButton}
                  </button>
                  <button
                    onClick={resetMode}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", lineHeight: 0 }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                /* Normal workspace row */
                <div
                  className="flex items-center gap-2 px-3 py-2 group"
                  style={{ cursor: "default" }}
                >
                  <button
                    onClick={() => { if (ws.id !== activeWorkspaceId) { onSwitch(ws.id); setOpen(false); } }}
                    style={{
                      flex: 1, background: "none", border: "none", textAlign: "left",
                      fontSize: 13, color: "var(--text-primary)", cursor: ws.id === activeWorkspaceId ? "default" : "pointer",
                      padding: 0, display: "flex", alignItems: "center", gap: 6,
                      overflow: "hidden",
                    }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ws.name}
                    </span>
                    {ws.id === highlightId && (
                      <span style={{
                        flexShrink: 0, fontSize: 9, fontWeight: 700, letterSpacing: "0.03em",
                        padding: "1px 5px", borderRadius: 4,
                        background: "var(--accent-dim)", color: "var(--accent)",
                        display: "flex", alignItems: "center", gap: 3,
                      }}>
                        <Sparkles size={8} />
                        {WORKSPACE.newBadge}
                      </span>
                    )}
                  </button>

                  <span style={{ display: "flex", gap: 2, alignItems: "center" }}>
                    {ws.id === activeWorkspaceId && (
                      <Check size={13} style={{ color: "var(--accent)", flexShrink: 0 }} />
                    )}
                    {ws.role === "owner" && (
                      <>
                        <button
                          onClick={() => startRenaming(ws.id, ws.name)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", lineHeight: 0, padding: 2 }}
                          title="Rename"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDelete(ws.id, ws.name)}
                          disabled={busy || workspaces.length <= 1}
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{
                            background: "none", border: "none", cursor: workspaces.length <= 1 ? "not-allowed" : "pointer",
                            color: "var(--text-muted)", lineHeight: 0, padding: 2, opacity: workspaces.length <= 1 ? 0.3 : undefined,
                          }}
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>
          ))}

          {/* Divider */}
          <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />

          {/* Share — owner of the active workspace only */}
          {active?.role === "owner" && (
            <button
              onClick={() => { setShowMembers(true); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors"
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", textAlign: "left" }}
            >
              <Share2 size={13} />
              {WORKSPACE.shareTitle}
            </button>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />

          {/* Create new workspace */}
          {mode === "creating" ? (
            <div className="flex items-center gap-1 px-3 py-1.5">
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={WORKSPACE.createPlaceholder}
                disabled={busy}
                style={{
                  flex: 1, fontSize: 13, padding: "3px 6px",
                  background: "var(--surface-2)", border: "1px solid var(--border)",
                  borderRadius: 5, color: "var(--text-primary)", outline: "none",
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={busy || !inputValue.trim()}
                style={{
                  fontSize: 11, padding: "3px 7px", borderRadius: 5,
                  background: "var(--accent)", color: "#fff", border: "none",
                  cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1,
                }}
              >
                {WORKSPACE.createButton}
              </button>
              <button
                onClick={resetMode}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", lineHeight: 0 }}
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={startCreating}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors"
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-muted)", textAlign: "left",
              }}
            >
              <Plus size={13} />
              {WORKSPACE.newWorkspace}
            </button>
          )}

          {/* Error */}
          {error && (
            <p style={{ fontSize: 11, color: "#ef4444", padding: "4px 12px 2px" }}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>

    {showMembers && active && (
      <WorkspaceMembersModal
        workspaceId={active.id}
        isOwner={active.role === "owner"}
        onClose={() => setShowMembers(false)}
      />
    )}
    </>
  );
}
