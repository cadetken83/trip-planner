"use client";

import { useEffect, useState } from "react";
import { useTripStore } from "@/store/useTripStore";
import { Trip } from "@/types";
import { CheckCircle, X, Clock } from "lucide-react";

const MONTH_NAMES = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

export default function PastTripPrompt() {
  const { trips, groups, completeTrip, unscheduleTrip } = useTripStore();
  const [queue, setQueue] = useState<Trip[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const now = new Date();
    const currentIdx = now.getFullYear() * 12 + now.getMonth();

    // Find planned/booked trips whose end month has already passed
    const past = trips.filter((t) => {
      if (!t.scheduled) return false;
      if (t.status === "completed" || t.status === "unscheduled") return false;
      const endIdx = t.scheduled.endYear * 12 + t.scheduled.endMonth;
      return endIdx < currentIdx;
    });

    setQueue(past);
  }, [trips]);

  // Current trip being prompted (first undismissed one)
  const current = queue.find((t) => !dismissed.has(t.id));
  if (!current || !current.scheduled) return null;

  const group = groups.find((g) => g.id === current.groupId);
  const groupColor = group?.color ?? "#78716c";

  const dismiss = (id: string) =>
    setDismissed((prev) => new Set([...prev, id]));

  const handleYes = () => {
    completeTrip(current.id);
    dismiss(current.id);
  };

  const handleNo = () => {
    // Remove from calendar entirely — it didn't happen
    unscheduleTrip(current.id);
    dismiss(current.id);
  };

  const handleSkip = () => {
    dismiss(current.id);
  };

  const { startMonth, startYear, endMonth, endYear } = current.scheduled;
  const dateRange =
    startMonth === endMonth && startYear === endYear
      ? `${MONTH_NAMES[startMonth]} ${startYear}`
      : `${MONTH_NAMES[startMonth]} ${startYear} – ${MONTH_NAMES[endMonth]} ${endYear}`;

  const remaining = queue.filter((t) => !dismissed.has(t.id)).length;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 w-80 rounded-xl shadow-2xl overflow-hidden"
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderTop: `3px solid ${groupColor}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Clock size={14} style={{ color: groupColor }} />
          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
            Did this trip happen?
            {remaining > 1 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs"
                style={{ background: "var(--surface-3)", color: "var(--text-muted)" }}>
                {remaining} remaining
              </span>
            )}
          </span>
        </div>
        <button onClick={handleSkip} style={{ color: "var(--text-muted)" }}>
          <X size={14} />
        </button>
      </div>

      {/* Trip info */}
      <div className="px-4 pb-3">
        <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>
          {current.title}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {current.destination && `${current.destination} · `}{dateRange}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: groupColor }}
          />
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {group?.name}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex border-t" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={handleNo}
          className="flex-1 py-2.5 text-sm transition-colors hover:bg-stone-700"
          style={{ color: "var(--text-muted)", borderRight: "1px solid var(--border)" }}
        >
          Didn't happen
        </button>
        <button
          onClick={handleYes}
          className="flex-1 py-2.5 text-sm font-medium transition-colors hover:opacity-90 flex items-center justify-center gap-1.5"
          style={{ color: groupColor }}
        >
          <CheckCircle size={13} />
          Yes, mark complete
        </button>
      </div>
    </div>
  );
}
