"use client";

import { useState } from "react";
import {
  DndContext, DragEndEvent, DragStartEvent,
  MouseSensor, TouchSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import { useTripStore } from "@/store/useTripStore";
import { Ban } from "lucide-react";
import { Trip } from "@/types";
import TripSidebar from "@/components/TripSidebar";
import CalendarPanel from "@/components/CalendarPanel";
import { DragContext, DragType } from "@/contexts/DragContext";

function monthSpan(trip: Trip): number {
  if (!trip.scheduled) return 1;
  const { startMonth, startYear, endMonth, endYear } = trip.scheduled;
  return (endYear - startYear) * 12 + (endMonth - startMonth);
}

function addMonths(month: number, year: number, delta: number) {
  const total = month + delta;
  const m = ((total % 12) + 12) % 12;
  const y = year + Math.floor(total / 12);
  return { month: m, year: y };
}

function ConflictNotice({ tripTitle, blackoutNames, onDismiss }: {
  tripTitle: string; blackoutNames: string[]; onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="rounded-xl p-5 w-80 flex flex-col gap-4 shadow-2xl"
        style={{
          background: "var(--surface-2)", border: "1px solid var(--border)",
          borderTop: "3px solid #ef4444",
        }}>
        <div className="flex items-start gap-3">
          <Ban size={16} style={{ color: "#ef4444", flexShrink: 0, marginTop: "2px" }} />
          <div>
            <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>Scheduling Conflict</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              <strong>"{tripTitle}"</strong> overlaps {blackoutNames.length === 1 ? "the" : ""} blackout period{blackoutNames.length > 1 ? "s" : ""}:{" "}
              <strong>{blackoutNames.join(", ")}</strong>.
            </p>
          </div>
        </div>
        <button onClick={onDismiss}
          className="w-full py-2 rounded-lg text-sm font-medium"
          style={{ background: "var(--surface-3)", color: "var(--text-secondary)" }}>
          Dismiss
        </button>
      </div>
    </div>
  );
}

export default function HistoryPanel() {
  const { trips, updateTrip } = useTripStore();
  const blackoutDates = useTripStore((s) => s.blackoutDates);

  const [activeDragType, setActiveDragType] = useState<DragType>(null);
  const [blackoutConflictAlert, setBlackoutConflictAlert] = useState<{ tripTitle: string; blackoutNames: string[] } | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const conflictsForRange = (range: { startMonth: number; startYear: number; endMonth: number; endYear: number }) => {
    const ts = range.startYear * 12 + range.startMonth + 1;
    const te = range.endYear   * 12 + range.endMonth   + 1;
    return blackoutDates.filter((b) => {
      const bs = b.startYear * 12 + b.startMonth;
      const be = b.endYear   * 12 + b.endMonth;
      return ts <= be && te >= bs;
    });
  };

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as any;
    const t = data?.type as string | undefined;
    if      (t === "move-bar")     setActiveDragType("move-bar");
    else if (t === "resize-start") setActiveDragType("resize-start");
    else if (t === "resize-end")   setActiveDragType("resize-end");
    else                           setActiveDragType(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { over, active } = event;
    const dragData = active.data.current as any;
    setActiveDragType(null);

    if (!over) return;

    const tripId   = dragData?.tripId as string;
    const dragType = dragData?.type   as string | undefined;
    const trip     = trips.find((t) => t.id === tripId);
    if (!trip) return;

    const dropData = over.data.current as any;
    if (!dropData) return;

    // Block dropping completed trips onto the unscheduled sidebar
    if (dropData.isSidebar) return;

    const { month, year } = dropData as { month: number; year: number };

    if (dragType === "move-bar") {
      if (trip.scheduled?.startMonth === month && trip.scheduled?.startYear === year) return;
      const span = monthSpan(trip);
      const end  = addMonths(month, year, span);
      const newRange = { startMonth: month, startYear: year, endMonth: end.month, endYear: end.year };
      updateTrip(tripId, { scheduled: newRange });
      const conflicts = conflictsForRange(newRange);
      if (conflicts.length > 0) {
        setBlackoutConflictAlert({ tripTitle: trip.title, blackoutNames: conflicts.map((b) => b.label) });
      }
      return;
    }

    if (dragType === "resize-start") {
      if (!trip.scheduled) return;
      const newStartIdx = year * 12 + month;
      const endIdx      = trip.scheduled.endYear * 12 + trip.scheduled.endMonth;
      if (newStartIdx > endIdx) return;
      const newRange = { ...trip.scheduled, startMonth: month, startYear: year };
      updateTrip(tripId, { scheduled: newRange });
      const conflicts = conflictsForRange(newRange);
      if (conflicts.length > 0) {
        setBlackoutConflictAlert({ tripTitle: trip.title, blackoutNames: conflicts.map((b) => b.label) });
      }
      return;
    }

    if (dragType === "resize-end") {
      if (!trip.scheduled) return;
      const startIdx  = trip.scheduled.startYear * 12 + trip.scheduled.startMonth;
      const newEndIdx = year * 12 + month;
      if (newEndIdx < startIdx) return;
      const newRange = { ...trip.scheduled, endMonth: month, endYear: year };
      updateTrip(tripId, { scheduled: newRange });
      const conflicts = conflictsForRange(newRange);
      if (conflicts.length > 0) {
        setBlackoutConflictAlert({ tripTitle: trip.title, blackoutNames: conflicts.map((b) => b.label) });
      }
      return;
    }
  }

  return (
    <DragContext.Provider value={activeDragType}>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 overflow-hidden">
          <TripSidebar />
          <CalendarPanel mode="history" />
        </div>

        {blackoutConflictAlert && (
          <ConflictNotice
            tripTitle={blackoutConflictAlert.tripTitle}
            blackoutNames={blackoutConflictAlert.blackoutNames}
            onDismiss={() => setBlackoutConflictAlert(null)}
          />
        )}
      </DndContext>
    </DragContext.Provider>
  );
}
