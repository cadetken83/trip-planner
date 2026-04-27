"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTripStore, selectUnscheduledTrips } from "@/store/useTripStore";
import TripCard from "@/components/TripCard";
import {
  Plus, Users, ChevronDown, ChevronRight, Trash2,
  Star, Pencil, Check, X, Tag,
} from "lucide-react";
import { Trip } from "@/types";
import { inferContinent } from "@/utils/inferContinent";

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
          <p className="text-sm font-medium" style={{ color: "var(--accent)" }}>Drop to unschedule</p>
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
          <span className="text-3xl">✈️</span>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No unscheduled trips. Add one above or drag a trip back from the calendar.
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

// ── Reusable accordion section header ─────────────────────────────────────────
function AccordionHeader({
  icon, label, open, onToggle,
}: {
  icon: React.ReactNode;
  label: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors"
      style={{
        color: "var(--text-secondary)",
        borderTop: "1px solid var(--border)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-3)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {icon}
      <span>{label}</span>
      {open
        ? <ChevronDown size={12} className="ml-auto" />
        : <ChevronRight size={12} className="ml-auto" />}
    </button>
  );
}

// ── Main sidebar ──────────────────────────────────────────────────────────────
export default function TripSidebar() {
  const {
    trips, tripOrder, groups, categories, filters,
    addTrip, reorderTrips,
    addGroup, updateGroup, removeGroup, setDefaultGroup,
    addCategory, updateCategory, removeCategory,
  } = useTripStore();

  const [showAddTrip,    setShowAddTrip]    = useState(false);
  const [showGroups,     setShowGroups]     = useState(false);
  const [showCategories, setShowCategories] = useState(false);

  // Add trip form
  const defaultGroup = groups.find((g) => g.isDefault) ?? groups[0];
  const [newTitle,           setNewTitle]           = useState("");
  const [newDest,            setNewDest]            = useState("");
  const [newGroupIdOverride, setNewGroupIdOverride] = useState<string | null>(null);
  const newGroupId = newGroupIdOverride ?? defaultGroup?.id ?? "";
  const [newCategoryId,  setNewCategoryId]  = useState("");
  const [newDuration,    setNewDuration]    = useState<number>(1);
  const [newTagInput,    setNewTagInput]    = useState("");
  const [newTags,        setNewTags]        = useState<string[]>([]);
  const [dupError,       setDupError]       = useState("");

  // Group editing state
  const [editingGroupId,   setEditingGroupId]   = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [newGroupName,     setNewGroupName]     = useState("");
  const [groupDupError,    setGroupDupError]    = useState("");
  const [deleteGroupId,    setDeleteGroupId]    = useState<string | null>(null);

  // Category editing state
  const [editingCatId,   setEditingCatId]   = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [editingCatIcon, setEditingCatIcon] = useState("");
  const [newCatName,     setNewCatName]     = useState("");
  const [newCatIcon,     setNewCatIcon]     = useState("🌍");
  const [catDupError,    setCatDupError]    = useState("");
  const [deleteCatId,    setDeleteCatId]    = useState<string | null>(null);

  const unscheduled  = selectUnscheduledTrips(trips, tripOrder, filters);
  const sortableIds  = unscheduled.map((t) => `sort-${t.id}`);
  const inferred     = inferContinent(newDest);

  const inputStyle = {
    background: "var(--surface-3)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
  };

  // ── Add trip ──────────────────────────────────────────────────────────────
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

  // ── Group actions ─────────────────────────────────────────────────────────
  const cancelGroupEdit = () => {
    setEditingGroupId(null); setEditingGroupName(""); setGroupDupError("");
  };

  const handleAddGroup = () => {
    if (!newGroupName.trim()) return;
    const isDup = groups.some((g) => g.name.toLowerCase() === newGroupName.trim().toLowerCase());
    if (isDup) { setGroupDupError("A group with that name already exists."); return; }
    addGroup({ id: uid(), name: newGroupName.trim() });
    setNewGroupName(""); setGroupDupError("");
  };

  const handleSaveGroupName = (id: string) => {
    if (!editingGroupName.trim()) { cancelGroupEdit(); return; }
    const isDup = groups.some((g) => g.id !== id && g.name.toLowerCase() === editingGroupName.trim().toLowerCase());
    if (isDup) { setGroupDupError("That name is already used."); return; }
    updateGroup(id, { name: editingGroupName.trim() });
    cancelGroupEdit();
  };

  const handleDeleteGroup = (id: string) => {
    const group = groups.find((g) => g.id === id);
    if (!group) return;
    if (group.isDefault) {
      alert("This is the default group. Set another group as default before deleting.");
      return;
    }
    const hasTrips = trips.some((t) => t.groupId === id);
    if (hasTrips && deleteGroupId !== id) { setDeleteGroupId(id); return; }
    removeGroup(id); setDeleteGroupId(null);
  };

  // ── Category actions ──────────────────────────────────────────────────────
  const cancelCatEdit = () => {
    setEditingCatId(null); setEditingCatName(""); setEditingCatIcon(""); setCatDupError("");
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const isDup = categories.some((c) => c.name.toLowerCase() === newCatName.trim().toLowerCase());
    if (isDup) { setCatDupError("A category with that name already exists."); return; }
    addCategory({ id: uid(), name: newCatName.trim(), icon: newCatIcon });
    setNewCatName(""); setNewCatIcon("🌍"); setCatDupError("");
  };

  const handleSaveCatName = (id: string) => {
    if (!editingCatName.trim()) { cancelCatEdit(); return; }
    const isDup = categories.some((c) => c.id !== id && c.name.toLowerCase() === editingCatName.trim().toLowerCase());
    if (isDup) { setCatDupError("That name is already used."); return; }
    updateCategory(id, { name: editingCatName.trim(), icon: editingCatIcon });
    cancelCatEdit();
  };

  const handleDeleteCategory = (id: string) => {
    const hasTrips = trips.some((t) => t.categoryId === id);
    if (hasTrips && deleteCatId !== id) { setDeleteCatId(id); return; }
    removeCategory(id); setDeleteCatId(null);
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
          Unscheduled Trips
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
            placeholder="Trip name *" value={newTitle}
            onChange={(e) => { setNewTitle(e.target.value); setDupError(""); }} />
          {dupError && <p className="text-xs" style={{ color: "#ef4444" }}>{dupError}</p>}

          <input className="w-full text-sm rounded-md px-3 py-1.5 outline-none" style={inputStyle}
            placeholder="Destination (city, country optional)"
            value={newDest} onChange={(e) => setNewDest(e.target.value)} />
          {inferred && newDest && (
            <p className="text-xs px-1" style={{ color: "var(--text-muted)" }}>📍 {inferred}</p>
          )}

          <select className="w-full text-sm rounded-md px-2 py-1.5 outline-none" style={inputStyle}
            value={newCategoryId} onChange={(e) => setNewCategoryId(e.target.value)}>
            <option value="">Trip type (optional)</option>
            {categories.map((c) => (
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
              placeholder={newTags.length === 0 ? "Tags (Enter to add)" : ""}
              value={newTagInput} onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown} />
          </div>

          <div className="flex gap-2">
            <select className="flex-1 text-sm rounded-md px-2 py-1.5 outline-none" style={inputStyle}
              value={newGroupId} onChange={(e) => setNewGroupIdOverride(e.target.value)}>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}{g.isDefault ? " ★" : ""}</option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <input type="number" min={1} max={52}
                className="w-14 text-sm rounded-md px-2 py-1.5 outline-none text-center"
                style={inputStyle} value={newDuration}
                onChange={(e) => setNewDuration(Number(e.target.value))} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>wks</span>
            </div>
          </div>

          <div className="flex gap-2 mt-1">
            <button onClick={handleAddTrip} className="flex-1 text-sm py-1.5 rounded-md font-medium"
              style={{ background: "var(--accent)", color: "#1c1917" }}>Add Trip</button>
            <button onClick={() => { setShowAddTrip(false); setDupError(""); }}
              className="px-3 text-sm py-1.5 rounded-md font-medium"
              style={{ background: "var(--surface-3)", color: "var(--text-secondary)" }}>Cancel</button>
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

      {/* ══ Travel Groups section ══════════════════════════════════════════════ */}
      <div className="shrink-0">
        <AccordionHeader
          icon={<Users size={14} />}
          label="Travel Groups"
          open={showGroups}
          onToggle={() => setShowGroups(!showGroups)}
        />

        {showGroups && (
          <div className="px-4 pb-4 flex flex-col gap-2"
            style={{ background: "var(--surface-2)", borderTop: "1px solid var(--border-subtle)" }}>

            {groups.map((g) => {
              const isEditing  = editingGroupId === g.id;
              const confirming = deleteGroupId === g.id;
              const tripCount  = trips.filter((t) => t.groupId === g.id).length;

              return (
                <div key={g.id} className="flex flex-col gap-1 pt-2">
                  <div className="flex items-center gap-2">
                    <input type="color" value={g.color}
                      onChange={(e) => updateGroup(g.id, { color: e.target.value })}
                      className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent shrink-0"
                      title="Change color" />

                    {isEditing ? (
                      <input className="flex-1 text-sm rounded px-2 py-0.5 outline-none" style={inputStyle}
                        value={editingGroupName}
                        onChange={(e) => { setEditingGroupName(e.target.value); setGroupDupError(""); }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveGroupName(g.id);
                          if (e.key === "Escape") cancelGroupEdit();
                        }}
                        onBlur={() => setTimeout(cancelGroupEdit, 150)}
                        autoFocus />
                    ) : (
                      <span className="text-sm flex-1 truncate" style={{ color: "var(--text-secondary)" }}>
                        {g.name}
                        {g.isDefault && <span className="ml-1 text-xs" style={{ color: "var(--accent)" }}>★</span>}
                        {tripCount > 0 && <span className="ml-1 text-xs" style={{ color: "var(--text-muted)" }}>({tripCount})</span>}
                      </span>
                    )}

                    {isEditing ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSaveGroupName(g.id)}
                          className="w-6 h-6 rounded flex items-center justify-center"
                          style={{ background: "#10B98122", color: "#10B981" }}>
                          <Check size={12} />
                        </button>
                        <button onMouseDown={(e) => e.preventDefault()}
                          onClick={cancelGroupEdit}
                          className="w-6 h-6 rounded flex items-center justify-center"
                          style={{ background: "var(--surface-3)", color: "var(--text-muted)" }}>
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => setDefaultGroup(g.id)}
                          className="w-6 h-6 rounded flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
                          style={{ color: g.isDefault ? "var(--accent)" : "var(--text-muted)" }}
                          title={g.isDefault ? "Default group" : "Set as default"}>
                          <Star size={11} fill={g.isDefault ? "currentColor" : "none"} />
                        </button>
                        <button onClick={() => { setEditingGroupId(g.id); setEditingGroupName(g.name); setGroupDupError(""); }}
                          className="w-6 h-6 rounded flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
                          style={{ color: "var(--text-muted)" }} title="Rename">
                          <Pencil size={11} />
                        </button>
                        <button onClick={() => handleDeleteGroup(g.id)}
                          className="w-6 h-6 rounded flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
                          style={{ color: "var(--text-muted)" }} title="Delete">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing && groupDupError && (
                    <p className="text-xs pl-7" style={{ color: "#ef4444" }}>{groupDupError}</p>
                  )}
                  {confirming && (
                    <div className="flex items-center gap-2 pl-7">
                      <span className="text-xs" style={{ color: "#ef4444" }}>
                        {tripCount} trip{tripCount !== 1 ? "s" : ""} assigned. Delete?
                      </span>
                      <button onClick={() => { removeGroup(g.id); setDeleteGroupId(null); }}
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ background: "#ef4444", color: "#fff" }}>Yes</button>
                      <button onClick={() => setDeleteGroupId(null)}
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ background: "var(--surface-3)", color: "var(--text-muted)" }}>No</button>
                    </div>
                  )}
                </div>
              );
            })}

            {!editingGroupId && groupDupError && (
              <p className="text-xs" style={{ color: "#ef4444" }}>{groupDupError}</p>
            )}

            {/* Add new group */}
            <div className="flex gap-2 mt-2 pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <input className="flex-1 text-sm rounded-md px-2 py-1 outline-none" style={inputStyle}
                placeholder="New group name" value={newGroupName}
                onChange={(e) => { setNewGroupName(e.target.value); setGroupDupError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleAddGroup()} />
              <button onClick={handleAddGroup} className="p-2 rounded-md"
                style={{ background: "var(--surface-3)", color: "var(--accent)" }}>
                <Plus size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══ Trip Types section ═════════════════════════════════════════════════ */}
      <div className="shrink-0">
        <AccordionHeader
          icon={<Tag size={14} />}
          label="Trip Types"
          open={showCategories}
          onToggle={() => setShowCategories(!showCategories)}
        />

        {showCategories && (
          <div className="px-4 pb-4 flex flex-col gap-2"
            style={{ background: "var(--surface-2)", borderTop: "1px solid var(--border-subtle)" }}>

            {categories.map((c) => {
              const isEditing  = editingCatId === c.id;
              const confirming = deleteCatId === c.id;
              const tripCount  = trips.filter((t) => t.categoryId === c.id).length;

              return (
                <div key={c.id} className="flex flex-col gap-1 pt-2">
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <input className="w-8 text-center text-sm rounded px-1 py-0.5 outline-none" style={inputStyle}
                        value={editingCatIcon} onChange={(e) => setEditingCatIcon(e.target.value)}
                        maxLength={2} />
                    ) : (
                      <span className="text-base w-5 shrink-0 text-center">{c.icon}</span>
                    )}

                    {isEditing ? (
                      <input className="flex-1 text-sm rounded px-2 py-0.5 outline-none" style={inputStyle}
                        value={editingCatName}
                        onChange={(e) => { setEditingCatName(e.target.value); setCatDupError(""); }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveCatName(c.id);
                          if (e.key === "Escape") cancelCatEdit();
                        }}
                        onBlur={() => setTimeout(cancelCatEdit, 150)}
                        autoFocus />
                    ) : (
                      <span className="text-sm flex-1 truncate" style={{ color: "var(--text-secondary)" }}>
                        {c.name}
                        {tripCount > 0 && <span className="ml-1 text-xs" style={{ color: "var(--text-muted)" }}>({tripCount})</span>}
                      </span>
                    )}

                    {isEditing ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSaveCatName(c.id)}
                          className="w-6 h-6 rounded flex items-center justify-center"
                          style={{ background: "#10B98122", color: "#10B981" }}>
                          <Check size={12} />
                        </button>
                        <button onMouseDown={(e) => e.preventDefault()}
                          onClick={cancelCatEdit}
                          className="w-6 h-6 rounded flex items-center justify-center"
                          style={{ background: "var(--surface-3)", color: "var(--text-muted)" }}>
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => { setEditingCatId(c.id); setEditingCatName(c.name); setEditingCatIcon(c.icon); setCatDupError(""); }}
                          className="w-6 h-6 rounded flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
                          style={{ color: "var(--text-muted)" }} title="Edit">
                          <Pencil size={11} />
                        </button>
                        <button onClick={() => handleDeleteCategory(c.id)}
                          className="w-6 h-6 rounded flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
                          style={{ color: "var(--text-muted)" }} title="Delete">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing && catDupError && (
                    <p className="text-xs pl-7" style={{ color: "#ef4444" }}>{catDupError}</p>
                  )}
                  {confirming && (
                    <div className="flex items-center gap-2 pl-7">
                      <span className="text-xs" style={{ color: "#ef4444" }}>
                        {tripCount} trip{tripCount !== 1 ? "s" : ""} assigned. Delete?
                      </span>
                      <button onClick={() => { removeCategory(c.id); setDeleteCatId(null); }}
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ background: "#ef4444", color: "#fff" }}>Yes</button>
                      <button onClick={() => setDeleteCatId(null)}
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ background: "var(--surface-3)", color: "var(--text-muted)" }}>No</button>
                    </div>
                  )}
                </div>
              );
            })}

            {catDupError && !editingCatId && (
              <p className="text-xs" style={{ color: "#ef4444" }}>{catDupError}</p>
            )}

            {/* Add new category */}
            <div className="flex gap-2 mt-2 pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
              <input className="w-10 text-center text-sm rounded-md px-1 py-1 outline-none" style={inputStyle}
                value={newCatIcon} onChange={(e) => setNewCatIcon(e.target.value)}
                maxLength={2} title="Emoji icon" />
              <input className="flex-1 text-sm rounded-md px-2 py-1 outline-none" style={inputStyle}
                placeholder="New type name" value={newCatName}
                onChange={(e) => { setNewCatName(e.target.value); setCatDupError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleAddCategory()} />
              <button onClick={handleAddCategory} className="p-2 rounded-md"
                style={{ background: "var(--surface-3)", color: "var(--accent)" }}>
                <Plus size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
