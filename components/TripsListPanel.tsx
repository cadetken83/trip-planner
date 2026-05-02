"use client";

import { useState, useMemo } from "react";
import { useTripStore, tripOverlapsBlackout } from "@/store/useTripStore";
import { Trip, TripStatus } from "@/types";
import TripEditModal from "@/components/TripEditModal";
import { inferContinent } from "@/utils/inferContinent";
import { MapPin, Clock, CalendarDays, BookOpen, Pencil, Check, Tag, X, Plus, AlertTriangle, Ban } from "lucide-react";

function uid() { return crypto.randomUUID(); }

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

// Completed is last so active trips stay at the top
const STATUS_ORDER: TripStatus[] = ["booked", "planning", "unscheduled", "completed"];

const STATUS_META: Record<TripStatus, { label: string; color: string; bg: string }> = {
  booked:      { label: "Booked",      color: "#10B981", bg: "#10B98120" },
  planning:    { label: "Planning",    color: "#d97706", bg: "#d9770620" },
  unscheduled: { label: "Unscheduled", color: "#78716c", bg: "#78716c20" },
  completed:   { label: "Completed",   color: "#6366F1", bg: "#6366F120" },
};

const STATUS_SECTION_LABELS: Record<TripStatus, string> = {
  booked:      "Booked",
  planning:    "In Planning",
  unscheduled: "Unscheduled",
  completed:   "Completed",
};

// Badge bg/text colors for overlay on images
const STATUS_BADGE_STYLE: Record<TripStatus, { bg: string; text: string }> = {
  booked:      { bg: "#10B981", text: "#fff" },
  planning:    { bg: "#f59e0b", text: "#1c1917" },
  unscheduled: { bg: "rgba(0,0,0,0.5)", text: "#fff" },
  completed:   { bg: "#6366F1", text: "#fff" },
};

function formatDateRange(trip: Trip): string {
  if (!trip.scheduled) return "";
  const { startMonth, startYear, endMonth, endYear } = trip.scheduled;
  if (startMonth === endMonth && startYear === endYear)
    return `${MONTH_NAMES[startMonth]} ${startYear}`;
  return `${MONTH_NAMES[startMonth]} ${startYear} – ${MONTH_NAMES[endMonth]} ${endYear}`;
}

function isBookByOverdue(trip: Trip): boolean {
  if (!trip.bookBy || trip.status === "booked" || trip.status === "completed") return false;
  const now = new Date();
  const limit = new Date(trip.bookBy.year, trip.bookBy.month, trip.bookBy.day ?? 1);
  return limit < now;
}

// ── Trip card ─────────────────────────────────────────────────────────────────

function TripCard({ trip }: { trip: Trip }) {
  const { groups, categories } = useTripStore();
  const blackoutDates = useTripStore((s) => s.blackoutDates);
  const [showEdit, setShowEdit] = useState(false);

  const group     = groups.find((g) => g.id === trip.groupId);
  const category  = categories.find((c) => c.id === trip.categoryId);
  const color        = group?.color ?? "#78716c";
  const sm           = STATUS_META[trip.status];
  const badge        = STATUS_BADGE_STYLE[trip.status];
  const dateStr      = formatDateRange(trip);
  const overdue      = isBookByOverdue(trip);
  const hasImage     = !!trip.imageUrl;
  const hasConflict  = tripOverlapsBlackout(trip, blackoutDates);

  // Placeholder gradient when no image
  const imageBg = hasImage
    ? `linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.55) 100%), url(${trip.imageUrl}) center/cover no-repeat`
    : `linear-gradient(135deg, ${color}33 0%, ${color}11 100%)`;

  return (
    <>
      <div
        className="rounded-xl overflow-hidden flex flex-col"
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border-subtle)",
          cursor: "pointer",
          transition: "box-shadow 0.15s, transform 0.15s",
        }}
        onClick={() => setShowEdit(true)}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${color}33`;
          (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
          (e.currentTarget as HTMLElement).style.transform = "none";
        }}
      >
        {/* Image / colour header */}
        <div
          style={{
            height: "160px",
            background: imageBg,
            position: "relative",
            flexShrink: 0,
          }}
        >
          {/* Status badge — top left */}
          <span
            className="absolute text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ top: "10px", left: "10px", background: badge.bg, color: badge.text, letterSpacing: "0.02em" }}
          >
            {sm.label}
          </span>

          {/* Book-by overdue badge — top right */}
          {overdue && (
            <span
              className="absolute flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
              style={{ top: "10px", right: "10px", background: "#ef4444", color: "#fff" }}
            >
              <AlertTriangle size={10} />
              Book overdue
            </span>
          )}

          {/* Title + destination overlaid at bottom of image */}
          <div
            className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-6"
            style={{
              background: hasImage
                ? "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)"
                : undefined,
            }}
          >
            <p
              className="font-bold text-base leading-tight truncate"
              style={{ color: hasImage ? "#fff" : "var(--text-primary)", textShadow: hasImage ? "0 1px 4px rgba(0,0,0,0.6)" : "none" }}
            >
              {trip.status === "booked" && <Check size={12} className="inline mr-1 mb-0.5" style={{ color: hasImage ? "#fff" : "#10B981" }} />}
              {trip.title}
            </p>
            {trip.destination && (
              <p
                className="flex items-center gap-1 text-xs mt-0.5 truncate"
                style={{ color: hasImage ? "rgba(255,255,255,0.85)" : "var(--text-secondary)" }}
              >
                <MapPin size={10} />
                {trip.destination}
              </p>
            )}
          </div>
        </div>

        {/* Card body */}
        <div className="px-3 py-3 flex flex-col gap-2 flex-1">

          {/* Date + duration */}
          {(dateStr || trip.durationWeeks) && (
            <div className="flex items-center justify-between gap-2">
              {dateStr && (
                <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                  <CalendarDays size={10} style={{ color: "var(--text-muted)" }} />
                  {dateStr}
                </span>
              )}
              {trip.durationWeeks && (
                <span className="flex items-center gap-1 text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                  <Clock size={10} />
                  ~{trip.durationWeeks}w
                </span>
              )}
            </div>
          )}

          {/* Book By */}
          {trip.bookBy && (
            <span
              className="flex items-center gap-1 text-xs font-medium"
              style={{ color: overdue ? "#ef4444" : "#d97706" }}
            >
              {overdue && <AlertTriangle size={10} />}
              Book by{trip.bookBy.day ? ` ${trip.bookBy.day}` : ""} {MONTH_NAMES[trip.bookBy.month]} {trip.bookBy.year}
            </span>
          )}

          {/* Blackout conflict */}
          {hasConflict && (
            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "#ef4444" }}>
              <Ban size={10} />
              Overlaps a blackout period
            </span>
          )}

          {/* Tags */}
          {trip.tags && trip.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 items-center">
              <Tag size={9} style={{ color: "var(--text-muted)" }} />
              {trip.tags.map((tag) => (
                <span key={tag} className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: "var(--surface-3)", color: "var(--text-muted)" }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Notes */}
          {trip.notes && (
            <p className="text-xs line-clamp-2" style={{ color: "var(--text-muted)" }}>
              <BookOpen size={9} className="inline mr-1 mb-0.5" />
              {trip.notes}
            </p>
          )}

          {/* Group + category footer */}
          <div className="flex items-center gap-2 mt-auto pt-1 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: `${color}22`, color }}>
              {group?.name ?? "No group"}
            </span>
            {category && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }} title={category.name}>
                {category.icon} {category.name}
              </span>
            )}
            <Pencil size={11} className="ml-auto" style={{ color: "var(--text-muted)", opacity: 0.4 }} />
          </div>
        </div>
      </div>

      {showEdit && <TripEditModal trip={trip} onClose={() => setShowEdit(false)} />}
    </>
  );
}

// ── Filter pill ───────────────────────────────────────────────────────────────

function Pill({ active, color, onClick, children }: {
  active: boolean; color: string; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2.5 py-1 rounded-full border transition-all text-xs shrink-0"
      style={{
        borderColor: active ? color : "var(--border)",
        background:  active ? `${color}22` : "transparent",
        color:       active ? color        : "var(--text-secondary)",
        fontWeight:  active ? 600          : 400,
      }}
    >
      {children}
    </button>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function TripsListPanel() {
  const { trips, groups, categories, filters: globalFilters, addTrip } = useTripStore();

  // ── Add trip form ──────────────────────────────────────────────────────────
  const defaultGroup = groups.find((g) => g.isDefault) ?? groups[0];
  const [showAddForm,   setShowAddForm]   = useState(false);
  const [newTitle,      setNewTitle]      = useState("");
  const [newDest,       setNewDest]       = useState("");
  const [newGroupId,    setNewGroupId]    = useState(defaultGroup?.id ?? "");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newDuration,   setNewDuration]   = useState(1);
  const [newTagInput,   setNewTagInput]   = useState("");
  const [newTags,       setNewTags]       = useState<string[]>([]);
  const [dupError,      setDupError]      = useState("");

  const handleAddTrip = () => {
    if (!newTitle.trim()) return;
    const isDup = trips.some((t) => t.title.toLowerCase() === newTitle.trim().toLowerCase());
    if (isDup) { setDupError(`"${newTitle.trim()}" already exists.`); return; }
    addTrip({
      id: uid(), title: newTitle.trim(), destination: newDest.trim(),
      continent: inferContinent(newDest.trim()),
      groupId: newGroupId || defaultGroup?.id || "",
      categoryId: newCategoryId || undefined,
      status: "unscheduled", durationWeeks: newDuration, tags: newTags,
    });
    setNewTitle(""); setNewDest(""); setNewDuration(1);
    setNewTags([]); setNewTagInput(""); setDupError("");
    setNewGroupId(defaultGroup?.id ?? ""); setNewCategoryId("");
    setShowAddForm(false);
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

  // ── Local filters ──────────────────────────────────────────────────────────
  const [statusFilter,   setStatusFilter]   = useState<TripStatus[]>([]);
  const [yearFilter,     setYearFilter]     = useState<number[]>([]);
  const [groupFilter,    setGroupFilter]    = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);

  const availableYears = useMemo(() => {
    const s = new Set<number>();
    trips.forEach((t) => {
      if (t.scheduled)
        for (let y = t.scheduled.startYear; y <= t.scheduled.endYear; y++) s.add(y);
    });
    return Array.from(s).sort();
  }, [trips]);

  const hasLocalFilters =
    statusFilter.length > 0 || yearFilter.length > 0 ||
    groupFilter.length > 0  || categoryFilter.length > 0;

  function toggle<T>(arr: T[], val: T, set: (n: T[]) => void) {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  // ── Filter + sort ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => trips.filter((t) => {
    const q = globalFilters.searchQuery?.toLowerCase().trim();
    if (q) {
      const match =
        t.title.toLowerCase().includes(q) ||
        (t.destination?.toLowerCase().includes(q) ?? false) ||
        (t.tags?.some((tag) => tag.toLowerCase().includes(q)) ?? false);
      if (!match) return false;
    }
    if (globalFilters.groupIds.length && !globalFilters.groupIds.includes(t.groupId)) return false;
    if (globalFilters.continents.length && t.continent && !globalFilters.continents.includes(t.continent)) return false;
    if (globalFilters.categoryIds.length && (!t.categoryId || !globalFilters.categoryIds.includes(t.categoryId))) return false;
    if (statusFilter.length && !statusFilter.includes(t.status)) return false;
    if (groupFilter.length && !groupFilter.includes(t.groupId)) return false;
    if (categoryFilter.length && (!t.categoryId || !categoryFilter.includes(t.categoryId))) return false;
    if (yearFilter.length) {
      if (!t.scheduled) return false;
      if (!yearFilter.some((y) => y >= t.scheduled!.startYear && y <= t.scheduled!.endYear)) return false;
    }
    return true;
  }), [trips, globalFilters, statusFilter, yearFilter, groupFilter, categoryFilter]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const ao = STATUS_ORDER.indexOf(a.status);
    const bo = STATUS_ORDER.indexOf(b.status);
    if (ao !== bo) return ao - bo;
    if (a.scheduled && b.scheduled) {
      return (a.scheduled.startYear * 12 + a.scheduled.startMonth) -
             (b.scheduled.startYear * 12 + b.scheduled.startMonth);
    }
    return a.title.localeCompare(b.title);
  }), [filtered]);

  const sections = STATUS_ORDER
    .map((status) => ({ status, trips: sorted.filter((t) => t.status === status) }))
    .filter((s) => s.trips.length > 0);

  const inputStyle = {
    background: "var(--surface-3)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
  };
  const selectStyle = (val: string) => ({
    ...inputStyle,
    color: val ? "var(--text-primary)" : "var(--text-muted)",
  });

  return (
    <main className="flex-1 overflow-y-auto px-6 py-5">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-display text-xl" style={{ color: "var(--text-secondary)" }}>All Trips</h2>
          <span className="text-xs px-2 py-0.5 rounded-md"
            style={{ background: "var(--surface-2)", color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }}>
            {filtered.length} / {trips.length}
          </span>
          <button
            onClick={() => { setShowAddForm((p) => !p); setDupError(""); }}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-85"
            style={{ background: "#f59e0b", color: "#1c1917" }}
          >
            <Plus size={14} />
            Add Trip
          </button>
        </div>

        {/* ── Add trip form ── */}
        {showAddForm && (
          <div className="rounded-xl px-5 py-4 mb-5 flex flex-col gap-3"
            style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)", letterSpacing: "0.07em" }}>
              New Trip
            </p>
            <div className="flex flex-col gap-1">
              <input className="w-full text-sm rounded-md px-3 py-2 outline-none" style={inputStyle}
                placeholder="Trip name *" value={newTitle} autoFocus
                onChange={(e) => { setNewTitle(e.target.value); setDupError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleAddTrip()} />
              {dupError && <p className="text-xs" style={{ color: "#ef4444" }}>{dupError}</p>}
            </div>
            <div className="flex flex-col gap-1">
              <input className="w-full text-sm rounded-md px-3 py-2 outline-none" style={inputStyle}
                placeholder="Destination (optional)" value={newDest}
                onChange={(e) => setNewDest(e.target.value)} />
              {inferContinent(newDest) && newDest && (
                <p className="text-xs px-1" style={{ color: "var(--text-muted)" }}>📍 {inferContinent(newDest)}</p>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <select className="flex-1 text-sm rounded-md px-2 py-2 outline-none min-w-[120px]" style={inputStyle}
                value={newGroupId} onChange={(e) => setNewGroupId(e.target.value)}>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}{g.isDefault ? " ★" : ""}</option>)}
              </select>
              <select className="flex-1 text-sm rounded-md px-2 py-2 outline-none min-w-[120px]" style={selectStyle(newCategoryId)}
                value={newCategoryId} onChange={(e) => setNewCategoryId(e.target.value)}>
                <option value="">Trip type (optional)</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              <div className="flex items-center gap-1.5">
                <input type="number" min={1} max={52}
                  className="w-16 text-sm rounded-md px-2 py-2 outline-none text-center" style={inputStyle}
                  value={newDuration} onChange={(e) => setNewDuration(Number(e.target.value))} />
                <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>wks</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 rounded-md px-3 py-2 min-h-[38px]" style={inputStyle}>
              {newTags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "var(--surface-1)", color: "var(--text-secondary)" }}>
                  {tag}
                  <button onClick={() => setNewTags(newTags.filter((t) => t !== tag))}><X size={9} /></button>
                </span>
              ))}
              <input className="flex-1 min-w-[100px] text-sm outline-none bg-transparent"
                style={{ color: "var(--text-primary)" }}
                placeholder={newTags.length === 0 ? "Tags — press Enter to add" : ""}
                value={newTagInput} onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowAddForm(false); setNewTitle(""); setNewDest(""); setNewTags([]); setNewTagInput(""); setDupError(""); }}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "var(--surface-3)", color: "var(--text-secondary)" }}>Cancel</button>
              <button onClick={handleAddTrip}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: "var(--btn-primary)", color: "var(--btn-primary-text)" }}>Add Trip</button>
            </div>
          </div>
        )}

        {/* ── Local filters ── */}
        <div className="rounded-xl px-4 py-3 mb-5 flex flex-col gap-2.5"
          style={{ background: "var(--surface-1)", border: "1px solid var(--border-subtle)" }}>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold uppercase tracking-wide shrink-0"
              style={{ color: "var(--text-muted)", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>Status</span>
            {STATUS_ORDER.map((s) => (
              <Pill key={s} active={statusFilter.includes(s)} color={STATUS_META[s].color}
                onClick={() => toggle(statusFilter, s, setStatusFilter)}>
                {STATUS_META[s].label}
              </Pill>
            ))}
          </div>

          {groups.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wide shrink-0"
                style={{ color: "var(--text-muted)", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>Travel Group</span>
              {groups.map((g) => (
                <Pill key={g.id} active={groupFilter.includes(g.id)} color={g.color}
                  onClick={() => toggle(groupFilter, g.id, setGroupFilter)}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: g.color }} />
                  {g.name}
                </Pill>
              ))}
            </div>
          )}

          {categories.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wide shrink-0"
                style={{ color: "var(--text-muted)", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>Travel Type</span>
              {categories.map((c) => (
                <Pill key={c.id} active={categoryFilter.includes(c.id)} color="var(--accent)"
                  onClick={() => toggle(categoryFilter, c.id, setCategoryFilter)}>
                  {c.icon} {c.name}
                </Pill>
              ))}
            </div>
          )}

          {availableYears.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-wide shrink-0"
                style={{ color: "var(--text-muted)", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>Year</span>
              {availableYears.map((y) => (
                <Pill key={y} active={yearFilter.includes(y)} color="var(--accent)"
                  onClick={() => toggle(yearFilter, y, setYearFilter)}>
                  {y}
                </Pill>
              ))}
            </div>
          )}

          {hasLocalFilters && (
            <div className="flex justify-end">
              <button
                onClick={() => { setStatusFilter([]); setYearFilter([]); setGroupFilter([]); setCategoryFilter([]); }}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all"
                style={{ borderColor: "#ef4444", background: "#ef4444", color: "#fff", fontWeight: 600 }}>
                <X size={10} /> Clear filters
              </button>
            </div>
          )}
        </div>

        {/* ── Trip grid ── */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
            <span className="text-3xl">✈️</span>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {hasLocalFilters ? "No trips match the current filters." : "No trips yet. Add one above."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {sections.map(({ status, trips: sectionTrips }) => {
              const sm = STATUS_META[status];
              return (
                <section key={status}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: sm.color, letterSpacing: "0.07em" }}>
                      {STATUS_SECTION_LABELS[status]}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full"
                      style={{ background: sm.bg, color: sm.color }}>{sectionTrips.length}</span>
                    <div className="flex-1 h-px ml-1" style={{ background: "var(--border-subtle)" }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                    {sectionTrips.map((trip) => <TripCard key={trip.id} trip={trip} />)}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
