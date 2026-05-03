"use client";

import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Trip, Group } from "@/types";
import { useTripStore } from "@/store/useTripStore";
import { X, Check, RotateCcw, AlertTriangle, Ban, ChevronUp, ChevronDown } from "lucide-react";
import TripEditModal from "@/components/TripEditModal";

export type BarPosition = "start" | "middle" | "end" | "single";

type Props = {
  trip: Trip;
  group: Group | undefined;
  position: BarPosition;
};

export const BAR_HEIGHT = 72;

// Distance each bar must bleed to bridge the inter-cell gap
const BLEED = 14;
// Extra expansion on the "open" edge of start/end bars and both edges of single bars
// gives all cards a minimum visual width of ~2 months and centers them on their month(s)
const EXPAND = 44;

function isBookByOverdue(trip: Trip): boolean {
  if (!trip.bookBy || trip.status === "booked" || trip.status === "completed") return false;
  const now = new Date();
  const limit = new Date(trip.bookBy.year, trip.bookBy.month, trip.bookBy.day ?? 1);
  return limit < now;
}

export default function TripBar({ trip, group, position }: Props) {
  const { unscheduleTrip, bookTrip, unbookTrip, categories } = useTripStore();
  const blackoutDates = useTripStore((s) => s.blackoutDates);
  const [hovered,              setHovered]              = useState(false);
  const [showEdit,             setShowEdit]             = useState(false);
  const [showRemoveConfirm,    setShowRemoveConfirm]    = useState(false);
  const [showBlackoutPopover,  setShowBlackoutPopover]  = useState(false);
  const conflictBtnRef = useRef<HTMLButtonElement>(null);
  const hideTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openBlackoutPopover() {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setShowBlackoutPopover(true);
  }
  function closeBlackoutPopover() {
    hideTimerRef.current = setTimeout(() => setShowBlackoutPopover(false), 120);
  }

  const color    = group?.color ?? "#78716c";
  const isBooked = trip.status === "booked";
  const isStart  = position === "start" || position === "single";
  const isEnd    = position === "end"   || position === "single";

  const category = categories.find((c) => c.id === trip.categoryId);
  const overdue  = isBookByOverdue(trip);

  const conflictingBlackouts = (() => {
    if (!trip.scheduled) return [];
    // +1 normalizes trip months (0-indexed) to match BlackoutDate months (1-indexed)
    const ts = trip.scheduled.startYear * 12 + trip.scheduled.startMonth + 1;
    const te = trip.scheduled.endYear   * 12 + trip.scheduled.endMonth   + 1;
    return blackoutDates.filter((b) => {
      const bs = b.startYear * 12 + b.startMonth;
      const be = b.endYear   * 12 + b.endMonth;
      return ts <= be && te >= bs;
    });
  })();
  const hasBlackoutConflict = conflictingBlackouts.length > 0;

  // ── Draggables ──────────────────────────────────────────────────────────────
  const {
    attributes: barAttrs, listeners: barListeners,
    setNodeRef: barRef, transform: barTransform, isDragging: barDragging,
  } = useDraggable({
    id: `bar-${trip.id}-${position}`,
    data: { type: "move-bar", tripId: trip.id },
  });

  const {
    attributes: rsAttrs, listeners: rsListeners,
    setNodeRef: rsRef, isDragging: rsDragging,
  } = useDraggable({
    id: `resize-start-${trip.id}-${position}`,
    data: { type: "resize-start", tripId: trip.id },
    disabled: !isStart,
  });

  const {
    attributes: reAttrs, listeners: reListeners,
    setNodeRef: reRef, isDragging: reDragging,
  } = useDraggable({
    id: `resize-end-${trip.id}-${position}`,
    data: { type: "resize-end", tripId: trip.id },
    disabled: !isEnd,
  });

  const isDragging   = barDragging || rsDragging || reDragging;
  const showActions  = isStart && hovered && !isDragging;

  const borderRadius = {
    start: "6px 0 0 6px", middle: "0", end: "0 6px 6px 0", single: "6px",
  }[position];

  // Single bars bleed both sides; start also expands left; end also expands right
  const marginLeft  = position === "single" ? `-${EXPAND}px`
                    : position === "start"  ? `-${EXPAND}px`
                    : `-${BLEED}px`;
  const marginRight = position === "single" ? `-${EXPAND}px`
                    : position === "end"    ? `-${EXPAND}px`
                    : `-${BLEED}px`;

  // Background: image on all positions when available, colour wash as fallback
  const hasImage = !!trip.imageUrl;
  let barBg: string;
  if (hasImage) {
    barBg = `linear-gradient(rgba(0,0,0,0.28), rgba(0,0,0,0.28)), url(${trip.imageUrl}) center/cover no-repeat`;
  } else if (isStart) {
    barBg = isBooked ? color : `${color}66`;
  } else {
    barBg = isBooked ? `${color}50` : `${color}28`;
  }

  const textOnBar = hasImage || isBooked;
  const textColor = textOnBar ? "#fff" : color;
  const metaColor = textOnBar ? "rgba(255,255,255,0.82)" : `${color}bb`;

  const barBorder = hasBlackoutConflict && isStart
    ? `2px solid #ef4444`
    : overdue && isStart
      ? `2px solid #f59e0b`
      : isStart
        ? isBooked ? `2px solid ${color}` : `1.5px dashed ${color}88`
        : `1px solid ${color}44`;

  // Grip chevron color: white on dark bars, group color on light bars
  const gripColor = hovered
    ? (textOnBar ? "rgba(255,255,255,0.95)" : `${color}`)
    : (textOnBar ? "rgba(255,255,255,0.6)"  : `${color}88`);

  // Title right offset reserves space for the indicator cluster (top-right)
  const titleRight = (hasBlackoutConflict && overdue) ? 52
    : (hasBlackoutConflict || overdue) ? 36
    : 10;

  return (
    <>
      <div
        ref={barRef}
        className="relative select-none"
        style={{
          height: `${BAR_HEIGHT}px`,
          marginLeft, marginRight, borderRadius,
          background: barBg,
          border: barBorder,
          boxShadow: isBooked && !isDragging && isStart ? `0 2px 10px ${color}44` : "none",
          transform: CSS.Translate.toString(barTransform),
          opacity: isDragging ? 0.3 : 1,
          cursor: isDragging ? "grabbing" : "grab",
          touchAction: "none",
          overflow: "hidden",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setShowRemoveConfirm(false); }}
        suppressHydrationWarning
        {...barAttrs}
        {...barListeners}
      >
        {/* ── Left resize grip (chevron pair) ── */}
        {isStart && (
          <div ref={rsRef} suppressHydrationWarning {...rsAttrs} {...rsListeners}
            onMouseDown={(e) => { e.stopPropagation(); (rsListeners?.onMouseDown as any)?.(e); }}
            style={{
              position: "absolute", left: 0, top: 0, bottom: 0, width: "10px",
              cursor: "col-resize", zIndex: 15,
              display: "flex", flexDirection: "column", justifyContent: "space-between",
              alignItems: "center", touchAction: "none",
              paddingTop: "5px", paddingBottom: "5px",
            }}>
            <ChevronUp size={10} color={gripColor} />
            <ChevronDown size={10} color={gripColor} />
          </div>
        )}

        {/* ── Status indicators (top-right cluster) ── */}
        {isStart && (hasBlackoutConflict || overdue) && (
          <div style={{
            position: "absolute", top: 8, right: 10,
            display: "flex", flexDirection: "row", gap: 4, alignItems: "center",
            zIndex: 20,
          }}>
            {hasBlackoutConflict && (
              <>
                <button
                  ref={conflictBtnRef}
                  onMouseEnter={openBlackoutPopover}
                  onMouseLeave={closeBlackoutPopover}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); setShowBlackoutPopover((v) => !v); }}
                  style={{
                    display: "flex", alignItems: "center",
                    background: "transparent", border: "none",
                    cursor: "pointer", padding: 0, lineHeight: 0,
                  }}>
                  <Ban size={13} style={{ color: "#f87171" }} />
                </button>
                {showBlackoutPopover && createPortal(
                  <div
                    onMouseEnter={openBlackoutPopover}
                    onMouseLeave={closeBlackoutPopover}
                    style={{
                      position: "fixed",
                      top: (conflictBtnRef.current?.getBoundingClientRect().bottom ?? 0) + 4,
                      left: (conflictBtnRef.current?.getBoundingClientRect().left ?? 0),
                      zIndex: 9999,
                      background: "var(--surface-1)",
                      border: "1px solid #ef4444",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      minWidth: "220px",
                      maxWidth: "280px",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                    }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                      <Ban size={13} style={{ color: "#ef4444", flexShrink: 0 }} />
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#ef4444" }}>Scheduling Conflict</span>
                    </div>
                    <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                      <strong>{trip.title}</strong> overlaps:
                    </p>
                    {conflictingBlackouts.map((b) => (
                      <div key={b.id} style={{
                        fontSize: "11px", color: "var(--text-primary)",
                        background: "var(--surface-3)", borderRadius: "4px",
                        padding: "3px 7px", marginBottom: "6px",
                      }}>
                        {b.label}
                      </div>
                    ))}
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px", marginTop: "8px" }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); unscheduleTrip(trip.id); setShowBlackoutPopover(false); }}
                        style={{
                          fontSize: "11px", fontWeight: 600, padding: "4px 10px",
                          borderRadius: "5px", border: "none", cursor: "pointer",
                          background: "#ef4444", color: "#fff",
                        }}>
                        Reschedule Trip
                      </button>
                      <p style={{ fontSize: "10px", color: "var(--text-muted)", textAlign: "center" }}>
                        or edit blackout dates on the Settings page
                      </p>
                    </div>
                  </div>,
                  document.body
                )}
              </>
            )}
            {overdue && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                width: "18px", height: "18px", borderRadius: "50%",
                background: "#f59e0b", boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                pointerEvents: "none",
              }}>
                <AlertTriangle size={11} style={{ color: "#fff" }} />
              </div>
            )}
          </div>
        )}

        {/* ── Zone A: Title (top-pinned) ── */}
        {isStart && (
          <div style={{
            position: "absolute",
            top: 10, left: 12, right: titleRight,
            pointerEvents: "none",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", minWidth: 0 }}>
              {isBooked && <Check size={11} style={{ color: textColor, flexShrink: 0 }} />}
              <span
                style={{
                  fontSize: "13px", fontWeight: 700, color: textColor,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  flex: "1 1 0", minWidth: 0, pointerEvents: "auto",
                  textShadow: textOnBar ? "0 1px 3px rgba(0,0,0,0.7)" : "none",
                  cursor: "pointer",
                }}
                onClick={(e) => { e.stopPropagation(); if (!isDragging) setShowEdit(true); }}
                title="Click to edit"
              >
                {trip.title}
              </span>
            </div>
          </div>
        )}

        {/* ── Zone B: Metadata (bottom-pinned) ── */}
        {isStart && (
          <div style={{
            position: "absolute",
            bottom: 10, left: 12, right: 10,
            display: "flex", alignItems: "center", gap: "5px", flexWrap: "nowrap", overflow: "hidden",
            fontSize: "10px", color: metaColor,
            textShadow: textOnBar ? "0 1px 2px rgba(0,0,0,0.7)" : "none",
            pointerEvents: "none",
          }}>
            {trip.durationWeeks && (
              <span style={{
                background: "rgba(255,255,255,0.22)", borderRadius: "3px",
                padding: "0 4px", fontWeight: 700, flexShrink: 0,
              }}>
                {trip.durationWeeks}W
              </span>
            )}
            {category && (
              <span style={{ flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {category.icon} {category.name}
              </span>
            )}
            {group && (
              <span style={{ flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                👥 {group.name}
              </span>
            )}
          </div>
        )}

        {/* ── Hover actions (bottom-right) ── */}
        {showActions && !showRemoveConfirm && (
          <div
            style={{
              position: "absolute", bottom: 6, right: 8,
              zIndex: 20, display: "flex", alignItems: "center", gap: "2px",
              background: "rgba(0,0,0,0.18)", borderRadius: "20px", padding: "2px",
            }}
            onMouseDown={(e) => e.stopPropagation()}>
            {isBooked ? (
              <button onClick={(e) => { e.stopPropagation(); unbookTrip(trip.id); }}
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: "rgba(0,0,0,0.4)", color: "#fff" }}
                title="Unbook"><RotateCcw size={9} /></button>
            ) : (
              <button onClick={(e) => { e.stopPropagation(); bookTrip(trip.id); }}
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: `${color}bb`, color: "#fff" }}
                title="Mark as booked"><Check size={10} /></button>
            )}
            {trip.status !== "completed" && (
              <button onClick={(e) => {
                  e.stopPropagation();
                  if (isBooked) setShowRemoveConfirm(true);
                  else unscheduleTrip(trip.id);
                }}
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: "#ef444477", color: "#fff" }}
                title="Remove from calendar"><X size={9} /></button>
            )}
          </div>
        )}

        {/* ── Remove confirm (portal modal) ── */}
        {showRemoveConfirm && createPortal(
          <div className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: "rgba(0,0,0,0.6)" }}
            onMouseDown={(e) => e.stopPropagation()}>
            <div className="rounded-xl p-5 w-80 flex flex-col gap-4 shadow-2xl"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderTop: "3px solid #ef4444" }}>
              <div>
                <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>Remove booked trip?</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                  "{trip.title}" is booked. Removing it will revert it to unscheduled.
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowRemoveConfirm(false)}
                  className="flex-1 py-2.5 rounded-lg text-sm"
                  style={{ background: "var(--surface-3)", color: "var(--text-secondary)" }}>
                  Cancel
                </button>
                <button onClick={() => { unscheduleTrip(trip.id); setShowRemoveConfirm(false); }}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                  style={{ background: "#ef4444", color: "#fff" }}>
                  Remove
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ── Right resize grip (chevron pair) ── */}
        {isEnd && (
          <div ref={reRef} suppressHydrationWarning {...reAttrs} {...reListeners}
            onMouseDown={(e) => { e.stopPropagation(); (reListeners?.onMouseDown as any)?.(e); }}
            style={{
              position: "absolute", right: 0, top: 0, bottom: 0, width: "10px",
              cursor: "col-resize", zIndex: 15,
              display: "flex", flexDirection: "column", justifyContent: "space-between",
              alignItems: "center", touchAction: "none",
              paddingTop: "5px", paddingBottom: "5px",
            }}>
            <ChevronUp size={10} color={gripColor} />
            <ChevronDown size={10} color={gripColor} />
          </div>
        )}
      </div>

      {showEdit && createPortal(
        <TripEditModal trip={trip} onClose={() => setShowEdit(false)} />,
        document.body
      )}
    </>
  );
}
