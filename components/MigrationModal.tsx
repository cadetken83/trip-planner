"use client";

import { useState } from "react";
import { MIGRATION } from "@/lib/content";

type Phase = "prompt" | "importing" | "success" | "error";

type Props = {
  workspaceId: string;
  localData: {
    trips: unknown[];
    tripOrder: string[];
    groups: unknown[];
    categories: unknown[];
    budget?: unknown;
    blackoutDates?: unknown[];
  };
  onDone: (migrated: boolean) => void;
};

export default function MigrationModal({ workspaceId, localData, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>("prompt");

  const handleImport = async () => {
    setPhase("importing");
    try {
      const res = await fetch("/api/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, ...localData }),
      });
      if (!res.ok) throw new Error(await res.text());
      // Clear the old localStorage key so this modal won't re-appear
      localStorage.removeItem("trip-planner-storage");
      setPhase("success");
    } catch (err) {
      console.error("Migration failed:", err);
      setPhase("error");
    }
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "32px 36px",
          maxWidth: 460,
          width: "100%",
          boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
        }}
      >
        {phase === "prompt" && (
          <>
            <h2 className="font-display text-xl mb-3" style={{ color: "var(--text-primary)" }}>
              {MIGRATION.title}
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
              {MIGRATION.body}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => onDone(false)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ color: "var(--text-muted)", background: "var(--surface-2)" }}
              >
                {MIGRATION.skipButton}
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                {MIGRATION.importButton}
              </button>
            </div>
          </>
        )}

        {phase === "importing" && (
          <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
            {MIGRATION.importing}
          </p>
        )}

        {phase === "success" && (
          <>
            <h2 className="font-display text-xl mb-3" style={{ color: "var(--text-primary)" }}>
              {MIGRATION.successTitle}
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
              {MIGRATION.successBody}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => onDone(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                {MIGRATION.doneButton}
              </button>
            </div>
          </>
        )}

        {phase === "error" && (
          <>
            <h2 className="font-display text-xl mb-3" style={{ color: "var(--text-primary)" }}>
              {MIGRATION.errorTitle}
            </h2>
            <p className="text-sm mb-6" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>
              {MIGRATION.errorBody}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => onDone(false)}
                className="px-4 py-2 rounded-lg text-sm"
                style={{ color: "var(--text-muted)", background: "var(--surface-2)" }}
              >
                {MIGRATION.doneButton}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
