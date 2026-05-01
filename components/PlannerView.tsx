"use client";

import { useState } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  MouseSensor, TouchSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useTripStore } from "@/store/useTripStore";
import { Ban } from "lucide-react";
import { Trip } from "@/types";
import TripSidebar from "@/components/TripSidebar";
import CalendarPanel from "@/components/CalendarPanel";
import TripCard from "@/components/TripCard";
import { DragContext, DragType } from "@/contexts/DragContext";

// ── Helpers ───────────────────────────────────────────────────────────────────

function suggestedMonthSpan(durationWeeks?: number): number {
  if (!durationWeeks || durationWeeks <= 4) return 1;
  if (durationWeeks <= 8)  return 2;
  if (durationWeeks <= 12) return 3;
  return Math.ceil(durationWeeks / 4);
}

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

function isPastMonth(month: number, year: number): boolean {
  const now = new Date();
  return year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth());
}

// ── Confirmation modal ────────────────────────────────────────────────────────
function ConfirmModal({ title, message, onConfirm, onCancel, confirmLabel = "Confirm", danger = false }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void;
  confirmLabel?: string; danger?: boolean;
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="rounded-xl p-5 w-80 flex flex-col gap-4 shadow-2xl"
        style={{
          background: "var(--surface-2)", border: "1px solid var(--border)",
          borderTop: `3px solid ${danger ? "#ef4444" : "#f59e0b"}`,
        }}>
        <div>
          <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{title}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{message}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 rounded-lg text-sm"
            style={{ background: "var(--surface-3)", color: "var(--text-secondary)" }}>Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2 rounded-lg text-sm font-medium"
            style={{ background: danger ? "#ef4444" : "#f59e0b", color: danger ? "#fff" : "#0c0a09" }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Conflict notice ───────────────────────────────────────────────────────────
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
              <strong>{blackoutNames.join(", ")}</strong>. You can reschedule the trip or adjust blackout dates in Settings.
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

// ── Types ─────────────────────────────────────────────────────────────────────
type PendingAction =
  | { kind: "remove";          tripId: string }
  | { kind: "move";            tripId: string; month: number; year: number }
  | { kind: "resize-start";    tripId: string; month: number; year: number }
  | { kind: "resize-end";      tripId: string; month: number; year: number }
  | { kind: "past-schedule";   tripId: string; month: number; year: number };

// ── PlannerView ───────────────────────────────────────────────────────────────
export default function PlannerView() {
  const { trips, tripOrder, groups, updateTrip, unscheduleTrip, reorderTrips, scheduleTrip, completeTrip } = useTripStore();
  const blackoutDates = useTripStore((s) => s.blackoutDates);

  const [activeDragType,       setActiveDragType]       = useState<DragType>(null);
  const [activeTripId,         setActiveTripId]         = useState<string | null>(null);
  const [activeIsSorting,      setActiveIsSorting]      = useState(false);
  const [pendingConfirm,       setPendingConfirm]       = useState<PendingAction | null>(null);
  const [blackoutConflictAlert, setBlackoutConflictAlert] = useState<{ tripTitle: string; blackoutNames: string[] } | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  const activeTrip  = activeTripId ? trips.find((t) => t.id === activeTripId) : null;
  const activeGroup = activeTrip   ? groups.find((g) => g.id === activeTrip.groupId) : undefined;

  // ── Conflict helper ──────────────────────────────────────────────────────
  const conflictsForRange = (range: { startMonth: number; startYear: number; endMonth: number; endYear: number }) => {
    const ts = range.startYear * 12 + range.startMonth + 1;
    const te = range.endYear   * 12 + range.endMonth   + 1;
    return blackoutDates.filter((b) => {
      const bs = b.startYear * 12 + b.startMonth;
      const be = b.endYear   * 12 + b.endMonth;
      return ts <= be && te >= bs;
    });
  };

  // ── Execute actions ──────────────────────────────────────────────────────
  const executeAction = (action: PendingAction) => {
    const trip = trips.find((t) => t.id === action.tripId);
    if (!trip) return;

    let newRange: { startMonth: number; startYear: number; endMonth: number; endYear: number } | null = null;

    if (action.kind === "remove") {
      unscheduleTrip(action.tripId);

    } else if (action.kind === "past-schedule") {
      const span = suggestedMonthSpan(trip.durationWeeks);
      const end  = addMonths(action.month, action.year, span - 1);
      newRange = { startMonth: action.month, startYear: action.year, endMonth: end.month, endYear: end.year };
      scheduleTrip(action.tripId, newRange);
      completeTrip(action.tripId);

    } else if (action.kind === "move") {
      const span = monthSpan(trip);
      const end  = addMonths(action.month, action.year, span);
      newRange = { startMonth: action.month, startYear: action.year, endMonth: end.month, endYear: end.year };
      updateTrip(action.tripId, { scheduled: newRange });

    } else if (action.kind === "resize-start") {
      if (!trip.scheduled) return;
      const newStartIdx = action.year * 12 + action.month;
      const endIdx      = trip.scheduled.endYear * 12 + trip.scheduled.endMonth;
      if (newStartIdx > endIdx) return;
      newRange = { ...trip.scheduled, startMonth: action.month, startYear: action.year };
      updateTrip(action.tripId, { scheduled: newRange });

    } else if (action.kind === "resize-end") {
      if (!trip.scheduled) return;
      const startIdx  = trip.scheduled.startYear * 12 + trip.scheduled.startMonth;
      const newEndIdx = action.year * 12 + action.month;
      if (newEndIdx < startIdx) return;
      newRange = { ...trip.scheduled, endMonth: action.month, endYear: action.year };
      updateTrip(action.tripId, { scheduled: newRange });
    }

    setPendingConfirm(null);

    if (newRange) {
      const conflicts = conflictsForRange(newRange);
      if (conflicts.length > 0) {
        setBlackoutConflictAlert({ tripTitle: trip.title, blackoutNames: conflicts.map((b) => b.label) });
      }
    }
  };

  // ── Drag start ───────────────────────────────────────────────────────────
  function handleDragStart(event: DragStartEvent) {
    const id   = event.active.id as string;
    const data = event.active.data.current as any;

    if (id.startsWith("sort-")) {
      setActiveTripId(id.replace("sort-", ""));
      setActiveIsSorting(true);
      setActiveDragType(null);
      return;
    }

    setActiveIsSorting(false);
    setActiveTripId(data?.tripId ?? null);

    const t = data?.type as string | undefined;
    if      (t === "move-bar")     setActiveDragType("move-bar");
    else if (t === "resize-start") setActiveDragType("resize-start");
    else if (t === "resize-end")   setActiveDragType("resize-end");
    else                           setActiveDragType("new");
  }

  // ── Drag end ─────────────────────────────────────────────────────────────
  function handleDragEnd(event: DragEndEvent) {
    const { over, active } = event;
    const rawId    = active.id as string;
    const dragData = active.data.current as any;

    // Sort reorder
    if (rawId.startsWith("sort-")) {
      setActiveTripId(null); setActiveIsSorting(false); setActiveDragType(null);
      if (!over) return;
      const fromId  = rawId.replace("sort-", "");
      const toId    = (over.id as string).replace("sort-", "");
      if (fromId === toId) return;
      const fromIdx = tripOrder.indexOf(fromId);
      const toIdx   = tripOrder.indexOf(toId);
      if (fromIdx === -1 || toIdx === -1) return;
      reorderTrips(arrayMove(tripOrder, fromIdx, toIdx));
      return;
    }

    setActiveTripId(null);
    setActiveDragType(null);

    if (!over) return;

    const tripId   = dragData?.tripId as string;
    const dragType = dragData?.type   as string | undefined;
    const trip     = trips.find((t) => t.id === tripId);
    if (!trip) return;

    const dropData = over.data.current as any;
    if (!dropData) return;

    // Sidebar drop — unschedule
    if (dropData.isSidebar) {
      if (!trip.scheduled) return;
      if (trip.status === "booked") setPendingConfirm({ kind: "remove", tripId });
      else unscheduleTrip(tripId);
      return;
    }

    // Month cell drop — route by drag type
    const { month, year } = dropData as { month: number; year: number };

    if (!dragType || dragType === "new") {
      if (isPastMonth(month, year) && trip.status !== "completed") {
        setPendingConfirm({ kind: "past-schedule", tripId, month, year });
        return;
      }
      const span = suggestedMonthSpan(trip.durationWeeks);
      const end  = addMonths(month, year, span - 1);
      const range = { startMonth: month, startYear: year, endMonth: end.month, endYear: end.year };
      scheduleTrip(tripId, range);
      const conflicts = conflictsForRange(range);
      if (conflicts.length > 0) {
        setBlackoutConflictAlert({ tripTitle: trip.title, blackoutNames: conflicts.map((b) => b.label) });
      }
      return;
    }

    if (dragType === "move-bar") {
      // Don't act if dropped on same start month
      if (trip.scheduled?.startMonth === month && trip.scheduled?.startYear === year) return;
      if (isPastMonth(month, year) && trip.status !== "completed") {
        setPendingConfirm({ kind: "past-schedule", tripId, month, year });
        return;
      }
      const action: PendingAction = { kind: "move", tripId, month, year };
      if (trip.status === "booked") setPendingConfirm(action);
      else executeAction(action);
      return;
    }

    if (dragType === "resize-start") {
      const action: PendingAction = { kind: "resize-start", tripId, month, year };
      if (trip.status === "booked") setPendingConfirm(action);
      else executeAction(action);
      return;
    }

    if (dragType === "resize-end") {
      const action: PendingAction = { kind: "resize-end", tripId, month, year };
      if (trip.status === "booked") setPendingConfirm(action);
      else executeAction(action);
      return;
    }
  }

  // ── Confirmation text ────────────────────────────────────────────────────
  const confirmDetails = pendingConfirm ? (() => {
    const t = trips.find((t) => t.id === pendingConfirm.tripId);
    if (pendingConfirm.kind === "past-schedule") return {
      title: "Past month",
      message: `This month has already passed. Mark "${t?.title}" as Completed?`,
      confirmLabel: "Mark Completed", danger: false,
    };
    if (pendingConfirm.kind === "remove") return {
      title: "⚠️ Remove booked trip?",
      message: `"${t?.title}" is booked. Removing it will revert it to unscheduled.`,
      confirmLabel: "Remove", danger: true,
    };
    if (pendingConfirm.kind === "move") return {
      title: "⚠️ Move booked trip?",
      message: `"${t?.title}" is booked. Moving it changes its calendar dates — update any reservations.`,
      confirmLabel: "Move anyway", danger: false,
    };
    return {
      title: "⚠️ Resize booked trip?",
      message: `"${t?.title}" is booked. Changing its duration may affect your reservations.`,
      confirmLabel: "Resize anyway", danger: false,
    };
  })() : null;

  return (
    <DragContext.Provider value={activeDragType}>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 overflow-hidden">
          <TripSidebar />
          <CalendarPanel />
        </div>

        {/* Ghost only for new sidebar→calendar drags */}
        <DragOverlay dropAnimation={null}>
          {activeTrip && !activeIsSorting && activeDragType === "new" && (
            <div style={{ width: "240px", opacity: 0.9, pointerEvents: "none" }}>
              <TripCard trip={activeTrip} group={activeGroup} />
            </div>
          )}
        </DragOverlay>

        {/* Booked action confirmation */}
        {pendingConfirm && confirmDetails && (
          <ConfirmModal
            title={confirmDetails.title}
            message={confirmDetails.message}
            confirmLabel={confirmDetails.confirmLabel}
            danger={confirmDetails.danger}
            onConfirm={() => executeAction(pendingConfirm)}
            onCancel={() => setPendingConfirm(null)}
          />
        )}

        {/* Blackout conflict notice */}
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
