"use client";

import { useTripStore } from "@/store/useTripStore";
import { Continent, TripStatus } from "@/types";
import { Search, X } from "lucide-react";

const CONTINENTS: Continent[] = [
  "North America","South America","Europe",
  "Africa","Asia","Oceania","Antarctica",
];

const STATUS_FILTERS: { value: TripStatus; label: string; color: string }[] = [
  { value: "planning", label: "Planning", color: "#94a3b8" }, // slate — visible in both themes
  { value: "booked",   label: "Booked",   color: "#10B981" }, // emerald
];

export default function FilterBar() {
  const {
    groups, categories, filters,
    setGroupFilter, setContinentFilter, setStatusFilter,
    setCategoryFilter, setSearchQuery, clearFilters,
  } = useTripStore();

  const hasActiveFilters =
    filters.searchQuery.length > 0 ||
    filters.groupIds.length > 0 ||
    filters.continents.length > 0 ||
    filters.statuses.length > 0 ||
    filters.categoryIds.length > 0;

  const toggle = <T extends string>(
    current: T[], value: T, setter: (next: T[]) => void
  ) => {
    setter(current.includes(value)
      ? current.filter((x) => x !== value)
      : [...current, value]);
  };

  const pill = (
    active: boolean,
    color: string,
    onClick: () => void,
    label: React.ReactNode,
    key: string
  ) => (
    <button key={key} onClick={onClick}
      className="flex items-center gap-1 px-2.5 py-1 rounded-full border transition-all text-xs shrink-0"
      style={{
        borderColor: active ? color : "var(--border)",
        background:  active ? `${color}25` : "transparent",
        color:       active ? color : "var(--text-secondary)",
        fontWeight:  active ? 600 : 400,
      }}>
      {label}
    </button>
  );

  // Section label style — secondary not muted, uppercase for clarity
  const labelStyle: React.CSSProperties = {
    color: "var(--text-secondary)",
    fontWeight: 600,
    fontSize: "0.65rem",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  };

  return (
    <div
      style={{ background: "var(--surface-1)", borderBottom: "1px solid var(--border)" }}
      className="flex flex-col px-4 py-2 text-xs shrink-0 gap-1.5"
    >
      {/* Row 1: Search + Travel Groups + Status + Show Completed + Clear */}
      <div className="flex items-center gap-3 overflow-x-auto">

        {/* Search */}
        <div className="flex items-center gap-1.5 shrink-0 rounded-full px-2.5 py-1 border"
          style={{ background: "var(--surface-2)", borderColor: filters.searchQuery ? "var(--accent)" : "var(--border)" }}>
          <Search size={11} style={{ color: filters.searchQuery ? "var(--accent)" : "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search trips…"
            value={filters.searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="outline-none bg-transparent text-xs w-44"
            style={{ color: "var(--text-primary)" }}
          />
          {filters.searchQuery && (
            <button onClick={() => setSearchQuery("")} style={{ color: "var(--text-muted)", lineHeight: 0 }}>
              <X size={10} />
            </button>
          )}
        </div>

        <div className="w-px h-4 shrink-0" style={{ background: "var(--border)" }} />

        {groups.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span style={labelStyle}>Travel Group</span>
            {groups.map((g) => pill(
              filters.groupIds.includes(g.id), g.color,
              () => toggle(filters.groupIds, g.id, setGroupFilter),
              <><span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: g.color }} />{g.name}</>,
              g.id
            ))}
          </div>
        )}

        <div className="w-px h-4 shrink-0" style={{ background: "var(--border)" }} />

        <div className="flex items-center gap-1.5 shrink-0">
          <span style={labelStyle}>Status</span>
          {STATUS_FILTERS.map(({ value, label, color }) => pill(
            filters.statuses.includes(value), color,
            () => toggle(filters.statuses, value, setStatusFilter as any),
            label, value
          ))}
        </div>

        {/* Clear Filters — always visible, dims but never invisible */}
        <button
          onClick={clearFilters}
          disabled={!hasActiveFilters}
          className="flex items-center gap-1.5 ml-auto shrink-0 px-2.5 py-1 rounded-full border transition-all text-xs"
          style={{
            borderColor: "#ef4444",
            background:  hasActiveFilters ? "#ef4444" : "transparent",
            color:       hasActiveFilters ? "#fff"    : "#ef4444",
            opacity:     hasActiveFilters ? 1 : 0.4,
            cursor:      hasActiveFilters ? "pointer" : "default",
            fontWeight:  600,
          }}>
          <X size={11} />
          Clear Filters
        </button>
      </div>

      {/* Row 2: Trip Types + Regions */}
      <div className="flex items-center gap-3 overflow-x-auto">

        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span style={labelStyle}>Travel Type</span>
            {categories.map((c) => pill(
              filters.categoryIds.includes(c.id), "var(--accent)",
              () => toggle(filters.categoryIds, c.id, setCategoryFilter),
              <>{c.icon} {c.name}</>,
              c.id
            ))}
          </div>
        )}

        <div className="w-px h-4 shrink-0" style={{ background: "var(--border)" }} />

        <div className="flex items-center gap-1.5 shrink-0">
          <span style={labelStyle}>Region</span>
          {CONTINENTS.map((c) => pill(
            filters.continents.includes(c), "var(--accent)",
            () => toggle(filters.continents, c, setContinentFilter as any),
            c, c
          ))}
        </div>
      </div>
    </div>
  );
}
