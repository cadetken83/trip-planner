"use client";

import { useState, useRef } from "react";
import { useTripStore, selectScheduledTrips, blackoutTouchesMonth } from "@/store/useTripStore";
import { Trip, Group, BlackoutDate } from "@/types";
import MonthCell, { LaneEntry } from "@/components/MonthCell";
import { ChevronDown, ChevronRight, ChevronLeft, CalendarDays, ChevronsUpDown, AlertTriangle } from "lucide-react";

const MONTH_NAMES = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getPosition(
  month: number, year: number,
  startMonth: number, startYear: number,
  endMonth: number, endYear: number
): "start" | "middle" | "end" | "single" {
  const isStart = month === startMonth && year === startYear;
  const isEnd   = month === endMonth   && year === endYear;
  if (isStart && isEnd) return "single";
  if (isStart) return "start";
  if (isEnd)   return "end";
  return "middle";
}

function tripTouchesMonth(trip: Trip, month: number, year: number): boolean {
  if (!trip.scheduled) return false;
  const { startMonth, startYear, endMonth, endYear } = trip.scheduled;
  const idx      = year * 12 + month;
  const startIdx = startYear * 12 + startMonth;
  const endIdx   = endYear  * 12 + endMonth;
  return idx >= startIdx && idx <= endIdx;
}

function buildLaneOrder(trips: Trip[], year: number): Trip[] {
  return trips
    .filter((t) => t.scheduled && t.scheduled.startYear <= year && t.scheduled.endYear >= year)
    .sort((a, b) => {
      const ai = a.scheduled!.startYear * 12 + a.scheduled!.startMonth;
      const bi = b.scheduled!.startYear * 12 + b.scheduled!.startMonth;
      return ai - bi;
    });
}

function buildCellLanes(laneOrder: Trip[], groups: Group[], month: number, year: number): LaneEntry[] {
  return laneOrder.map((trip) => {
    if (!tripTouchesMonth(trip, month, year)) return null;
    return {
      trip,
      group: groups.find((g) => g.id === trip.groupId),
      position: getPosition(
        month, year,
        trip.scheduled!.startMonth, trip.scheduled!.startYear,
        trip.scheduled!.endMonth,   trip.scheduled!.endYear
      ),
    };
  });
}

// ── Stats bar ─────────────────────────────────────────────────────────────────
function StatsBar({ trips }: { trips: Trip[] }) {
  if (trips.length === 0) return null;

  const yearMin = trips.reduce((min, t) => {
    const y = t.scheduled?.startYear;
    return typeof y === "number" && !isNaN(y) ? Math.min(min, y) : min;
  }, Infinity);
  const yearMax = trips.reduce((max, t) => {
    const y = t.scheduled?.endYear;
    return typeof y === "number" && !isNaN(y) ? Math.max(max, y) : max;
  }, -Infinity);
  const yearLabel = yearMin === Infinity ? null
    : yearMin === yearMax ? String(yearMin)
    : `${yearMin} — ${yearMax}`;

  const totalWeeks = trips.reduce((sum, t) => sum + (t.durationWeeks ?? 0), 0);
  const continentCount = new Set(trips.map((t) => t.continent).filter(Boolean)).size;

  const parts: Array<{ num?: number; label: string }> = [
    { num: trips.length, label: trips.length === 1 ? "trip" : "trips" },
    ...(yearLabel ? [{ label: yearLabel }] : []),
  ];
  if (continentCount > 0)
    parts.push({ num: continentCount, label: continentCount === 1 ? "continent" : "continents" });
  if (totalWeeks > 0)
    parts.push({ num: totalWeeks, label: totalWeeks === 1 ? "week" : "weeks" });

  return (
    <div
      className="inline-flex items-center rounded-full px-4 py-1.5"
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        gap: "10px",
      }}
    >
      {parts.flatMap((p, i) => {
        const stat = (
          <span key={`s${i}`} style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
            {p.num !== undefined && (
              <span style={{ fontWeight: 800, fontSize: "13px", color: "var(--accent)" }}>{p.num} </span>
            )}
            {p.label}
          </span>
        );
        if (i === 0) return [stat];
        return [
          <span key={`d${i}`} style={{ color: "var(--text-muted)", opacity: 0.4, fontSize: "12px" }}>·</span>,
          stat,
        ];
      })}
    </div>
  );
}

// ── Density strip ─────────────────────────────────────────────────────────────
function DensityStrip({ year, trips, groups, compact }: {
  year: number; trips: Trip[]; groups: Group[]; compact?: boolean;
}) {
  return (
    <div className={`flex gap-1 ${compact ? "mb-0" : "mb-2"} px-1`}>
      {Array.from({ length: 12 }, (_, m) => {
        const touching = trips.filter((t) => tripTouchesMonth(t, m, year));
        const color =
          touching.length === 0 ? "var(--surface-3)"
          : touching.length === 1
            ? (groups.find((g) => g.id === touching[0].groupId)?.color ?? "var(--accent)")
          : "#ef4444";
        return (
          <div key={m} className="flex-1 rounded-full transition-colors"
            style={{ background: color, height: compact ? "6px" : "4px" }}
            title={`${MONTH_NAMES[m]}: ${touching.length} trip${touching.length !== 1 ? "s" : ""}`}
          />
        );
      })}
    </div>
  );
}

// ── Year section ──────────────────────────────────────────────────────────────
function YearSection({ year, scheduledTrips, groups, currentMonth, currentYear, collapsed, onToggle, isOverBudget, blackoutDates }: {
  year: number;
  scheduledTrips: Trip[];
  groups: Group[];
  currentMonth: number;
  currentYear: number;
  collapsed: boolean;
  onToggle: () => void;
  isOverBudget: boolean;
  blackoutDates: BlackoutDate[];
}) {
  const isPast    = year < currentYear;
  const laneOrder = buildLaneOrder(scheduledTrips, year);
  const tripCount = laneOrder.length;

  return (
    <div className="mb-6">
      <button onClick={onToggle}
        className="flex items-center gap-2 w-full mb-2">
        {collapsed
          ? <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
          : <ChevronDown  size={14} style={{ color: "var(--text-muted)" }} />
        }
        <span className="font-display text-lg tracking-wide" style={{
          color: year === currentYear ? "var(--accent)"
               : isPast ? "var(--text-muted)"
               : "var(--text-primary)",
        }}>
          {year}
          {isPast && <span className="ml-2 text-xs font-sans" style={{ color: "var(--text-muted)" }}>history</span>}
        </span>
        {isOverBudget && (
          <span className="flex items-center gap-1 ml-1 text-xs font-medium" style={{ color: "#ef4444" }}>
            <AlertTriangle size={12} />
            over budget
          </span>
        )}
        {collapsed && (
          <span className="text-xs ml-1" style={{ color: "var(--text-muted)" }}>
            — {tripCount} trip{tripCount !== 1 ? "s" : ""}
          </span>
        )}
        <div className="flex-1 h-px ml-2" style={{ background: "var(--border-subtle)" }} />
      </button>

      <DensityStrip year={year} trips={scheduledTrips} groups={groups} compact={collapsed} />

      {!collapsed && (
        <div
          className="grid gap-2 mt-2"
          style={{
            gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
            opacity: isPast ? 0.75 : 1,
            // Make cells overflow-visible so bar bleed works across gaps
            isolation: "isolate",
          }}
        >
          {Array.from({ length: 12 }, (_, month) => {
            const blackoutLabels = blackoutDates
              .filter((b) => blackoutTouchesMonth(b, month + 1, year))
              .map((b) => b.label);
            return (
              <MonthCell
                key={month}
                month={month}
                year={year}
                lanes={buildCellLanes(laneOrder, groups, month, year)}
                isCurrentMonth={month === currentMonth && year === currentYear}
                blackoutLabels={blackoutLabels}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── CalendarPanel ─────────────────────────────────────────────────────────────
function yearBudgetStats(trips: Trip[], year: number) {
  const relevant = trips.filter((t) => t.scheduled?.startYear === year && t.estimatedCost);
  const spent = relevant.filter((t) => t.status === "completed")
    .reduce((s, t) => s + (t.estimatedCost ?? 0), 0);
  const committed = relevant.filter((t) => t.status === "planning" || t.status === "booked")
    .reduce((s, t) => s + (t.estimatedCost ?? 0), 0);
  return spent + committed;
}

export default function CalendarPanel() {
  const { trips, groups, filters, budget, blackoutDates } = useTripStore();
  const scheduledTrips = selectScheduledTrips(trips, filters);

  const now          = new Date();
  const currentMonth = now.getMonth();
  const currentYear  = now.getFullYear();

  const [windowStart,    setWindowStart]    = useState(currentYear);
  const [collapsedYears, setCollapsedYears] = useState<Set<number>>(new Set());
  const years    = Array.from({ length: 5 }, (_, i) => windowStart + i);
  const todayRef = useRef<HTMLDivElement>(null);

  const allCollapsed = years.every((y) => collapsedYears.has(y));

  const toggleYear = (year: number) =>
    setCollapsedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year); else next.add(year);
      return next;
    });

  const collapseAll = () => setCollapsedYears(new Set(years));
  const expandAll   = () => setCollapsedYears(new Set());

  const scrollToToday = () => {
    if (currentYear < windowStart || currentYear > windowStart + 4) setWindowStart(currentYear);
    setTimeout(() => todayRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const isAtDefault = windowStart === currentYear;

  return (
    <main className="flex-1 overflow-y-auto overflow-x-auto px-6 py-5" style={{ isolation: "isolate" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5" style={{ minWidth: "700px" }}>
        <div className="flex items-center gap-3">
          <h2 className="font-display text-xl" style={{ color: "var(--text-secondary)" }}>
            5-Year Outlook
          </h2>
          <span className="text-xs px-2 py-1 rounded-md"
            style={{ background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
            {windowStart} – {windowStart + 4}
          </span>
        </div>

        {scheduledTrips.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: "10px", color: "var(--text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" as const }}>
              Your Travel Summary
            </span>
            <StatsBar trips={scheduledTrips} />
          </div>
        )}

        <div className="flex items-center gap-1">
          <button onClick={() => setWindowStart((p) => p - 1)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-3)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <ChevronLeft size={13} />
            {windowStart - 1}
          </button>

          <button onClick={scrollToToday}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-colors"
            style={{
              color: isAtDefault ? "var(--text-secondary)" : "var(--accent)",
              border: `1px solid ${isAtDefault ? "var(--border)" : "var(--accent-dim)"}`,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-3)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <CalendarDays size={12} />
            Today
          </button>

          <button onClick={() => setWindowStart((p) => p + 1)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-3)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            {windowStart + 5}
            <ChevronRight size={13} />
          </button>

          <div className="w-px h-4 mx-1" style={{ background: "var(--border)" }} />

          <button onClick={() => allCollapsed ? expandAll() : collapseAll()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-colors"
            style={{ color: "var(--text-secondary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-3)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
            <ChevronsUpDown size={13} />
            {allCollapsed ? "Expand all" : "Collapse all"}
          </button>
        </div>
      </div>

      {/* Year sections */}
      <div style={{ minWidth: "700px" }}>
        {years.map((year) => {
          const total = yearBudgetStats(trips, year);
          const alloc = budget.annualAllocations[year] ?? 0;
          return (
            <div key={year} ref={year === currentYear ? todayRef : undefined}>
              <YearSection
                year={year}
                scheduledTrips={scheduledTrips}
                groups={groups}
                currentMonth={currentMonth}
                currentYear={currentYear}
                collapsed={collapsedYears.has(year)}
                onToggle={() => toggleYear(year)}
                isOverBudget={alloc > 0 && total > alloc}
                blackoutDates={blackoutDates}
              />
            </div>
          );
        })}
      </div>
    </main>
  );
}
