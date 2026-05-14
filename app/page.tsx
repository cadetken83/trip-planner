"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import PlannerView from "@/components/PlannerView";
import FilterBar from "@/components/FilterBar";
import HistoryPanel from "@/components/HistoryPanel";
import TripsListPanel from "@/components/TripsListPanel";
import BudgetPanel from "@/components/BudgetPanel";
import PastTripPrompt from "@/components/PastTripPrompt";
import OnboardingModal from "@/components/OnboardingModal";
import MigrationModal from "@/components/MigrationModal";
import WorkspaceSwitcher, { type WorkspaceEntry } from "@/components/WorkspaceSwitcher";
import { useTripStore } from "@/store/useTripStore";
import { CalendarDays, Clock, Download, List, Moon, Settings, Sun, Upload, WifiOff } from "lucide-react";
import WanderlistIcon from "@/components/WanderlistIcon";
import { NAV } from "@/lib/content";

type View = "planner" | "trips" | "history" | "budget";

type LocalSnapshot = {
  trips: unknown[];
  tripOrder: string[];
  groups: unknown[];
  categories: unknown[];
  budget?: unknown;
  blackoutDates?: unknown[];
} | null;

export default function Home() {
  const { isLoaded: authLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [view, setView] = useState<View>("planner");
  const [sessionTheme, setSessionTheme] = useState<"light" | "dark" | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [storeReady, setStoreReady] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Workspace state
  const [workspaces, setWorkspaces] = useState<WorkspaceEntry[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  // Captured once on mount so it survives the URL clear
  const [joinedWorkspaceId] = useState(() => searchParams.get("joined"));

  // Migration state
  const [migrationData, setMigrationData] = useState<LocalSnapshot>(null);
  const [showMigration, setShowMigration] = useState(false);

  const {
    theme, toggleTheme, defaultView, setDefaultView,
    trips, tripOrder, groups, categories, budget, blackoutDates,
    importData, hasSeenOnboarding, init, cleanup,
    currentWorkspaceId: persistedWorkspaceId,
  } = useTripStore();

  const importRef = useRef<HTMLInputElement>(null);

  // ── Workspace actions ────────────────────────────────────────────────────────
  async function refreshWorkspaces(): Promise<WorkspaceEntry[]> {
    const res = await fetch("/api/workspaces");
    if (!res.ok) return workspaces;
    const { workspaces: list } = await res.json() as { workspaces: WorkspaceEntry[] };
    setWorkspaces(list);
    return list;
  }

  async function handleSwitchWorkspace(id: string) {
    if (id === workspaceId) return;
    setStoreReady(false);
    cleanup();
    setWorkspaceId(id);
    await init(id, user!.id);
    setStoreReady(true);
    setView(defaultView);
  }

  async function handleCreateWorkspace(name: string) {
    const res = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error(await res.text());
    const { workspaceId: newId } = await res.json() as { workspaceId: string };
    await refreshWorkspaces();
    await handleSwitchWorkspace(newId);
  }

  async function handleRenameWorkspace(id: string, name: string) {
    const res = await fetch(`/api/workspace/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error(await res.text());
    setWorkspaces((prev) => prev.map((w) => w.id === id ? { ...w, name } : w));
  }

  async function handleDeleteWorkspace(id: string) {
    const res = await fetch(`/api/workspace/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await res.text());
    const remaining = workspaces.filter((w) => w.id !== id);
    setWorkspaces(remaining);
    if (id === workspaceId && remaining.length > 0) {
      await handleSwitchWorkspace(remaining[0].id);
    }
  }

  // ── Workspace init ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoaded || !isSignedIn || !user) return;

    async function bootstrap() {
      // 1. List all workspaces the user belongs to
      let listRes = await fetch("/api/workspaces");
      if (!listRes.ok) { console.error("Could not list workspaces"); return; }
      let { workspaces: wsList } = await listRes.json() as { workspaces: WorkspaceEntry[] };

      // 2. No workspaces yet — create personal workspace for new users
      if (!wsList.length) {
        const personalRes = await fetch("/api/workspace/personal");
        if (!personalRes.ok) { console.error("Could not create personal workspace"); return; }
        listRes = await fetch("/api/workspaces");
        if (!listRes.ok) { console.error("Could not list workspaces after creation"); return; }
        ({ workspaces: wsList } = await listRes.json() as { workspaces: WorkspaceEntry[] });
      }

      setWorkspaces(wsList);

      // 3. Pick workspace: last-used (persisted) if still valid, else first
      const target = wsList.find((w) => w.id === persistedWorkspaceId) ?? wsList[0];
      setWorkspaceId(target.id);

      // 4. Init the store — fetches all data from Supabase
      await init(target.id, user!.id);
      setStoreReady(true);

      // 5. Restore last-used view from persisted UI state (localStorage)
      setView(defaultView);

      // 4. Check for legacy localStorage data to migrate
      try {
        const raw = localStorage.getItem("trip-planner-storage");
        if (raw) {
          const parsed = JSON.parse(raw);
          const state = parsed?.state;
          if (Array.isArray(state?.trips) && state.trips.length > 0) {
            setMigrationData({
              trips: state.trips,
              tripOrder: state.tripOrder ?? [],
              groups: state.groups ?? [],
              categories: state.categories ?? [],
              budget: state.budget,
              blackoutDates: state.blackoutDates ?? [],
            });
            setShowMigration(true);
          }
        }
      } catch { /* ignore malformed localStorage */ }
    }

    bootstrap();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoaded, isSignedIn, user?.id]);

  // ── Online / offline detection ───────────────────────────────────────────────
  useEffect(() => {
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // ── Clear ?joined= param from URL once captured ──────────────────────────────
  useEffect(() => {
    if (joinedWorkspaceId) router.replace("/");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Theme ────────────────────────────────────────────────────────────────────
  const effectiveTheme = sessionTheme ?? theme;
  const isLight = effectiveTheme === "light";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", effectiveTheme);
  }, [effectiveTheme]);

  // ── Export / Import ──────────────────────────────────────────────────────────
  const handleExport = () => {
    const payload = JSON.stringify(
      { version: 1, exportedAt: new Date().toISOString(), trips, tripOrder, groups, categories, budget, blackoutDates },
      null, 2
    );
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `wanderlist-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!importRef.current) return;
    importRef.current.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(data.trips) || !Array.isArray(data.tripOrder))
          throw new Error("Invalid file");
        if (!window.confirm(`Replace all current trips with data from "${file.name}"? This cannot be undone.`))
          return;
        importData(data);
      } catch {
        alert("Could not read file — make sure it's a Wanderlist export.");
      }
    };
    reader.readAsText(file);
  };

  // ── Loading state while Clerk initializes ────────────────────────────────────
  if (!authLoaded) return null;

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--surface-0)" }}>

      {/* ── Offline banner ── */}
      {!isOnline && (
        <div
          className="flex items-center justify-center gap-2 py-2 text-sm shrink-0"
          style={{ background: "#b45309", color: "#fff" }}
        >
          <WifiOff size={14} />
          You're offline — changes won't sync until reconnected.
        </div>
      )}

      {/* ── Top Nav ── */}
      <header
        style={{ background: "var(--surface-1)", borderBottom: "1px solid var(--border)" }}
        className="flex items-center justify-between px-6 py-3 shrink-0"
      >
        <button
          onClick={() => setView(defaultView)}
          className="flex items-center gap-3"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <span style={{ color: "var(--accent)", lineHeight: 0 }}>
            <WanderlistIcon size={22} />
          </span>
          <span className="font-display text-2xl tracking-tight" style={{ color: "var(--accent)" }}>
            {NAV.appTitle}
          </span>
          <span style={{ color: "var(--text-muted)" }} className="text-sm hidden sm:block">
            {NAV.appTagline}
          </span>
        </button>

        {/* Workspace switcher — only shown once store is ready */}
        {storeReady && workspaceId && workspaces.length > 0 && (
          <WorkspaceSwitcher
            workspaces={workspaces}
            activeWorkspaceId={workspaceId}
            onSwitch={handleSwitchWorkspace}
            onCreate={handleCreateWorkspace}
            onRename={handleRenameWorkspace}
            onDelete={handleDeleteWorkspace}
            initialOpen={!!joinedWorkspaceId}
            highlightId={joinedWorkspaceId ?? undefined}
          />
        )}

        <nav className="flex items-center gap-1">
          <button
            onClick={() => setView("planner")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors"
            style={{
              background: view === "planner" ? "var(--accent-dim)" : "transparent",
              color: view === "planner" ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            <CalendarDays size={14} />
            {NAV.timeline}
          </button>
          <button
            onClick={() => setView("trips")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors"
            style={{
              background: view === "trips" ? "var(--accent-dim)" : "transparent",
              color: view === "trips" ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            <List size={14} />
            {NAV.trips}
          </button>
          <button
            onClick={() => setView("history")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors"
            style={{
              background: view === "history" ? "var(--accent-dim)" : "transparent",
              color: view === "history" ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            <Clock size={14} />
            {NAV.history}
          </button>
          <button
            onClick={() => setView("budget")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors"
            style={{
              background: view === "budget" ? "var(--accent-dim)" : "transparent",
              color: view === "budget" ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            <Settings size={14} />
            {NAV.settings}
          </button>

          <div className="w-px h-4 mx-2" style={{ background: "var(--border)" }} />

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm transition-colors"
            style={{ color: "var(--text-muted)" }}
            title="Export trips to JSON"
          >
            <Download size={14} />
          </button>

          <button
            onClick={() => importRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm transition-colors"
            style={{ color: "var(--text-muted)" }}
            title="Import trips from JSON"
          >
            <Upload size={14} />
          </button>

          <input
            ref={importRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportFile}
          />

          <div className="w-px h-4 mx-2" style={{ background: "var(--border)" }} />

          <button
            onClick={() => setSessionTheme(effectiveTheme === "light" ? "dark" : "light")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors"
            style={{ color: isLight ? "var(--text-muted)" : "#fbbf24" }}
            title={isLight ? "Switch to dark mode (session only)" : "Switch to light mode (session only)"}
          >
            {isLight ? <Moon size={14} /> : <Sun size={14} />}
          </button>

          <div className="w-px h-4 mx-2" style={{ background: "var(--border)" }} />

          <button
            onClick={() => setShowOnboarding(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm transition-colors"
            style={{ color: "var(--text-muted)" }}
            title="Open help tour"
          >
            <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1 }}>?</span>
          </button>

          <div className="w-px h-4 mx-2" style={{ background: "var(--border)" }} />

          {/* Clerk user button — avatar, sign-out, account management */}
          <UserButton />
        </nav>
      </header>

      <FilterBar />

      {view === "planner" ? <PlannerView />
       : view === "trips"   ? <TripsListPanel />
       : view === "budget"  ? <BudgetPanel />
       : <HistoryPanel />}

      <PastTripPrompt />

      <OnboardingModal
        isOpen={storeReady && (showOnboarding || !hasSeenOnboarding)}
        onClose={() => setShowOnboarding(false)}
      />

      {/* Migration modal — shown once on first sign-in if localStorage data exists */}
      {showMigration && workspaceId && migrationData && (
        <MigrationModal
          workspaceId={workspaceId}
          localData={migrationData as Parameters<typeof MigrationModal>[0]["localData"]}
          onDone={(migrated) => {
              setShowMigration(false);
              if (migrated && workspaceId && user?.id) init(workspaceId, user.id);
            }}
        />
      )}
    </div>
  );
}
