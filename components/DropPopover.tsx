"use client";

import { useState } from "react";
import { Trip, Group } from "@/types";
import { useTripStore } from "@/store/useTripStore";
import { X } from "lucide-react";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

type Props = {
  trip: Trip;
  group: Group | undefined;
  defaultMonth: number;
  defaultYear: number;
  onClose: () => void;
};

// Calculate how many months to span based on duration
function suggestedMonthSpan(durationWeeks?: number): number {
  if (!durationWeeks) return 1;
  if (durationWeeks <= 4) return 1;
  if (durationWeeks <= 8) return 2;
  if (durationWeeks <= 12) return 3;
  return Math.ceil(durationWeeks / 4);
}

// Add months to a month/year pair
function addMonths(month: number, year: number, count: number): { month: number; year: number } {
  const total = month + count;
  return {
    month: total % 12,
    year: year + Math.floor(total / 12),
  };
}

export default function DropPopover({ trip, group, defaultMonth, defaultYear, onClose }: Props) {
  const { scheduleTrip } = useTripStore();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear + i);

  const span = suggestedMonthSpan(trip.durationWeeks);
  const defaultEnd = addMonths(defaultMonth, defaultYear, span - 1);

  const [startMonth, setStartMonth] = useState(defaultMonth);
  const [startYear,  setStartYear]  = useState(defaultYear);
  const [endMonth,   setEndMonth]   = useState(defaultEnd.month);
  const [endYear,    setEndYear]    = useState(defaultEnd.year);

  const [bookByWarn, setBookByWarn] = useState(false);

  const groupColor = group?.color ?? "#78716c";

  const checkBookBy = (sMonth: number, sYear: number) => {
    if (!trip.bookBy) return false;
    const bookByIdx = trip.bookBy.year * 12 + trip.bookBy.month;
    const startIdx  = sYear * 12 + sMonth;
    return bookByIdx >= startIdx;
  };

  const handleConfirm = () => {
    const startIdx = startYear * 12 + startMonth;
    const endIdx   = endYear * 12 + endMonth;

    // Warn if Book By date is on or after the planned start
    if (checkBookBy(startMonth, startYear)) {
      setBookByWarn(true);
      return;
    }

    // Auto-correct if end is before start
    const finalEnd = endIdx < startIdx
      ? { endMonth: startMonth, endYear: startYear }
      : { endMonth, endYear };

    scheduleTrip(trip.id, { startMonth, startYear, ...finalEnd });
    onClose();
  };

  const handleConfirmAnyway = () => {
    const startIdx = startYear * 12 + startMonth;
    const endIdx   = endYear * 12 + endMonth;
    const finalEnd = endIdx < startIdx
      ? { endMonth: startMonth, endYear: startYear }
      : { endMonth, endYear };
    scheduleTrip(trip.id, { startMonth, startYear, ...finalEnd });
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div
        className="rounded-xl p-5 w-72 flex flex-col gap-4 shadow-2xl"
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderTop: `3px solid ${groupColor}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{trip.title}</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              Set calendar range
              {span > 1 && (
                <span className="ml-1" style={{ color: "var(--accent)" }}>
                  (~{span} months based on duration)
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}><X size={16} /></button>
        </div>

        {/* Start */}
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: "var(--text-muted)" }}>Start</label>
          <div className="flex gap-2">
            <select className="flex-1 text-sm rounded-md px-2 py-1.5 outline-none"
              style={{ background: "var(--surface-3)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
              value={startMonth} onChange={(e) => setStartMonth(Number(e.target.value))}>
              {MONTH_NAMES.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select className="text-sm rounded-md px-2 py-1.5 outline-none"
              style={{ background: "var(--surface-3)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
              value={startYear} onChange={(e) => setStartYear(Number(e.target.value))}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* End */}
        <div className="flex flex-col gap-1">
          <label className="text-xs" style={{ color: "var(--text-muted)" }}>End</label>
          <div className="flex gap-2">
            <select className="flex-1 text-sm rounded-md px-2 py-1.5 outline-none"
              style={{ background: "var(--surface-3)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
              value={endMonth} onChange={(e) => setEndMonth(Number(e.target.value))}>
              {MONTH_NAMES.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select className="text-sm rounded-md px-2 py-1.5 outline-none"
              style={{ background: "var(--surface-3)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
              value={endYear} onChange={(e) => setEndYear(Number(e.target.value))}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Book By warning */}
        {bookByWarn && trip.bookBy && (
          <div className="rounded-lg px-3 py-2 flex flex-col gap-2"
            style={{ background: "#f59e0b22", border: "1px solid #f59e0b55" }}>
            <p className="text-xs font-medium" style={{ color: "#f59e0b" }}>
              ⚠️ Book By date conflict
            </p>
            <p className="text-xs" style={{ color: "#f59e0b99" }}>
              Your Book By date ({MONTH_NAMES[trip.bookBy.month]} {trip.bookBy.year}) is on or after
              the planned start ({MONTH_NAMES[startMonth]} {startYear}).
              You should book before the trip starts.
            </p>
            <div className="flex gap-2 mt-1">
              <button
                onClick={handleConfirmAnyway}
                className="flex-1 py-1.5 rounded-md text-xs font-medium"
                style={{ background: "#f59e0b", color: "#0c0a09" }}>
                Place anyway
              </button>
              <button
                onClick={() => setBookByWarn(false)}
                className="flex-1 py-1.5 rounded-md text-xs"
                style={{ background: "var(--surface-3)", color: "var(--text-secondary)" }}>
                Adjust dates
              </button>
            </div>
          </div>
        )}

        {!bookByWarn && (
          <button onClick={handleConfirm}
            className="w-full py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: groupColor, color: "#0c0a09" }}>
            Place on Calendar
          </button>
        )}
      </div>
    </div>
  );
}
