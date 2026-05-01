"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useTripStore } from "@/store/useTripStore";
import TripEditModal from "@/components/TripEditModal";
import { Trip } from "@/types";

const MONTH_NAMES = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

export default function HistoryPanel() {
  const { trips, groups, categories, filters, budget } = useTripStore();
  const currency = budget.currency;
  const [sortAsc, setSortAsc] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);

  const completed = trips
    .filter((t) => {
      if (t.status !== "completed") return false;
      if (filters.groupIds.length && !filters.groupIds.includes(t.groupId)) return false;
      if (filters.continents.length && (!t.continent || !filters.continents.includes(t.continent))) return false;
      return true;
    })
    .sort((a, b) => {
      if (!a.scheduled) return 1;
      if (!b.scheduled) return -1;
      const aIdx = a.scheduled.endYear * 12 + a.scheduled.endMonth;
      const bIdx = b.scheduled.endYear * 12 + b.scheduled.endMonth;
      return sortAsc ? aIdx - bIdx : bIdx - aIdx;
    });

  // Summary stats
  const totalWeeks = completed.reduce((s, t) => s + (t.durationWeeks ?? 0), 0);
  const totalSpent = completed.reduce((s, t) => s + (t.estimatedCost ?? 0), 0);
  const hasSpendData = completed.some((t) => t.estimatedCost);
  const continentCount = new Set(completed.map((t) => t.continent).filter(Boolean)).size;

  // Group by year
  const byYear = new Map<number, Trip[]>();
  for (const trip of completed) {
    const year = trip.scheduled?.endYear ?? trip.scheduled?.startYear ?? 0;
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(trip);
  }
  const sortedYears = [...byYear.keys()].sort((a, b) => sortAsc ? a - b : b - a);

  const editingTrip = editingTripId ? trips.find((t) => t.id === editingTripId) : null;

  function fmt(amount: number) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency", currency, maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toLocaleString()}`;
    }
  }

  return (
    <main className="flex-1 overflow-y-auto px-6 py-6">

      {/* Header */}
      <div className="flex items-center mb-5">
        <h2 className="font-display text-xl" style={{ color: "var(--text-secondary)" }}>
          Trip History
        </h2>
      </div>

      {completed.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
          <span className="text-4xl">🗺️</span>
          <p style={{ color: "var(--text-muted)" }} className="text-sm">
            No completed trips yet. Mark a trip as complete from the calendar.
          </p>
        </div>
      ) : (
        <>
          {/* Summary stats strip */}
          <div className="flex items-center justify-between gap-4 mb-6 px-4 py-3 rounded-xl max-w-2xl"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <div className="flex flex-wrap gap-6">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>Trips completed</span>
                <span className="text-lg font-bold" style={{ color: "var(--accent)" }}>{completed.length}</span>
              </div>
              {totalWeeks > 0 && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>Weeks traveled</span>
                  <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{totalWeeks}</span>
                </div>
              )}
              {continentCount > 0 && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>Continents</span>
                  <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{continentCount}</span>
                </div>
              )}
              {hasSpendData && totalSpent > 0 && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>Total spent</span>
                  <span className="text-lg font-bold" style={{ color: "#6366f1" }}>{fmt(totalSpent)}</span>
                </div>
              )}
            </div>
            {completed.length > 1 && (
              <button
                onClick={() => setSortAsc((v) => !v)}
                className="shrink-0 text-xs px-3 py-1.5 rounded-lg border transition-colors"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--text-muted)",
                  background: "var(--surface-3)",
                }}>
                {sortAsc ? "Oldest first" : "Newest first"}
              </button>
            )}
          </div>

          {/* Year groups */}
          <div className="flex flex-col gap-6 max-w-2xl">
            {sortedYears.map((year) => (
              <div key={year}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-display text-base" style={{ color: "var(--text-secondary)" }}>{year}</span>
                  <div className="flex-1 h-px" style={{ background: "var(--border-subtle)" }} />
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {byYear.get(year)!.length} trip{byYear.get(year)!.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {byYear.get(year)!.map((trip) => {
                    const group = groups.find((g) => g.id === trip.groupId);
                    const category = categories.find((c) => c.id === trip.categoryId);
                    const groupColor = group?.color ?? "#78716c";

                    return (
                      <button
                        key={trip.id}
                        onClick={() => setEditingTripId(trip.id)}
                        className="flex items-center gap-3 rounded-xl w-full text-left transition-colors"
                        style={{
                          background: "var(--surface-1)",
                          border: "1px solid var(--border-subtle)",
                          borderLeft: `3px solid ${groupColor}`,
                          padding: "12px 16px",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface-1)")}>

                        {/* Image thumbnail */}
                        {trip.imageUrl ? (
                          <div style={{
                            width: "72px", height: "72px", borderRadius: "8px",
                            background: `url(${trip.imageUrl}) center/cover no-repeat`,
                            flexShrink: 0,
                          }} />
                        ) : (
                          <div style={{
                            width: "72px", height: "72px", borderRadius: "8px",
                            background: `${groupColor}22`, flexShrink: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "22px",
                          }}>
                            {category?.icon ?? "✈️"}
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                            {trip.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            {trip.destination && (
                              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                                {trip.destination}
                              </span>
                            )}
                            {category && (
                              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                                · {category.icon} {category.name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Right side: date range + group pill + duration */}
                        <div className="text-right shrink-0">
                          {trip.scheduled && (
                            <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>
                              {MONTH_NAMES[trip.scheduled.startMonth]} {trip.scheduled.startYear}
                              {" – "}
                              {MONTH_NAMES[trip.scheduled.endMonth]} {trip.scheduled.endYear}
                            </p>
                          )}
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="text-xs px-2 py-0.5 rounded-full"
                              style={{ background: `${groupColor}22`, color: groupColor }}>
                              {group?.name}
                            </span>
                            {trip.durationWeeks && (
                              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                                {trip.durationWeeks}w
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {editingTrip && createPortal(
        <TripEditModal trip={editingTrip} onClose={() => setEditingTripId(null)} />,
        document.body
      )}
    </main>
  );
}
