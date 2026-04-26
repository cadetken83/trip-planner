"use client";

import { useTripStore } from "@/store/useTripStore";
import { MapPin, Check, Globe } from "lucide-react";

const MONTH_NAMES = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

export default function HistoryPanel() {
  const { trips, groups, filters } = useTripStore();

  const completed = trips
    .filter((t) => {
      if (t.status !== "completed") return false;
      if (filters.groupIds.length && !filters.groupIds.includes(t.groupId)) return false;
      if (filters.continents.length && t.continent && !filters.continents.includes(t.continent)) return false;
      return true;
    })
    .sort((a, b) => {
      // Sort by end date descending (most recent first)
      if (!a.scheduled) return 1;
      if (!b.scheduled) return -1;
      const aIdx = a.scheduled.endYear * 12 + a.scheduled.endMonth;
      const bIdx = b.scheduled.endYear * 12 + b.scheduled.endMonth;
      return bIdx - aIdx;
    });

  return (
    <main className="flex-1 overflow-y-auto px-6 py-6">
      <h2
        className="font-display text-xl mb-6"
        style={{ color: "var(--text-secondary)" }}
      >
        Trip History
      </h2>

      {completed.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
          <span className="text-4xl">🗺️</span>
          <p style={{ color: "var(--text-muted)" }} className="text-sm">
            No completed trips yet. Mark a trip as complete from the calendar.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 max-w-2xl">
          {completed.map((trip) => {
            const group = groups.find((g) => g.id === trip.groupId);
            const groupColor = group?.color ?? "#78716c";

            return (
              <div
                key={trip.id}
                className="flex items-center gap-4 rounded-xl px-5 py-4"
                style={{
                  background: "var(--surface-1)",
                  border: "1px solid var(--border-subtle)",
                  borderLeft: `3px solid ${groupColor}`,
                }}
              >
                {/* Check badge */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${groupColor}22`, color: groupColor }}
                >
                  <Check size={14} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
                    {trip.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    {trip.destination && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                        <MapPin size={10} />
                        {trip.destination}
                      </span>
                    )}
                    {trip.continent && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                        <Globe size={10} />
                        {trip.continent}
                      </span>
                    )}
                  </div>
                </div>

                {/* Date range */}
                {trip.scheduled && (
                  <div className="text-right shrink-0">
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {MONTH_NAMES[trip.scheduled.startMonth]} {trip.scheduled.startYear}
                      {" – "}
                      {MONTH_NAMES[trip.scheduled.endMonth]} {trip.scheduled.endYear}
                    </p>
                    <p
                      className="text-xs mt-0.5 px-2 py-0.5 rounded-full inline-block"
                      style={{ background: `${groupColor}22`, color: groupColor }}
                    >
                      {group?.name}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
