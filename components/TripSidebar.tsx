"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTripStore, selectUnscheduledTrips } from "@/store/useTripStore";
import TripCard from "@/components/TripCard";
import { Plus, X } from "lucide-react";
import { Trip } from "@/types";
import { inferContinent } from "@/utils/inferContinent";
import { TRIP_SIDEBAR } from "@/lib/content";

function uid() { return crypto.randomUUID(); }

// ── Sortable trip card wrapper ────────────────────────────────────────────────
function SortableTripCard({ trip, group }: { trip: Trip; group: any }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `sort-${trip.id}` });

  return (
    <div ref={setNodeRef} style={{
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.4 : 1,
      zIndex: isDragging ? 10 : undefined,
    }}>
      <TripCard trip={trip} group={group} sortHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

// ── Droppable + Sortable trip list ────────────────────────────────────────────
function DroppableTripList({ children, isEmpty, sortableIds }: {
  children: React.ReactNode;
  isEmpty: boolean;
  sortableIds: string[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "sidebar-drop-zone",
    data: { isSidebar: true },
  });

  return (
    <div ref={setNodeRef}
      className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2 transition-all"
      style={{
        background: isOver ? "rgba(245,158,11,0.06)" : "transparent",
        outline: isOver ? "2px dashed rgba(245,158,11,0.5)" : "2px dashed transparent",
        outlineOffset: "-6px",
        borderRadius: "8px",
      }}>
      {isOver ? (
        <div className="flex flex-col items-center justify-center h-full gap-2 pointer-events-none">
          <span className="text-2xl">✈️</span>
          <p className="text-sm font-medium" style={{ color: "var(--accent)" }}>{TRIP_SIDEBAR.dropToUnschedule}</p>
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
          <span className="text-3xl">✈️</span>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {TRIP_SIDEBAR.emptyState}
          </p>
        </div>
      ) : (
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
      )}
    </div>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────
export default function TripSidebar() {
  const { trips, tripOrder, groups, categories, filters, addTrip } = useTripStore();

  const [showAddTrip, setShowAddTrip] = useState(false);

  // Add trip form
  const defaultGroup = groups.find((g) => g.isDefault) ?? groups[0];
  const [newTitle,           setNewTitle]           = useState("");
  const [newDest,            setNewDest]            = useState("");
  const [newGroupIdOverride, setNewGroupIdOverride] = useState<string | null>(null);
  const newGroupId = newGroupIdOverride ?? defaultGroup?.id ?? "";
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newDuration,   setNewDuration]   = useState<number>(1);
  const [newTagInput,   setNewTagInput]   = useState("");
  const [newTags,       setNewTags]       = useState<string[]>([]);
  const [dupError,      setDupError]      = useState("");

  const unscheduled = selectUnscheduledTrips(trips, tripOrder, filters);
  const sortableIds = unscheduled.map((t) => `sort-${t.id}`);
  const inferred    = inferContinent(newDest);

  const inputStyle = {
    background: "var(--surface-3)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
  };
  const selectStyle = (val: string) => ({
    ...inputStyle,
    color: val ? "var(--text-primary)" : "var(--text-muted)",
  });

  const handleAddTrip = () => {
    if (!newTitle.trim()) return;
    const isDup = trips.some((t) => t.title.toLowerCase() === newTitle.trim().toLowerCase());
    if (isDup) { setDupError(`A trip named "${newTitle.trim()}" already exists.`); return; }
    addTrip({
      id: uid(), title: newTitle.trim(), destination: newDest.trim(),
      continent: inferred, groupId: newGroupId,
      categoryId: newCategoryId || undefined,
      status: "unscheduled", durationWeeks: newDuration, tags: newTags,
    });
    setNewTitle(""); setNewDest(""); setNewDuration(1);
    setNewTags([]); setNewTagInput(""); setDupError("");
    setNewGroupIdOverride(null); setNewCategoryId("");
    setShowAddTrip(false);
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === ",") && newTagInput.trim()) {
      e.preventDefault();
      const tag = newTagInput.trim().toLowerCase();
      if (!newTags.includes(tag)) setNewTags([...newTags, tag]);
      setNewTagInput("");
    }
    if (e.key === "Backspace" && !newTagInput && newTags.length)
      setNewTags(newTags.slice(0, -1));
  };

  return (
    <aside style={{
      background: "var(--surface-1)",
      borderRight: "1px solid var(--border)",
      width: "280px", minWidth: "240px", maxWidth: "320px",
    }} className="flex flex-col h-full shrink-0">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          {TRIP_SIDEBAR.header}
          <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full"
            style={{ background: "var(--surface-3)", color: "var(--text-muted)" }}>
            {unscheduled.length}
          </span>
        </span>
        <button onClick={() => { setShowAddTrip(!showAddTrip); setDupError(""); }}
          className="p-1 rounded-md transition-colors"
          style={{ color: "var(--accent)" }} title="Add trip">
          <Plus size={16} />
        </button>
      </div>

      {/* ── Add Trip Form ── */}
      {showAddTrip && (
        <div className="px-4 py-3 shrink-0 flex flex-col gap-2"
          style={{ borderBottom: "1px solid var(--border-subtle)", background: "var(--surface-2)" }}>

          <input className="w-full text-sm rounded-md px-3 py-1.5 outline-none" style={inputStyle}
            placeholder={TRIP_SIDEBAR.formPlaceholders.tripName} value={newTitle}
            onChange={(e) => { setNewTitle(e.target.value); setDupError(""); }} />
          {dupError && <p className="text-xs" style={{ color: "#ef4444" }}>{dupError}</p>}

          <input className="w-full text-sm rounded-md px-3 py-1.5 outline-none" style={inputStyle}
            placeholder={TRIP_SIDEBAR.formPlaceholders.destination}
            value={newDest} onChange={(e) => setNewDest(e.target.value)} />
          {inferred && newDest && (
            <p className="text-xs px-1" style={{ color: "var(--text-muted)" }}>📍 {inferred}</p>
          )}

          <select className="w-full text-sm rounded-md px-2 py-1.5 outline-none" style={selectStyle(newCategoryId)}
            value={newCategoryId} onChange={(e) => setNewCategoryId(e.target.value)}>
            <option value="">None</option>
            {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>

          <div className="flex flex-wrap gap-1 rounded-md px-2 py-1.5 min-h-[34px]" style={inputStyle}>
            {newTags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                style={{ background: "var(--surface-1)", color: "var(--text-secondary)" }}>
                {tag}
                <button onClick={() => setNewTags(newTags.filter((t) => t !== tag))}><X size={9} /></button>
              </span>
            ))}
            <input className="flex-1 min-w-[80px] text-xs outline-none bg-transparent"
              style={{ color: "var(--text-primary)" }}
              placeholder={newTags.length === 0 ? TRIP_SIDEBAR.formPlaceholders.tags : ""}
              value={newTagInput} onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown} />
          </div>

          <div className="flex gap-2">
            <select className="flex-1 text-sm rounded-md px-2 py-1.5 outline-none" style={inputStyle}
              value={newGroupId} onChange={(e) => setNewGroupIdOverride(e.target.value)}>
              <option value="">None</option>
              {[...groups].sort((a, b) => a.name.localeCompare(b.name)).map((g) => (
                <option key={g.id} value={g.id}>{g.name}{g.isDefault ? " ★" : ""}</option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <input type="number" min={1} max={52}
                className="w-14 text-sm rounded-md px-2 py-1.5 outline-none text-center"
                style={inputStyle} value={newDuration}
                onChange={(e) => setNewDuration(Number(e.target.value))} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{TRIP_SIDEBAR.durationUnit}</span>
            </div>
          </div>

          <div className="flex gap-2 mt-1">
            <button onClick={handleAddTrip} className="flex-1 text-sm py-1.5 rounded-md font-medium"
              style={{ background: "var(--btn-primary)", color: "var(--btn-primary-text)" }}>{TRIP_SIDEBAR.addTripButton}</button>
            <button onClick={() => { setShowAddTrip(false); setDupError(""); }}
              className="px-3 text-sm py-1.5 rounded-md font-medium"
              style={{ background: "var(--surface-3)", color: "var(--text-secondary)" }}>{TRIP_SIDEBAR.cancelButton}</button>
          </div>
        </div>
      )}

      {/* ── Trip List ── */}
      <DroppableTripList isEmpty={unscheduled.length === 0} sortableIds={sortableIds}>
        {unscheduled.map((trip) => (
          <SortableTripCard key={trip.id} trip={trip}
            group={groups.find((g) => g.id === trip.groupId)} />
        ))}
      </DroppableTripList>
    </aside>
  );
}
