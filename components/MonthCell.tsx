"use client";

import { useDroppable } from "@dnd-kit/core";
import { Trip, Group } from "@/types";
import TripBar, { BarPosition } from "@/components/TripBar";
import { useDragType } from "@/contexts/DragContext";

const MONTH_NAMES = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

export type LaneEntry = {
  trip: Trip;
  group: Group | undefined;
  position: BarPosition;
  hasLeftNeighbor: boolean;
  hasRightNeighbor: boolean;
} | null;

// Bar height + gap between bars
const BAR_H  = 72;
const BAR_GAP = 6;
// Label height at top of cell
const LABEL_H = 20;
// Cell padding
const CELL_PAD = 8;

type Props = {
  month: number;
  year: number;
  lanes: LaneEntry[];
  isCurrentMonth: boolean;
  blackoutLabels?: string[];
  isBlackedOut?: boolean;
  mode?: "planning" | "history";
};

export default function MonthCell({ month, year, lanes, isCurrentMonth, blackoutLabels = [], isBlackedOut = false, mode }: Props) {
  const activeDragType = useDragType();

  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${year}-${month}`,
    data: { month, year },
  });

  const now = new Date();
  const isPast =
    year < now.getFullYear() ||
    (year === now.getFullYear() && month < now.getMonth());

  const hasAnyTrip = lanes.some((l) => l !== null);

  const highlightColor =
    activeDragType === "move-bar"     ? "#a78bfa"
    : activeDragType === "resize-start" || activeDragType === "resize-end" ? "#34d399"
    : "var(--accent)";

  const borderColor = isOver ? highlightColor : "var(--border-subtle)";

  const bgColor = isOver
    ? activeDragType === "move-bar"     ? "rgba(167,139,250,0.12)"
    : (activeDragType === "resize-start" || activeDragType === "resize-end") ? "rgba(52,211,153,0.12)"
    : "var(--surface-3)"
    : isCurrentMonth ? "var(--surface-2)"
    : "var(--surface-1)";

  const laneCount = Math.max(lanes.length, 1);
  const cellHeight = CELL_PAD + LABEL_H + (laneCount * (BAR_H + BAR_GAP)) + CELL_PAD;

  return (
    <div
      ref={setNodeRef}
      className="rounded-lg transition-colors"
      style={{
        background: bgColor,
        border: `1px ${isOver ? "dashed" : "solid"} ${borderColor}`,
        opacity: isPast && mode !== "history" ? 0.65 : 1,
        height: `${cellHeight}px`,
        padding: `${CELL_PAD}px ${CELL_PAD}px`,
        display: "flex",
        flexDirection: "column",
        gap: 0,
        overflow: "visible",  // allow bar bleed across gap
        position: "relative",
        zIndex: hasAnyTrip ? 2 : 1,
      }}
    >
      {/* Blackout shading overlay */}
      {isBlackedOut && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none",
          background: "repeating-linear-gradient(-45deg, transparent, transparent 4px, var(--blackout-stripe) 4px, var(--blackout-stripe) 8px)",
        }} />
      )}

      {/* Month label — fixed height; blackout chips inline so they add no extra vertical space */}
      <div style={{ height: `${LABEL_H}px`, display: "flex", alignItems: "center", gap: "4px", flexShrink: 0, overflow: "hidden" }}>
        {isCurrentMonth && (
          <div style={{
            width: "4px", height: "4px", borderRadius: "50%",
            background: "var(--accent)", flexShrink: 0,
          }} />
        )}
        <span style={{
          fontSize: "11px",
          fontWeight: 500,
          color: isCurrentMonth ? "var(--accent)" : "var(--text-muted)",
          flexShrink: 0,
        }}>
          {MONTH_NAMES[month]}
        </span>
        {/* Colored pip for each trip present this month — brighter at start */}
        {lanes
          .filter((l) => l !== null)
          .map((l, i) => {
            const isEntry = l!.position === "start" || l!.position === "single";
            return (
              <div key={i} style={{
                width: isEntry ? "6px" : "5px",
                height: isEntry ? "6px" : "5px",
                borderRadius: "50%",
                background: l!.group?.color ?? "#78716c",
                opacity: isEntry ? 1 : 0.45,
                flexShrink: 0,
              }} />
            );
          })}
        {/* Blackout chips inline — no extra row, no layout shift */}
        {blackoutLabels.map((lbl) => (
          <span key={lbl} style={{
            fontSize: "9px", padding: "1px 5px", borderRadius: "999px",
            background: "rgba(239,68,68,0.12)", color: "var(--text-secondary)",
            border: "1px solid rgba(239,68,68,0.25)",
            whiteSpace: "nowrap", lineHeight: "14px", flexShrink: 0,
          }}>{lbl}</span>
        ))}
      </div>

      {/* Bars — one per lane, fixed height */}
      <div style={{ display: "flex", flexDirection: "column", gap: `${BAR_GAP}px` }}>
        {lanes.map((lane, i) =>
          lane === null ? (
            <div key={i} style={{ height: `${BAR_H}px`, flexShrink: 0 }} />
          ) : (
            <TripBar
              key={lane.trip.id}
              trip={lane.trip}
              group={lane.group}
              position={lane.position}
              hasLeftNeighbor={lane.hasLeftNeighbor}
              hasRightNeighbor={lane.hasRightNeighbor}
            />
          )
        )}
      </div>

      {/* Drop hint */}
      {isOver && !hasAnyTrip && (
        <div style={{
          fontSize: "10px",
          textAlign: "center",
          marginTop: "4px",
          color: highlightColor,
        }}>
          {activeDragType === "move-bar"       ? "Move here"
           : activeDragType === "resize-start" ? "Set new start"
           : activeDragType === "resize-end"   ? "Set new end"
           : "Drop here"}
        </div>
      )}
    </div>
  );
}
