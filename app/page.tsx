"use client";

import { useEffect, useRef, useState } from "react";
import PlannerView from "@/components/PlannerView";
import FilterBar from "@/components/FilterBar";
import HistoryPanel from "@/components/HistoryPanel";
import TripsListPanel from "@/components/TripsListPanel";
import BudgetPanel from "@/components/BudgetPanel";
import PastTripPrompt from "@/components/PastTripPrompt";
import { useTripStore } from "@/store/useTripStore";
import { CalendarDays, Clock, Download, List, Moon, Settings, Sun, Upload } from "lucide-react";
import WanderlistIcon from "@/components/WanderlistIcon";

type View = "planner" | "trips" | "history" | "budget";

export default function Home() {
  const [view, setView] = useState<View>(() => {
    if (typeof window === "undefined") return "planner";
    try {
      const s = JSON.parse(localStorage.getItem("trip-planner-storage") || "{}");
      return s?.state?.defaultView ?? "planner";
    } catch { return "planner"; }
  });
  const [sessionTheme, setSessionTheme] = useState<"light" | "dark" | null>(null);
  const { theme, toggleTheme, defaultView, setDefaultView, trips, tripOrder, groups, categories, budget, blackoutDates, importData } = useTripStore();
  const importRef = useRef<HTMLInputElement>(null);

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

  const effectiveTheme = sessionTheme ?? theme;
  const isLight = effectiveTheme === "light";

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", effectiveTheme);
  }, [effectiveTheme]);

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--surface-0)" }}>
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
            Wanderlist
          </span>
          <span style={{ color: "var(--text-muted)" }} className="text-sm hidden sm:block">
            Plan Your Wanderlust!
          </span>
        </button>

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
            Trips
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
          <button
            onClick={() => setView("budget")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors"
            style={{
              background: view === "budget" ? "var(--accent-dim)" : "transparent",
              color: view === "budget" ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            <Settings size={14} />
            Settings
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
        </nav>
      </header>

      <FilterBar />

      {view === "planner" ? <PlannerView />
       : view === "trips"   ? <TripsListPanel />
       : view === "budget"  ? <BudgetPanel />
       : <HistoryPanel />}

      <PastTripPrompt />
    </div>
  );
}
