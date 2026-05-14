"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import WanderlistIcon from "@/components/WanderlistIcon";
import { WORKSPACE } from "@/lib/content";

type WorkspaceInfo = { workspaceId: string; name: string; alreadyMember: boolean };

export default function JoinPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  const [info, setInfo] = useState<WorkspaceInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace(`/sign-in?redirect_url=/join/${code}`);
      return;
    }
    fetch(`/api/workspace/invite/${code}`)
      .then(async (res) => {
        if (!res.ok) { setError("This invite link is invalid or has expired."); return; }
        const data = await res.json() as WorkspaceInfo;
        if (data.alreadyMember) { router.replace("/"); return; }
        setInfo(data);
      })
      .catch(() => setError("Something went wrong. Please try again."));
  }, [isLoaded, isSignedIn, code, router]);

  async function handleJoin() {
    if (!info) return;
    setJoining(true);
    try {
      const res = await fetch(`/api/workspace/invite/${code}`, { method: "POST" });
      if (res.ok) {
        const { workspaceId } = await res.json() as { workspaceId: string };
        router.replace(`/?joined=${workspaceId}`);
      } else {
        const { error: msg } = await res.json() as { error: string };
        setError(msg ?? "Could not join workspace.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setJoining(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "var(--surface-0)" }}
    >
      <div
        className="rounded-xl w-full max-w-sm p-8 flex flex-col items-center gap-6 shadow-2xl"
        style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}
      >
        <span style={{ color: "var(--accent)" }}>
          <WanderlistIcon size={36} />
        </span>

        {!isLoaded && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Loading…</p>
        )}

        {error && (
          <>
            <p className="text-base font-medium text-center" style={{ color: "var(--text-primary)" }}>
              {error}
            </p>
            <button
              onClick={() => router.replace("/")}
              className="text-sm px-4 py-2 rounded-lg"
              style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
            >
              Go home
            </button>
          </>
        )}

        {info && !error && (
          <>
            <div className="text-center">
              <h1 className="font-display text-xl" style={{ color: "var(--text-primary)" }}>
                {WORKSPACE.joinTitle}
              </h1>
              <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
                {WORKSPACE.joinBody}
              </p>
              <p
                className="text-lg font-semibold mt-3"
                style={{ color: "var(--accent)" }}
              >
                {info.name}
              </p>
            </div>

            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
              style={{
                background: "var(--btn-primary)",
                color: "var(--btn-primary-text)",
                opacity: joining ? 0.6 : 1,
                cursor: joining ? "not-allowed" : "pointer",
              }}
            >
              {joining ? "Joining…" : WORKSPACE.joinButton}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
