"use client";

import { useEffect, useState } from "react";
import PlannerView from "@/components/PlannerView";
import FilterBar from "@/components/FilterBar";
import HistoryPanel from "@/components/HistoryPanel";
import TripsListPanel from "@/components/TripsListPanel";
import PastTripPrompt from "@/components/PastTripPrompt";
import { useTripStore } from "@/store/useTripStore";
import { CalendarDays, Clock, List, Sun, Moon } from "lucide-react";

type View = "planner" | "trips" | "history";

export default function Home() {
  const [view, setView] = useState<View>("planner");
  const { theme, toggleTheme } = useTripStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const isLight = theme === "light";

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--surface-0)" }}>
      {/* ── Top Nav ── */}
      <header
        style={{ background: "var(--surface-1)", borderBottom: "1px solid var(--border)" }}
        className="flex items-center justify-between px-6 py-3 shrink-0"
      >
        <div className="flex items-center gap-3">
          <span className="font-display text-2xl tracking-tight" style={{ color: "var(--accent)" }}>
            Wanderlist
          </span>
          <span style={{ color: "var(--text-muted)" }} className="text-sm hidden sm:block">
            Plan Your Wanderlust!
          </span>
        </div>

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
            Timeline
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
            All Trips
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
            History
          </button>

          <div className="w-px h-4 mx-2" style={{ background: "var(--border)" }} />

          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors"
            style={{ color: "var(--text-muted)" }}
            title={isLight ? "Switch to dark mode" : "Switch to light mode"}
          >
            {isLight ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        </nav>
      </header>

      <FilterBar />

      {view === "planner" ? <PlannerView />
       : view === "trips"   ? <TripsListPanel />
       : <HistoryPanel />}

      <PastTripPrompt />
    </div>
  );
}
