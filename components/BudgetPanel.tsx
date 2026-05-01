"use client";

import { useState } from "react";
import { useTripStore, tripOverlapsBlackout } from "@/store/useTripStore";
import { Trip, BlackoutDate } from "@/types";
import { AlertTriangle, Ban, Check, Monitor, Pencil, Plus, Trash2, Wallet, X } from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── Constants ──────────────────────────────────────────────────────────────────

const CURRENCIES = [
  { code: "USD", label: "US Dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British Pound" },
  { code: "CAD", label: "Canadian Dollar" },
  { code: "AUD", label: "Australian Dollar" },
  { code: "JPY", label: "Japanese Yen" },
  { code: "CHF", label: "Swiss Franc" },
  { code: "NZD", label: "New Zealand Dollar" },
  { code: "SGD", label: "Singapore Dollar" },
  { code: "MXN", label: "Mexican Peso" },
  { code: "BRL", label: "Brazilian Real" },
  { code: "ZAR", label: "South African Rand" },
  { code: "INR", label: "Indian Rupee" },
  { code: "THB", label: "Thai Baht" },
  { code: "HKD", label: "Hong Kong Dollar" },
  { code: "KRW", label: "South Korean Won" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency", currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function yearBudgetStats(trips: Trip[], year: number) {
  const relevant = trips.filter(
    (t) => t.scheduled?.startYear === year && t.estimatedCost
  );
  const spent = relevant
    .filter((t) => t.status === "completed")
    .reduce((s, t) => s + (t.estimatedCost ?? 0), 0);
  const committed = relevant
    .filter((t) => t.status === "planning" || t.status === "booked")
    .reduce((s, t) => s + (t.estimatedCost ?? 0), 0);
  return { spent, committed, total: spent + committed };
}

// ── Inline editable cell ───────────────────────────────────────────────────────
function AllocationInput({
  year, value, currency, onChange,
}: {
  year: number; value: number; currency: string;
  onChange: (year: number, amount: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState("");

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        min={0}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={() => {
          const n = parseFloat(raw);
          onChange(year, isNaN(n) ? 0 : Math.max(0, n));
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") (e.target as HTMLInputElement).blur();
        }}
        style={{
          width: "120px", padding: "3px 8px", borderRadius: "6px", fontSize: "13px",
          background: "var(--surface-3)", color: "var(--text-primary)",
          border: "1px solid var(--accent)", outline: "none",
        }}
      />
    );
  }
  return (
    <button
      onClick={() => { setRaw(value > 0 ? String(value) : ""); setEditing(true); }}
      style={{
        fontSize: "13px", color: value > 0 ? "var(--text-primary)" : "var(--text-muted)",
        background: "var(--surface-3)", border: "1px dashed var(--border)",
        borderRadius: "6px", padding: "3px 10px", cursor: "text", minWidth: "120px",
        textAlign: "right",
      }}
    >
      {value > 0 ? fmt(value, currency) : "Set allocation"}
    </button>
  );
}

// ── Segmented toggle ───────────────────────────────────────────────────────────
function SegmentedToggle({ value, options, onChange }: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex rounded-lg shrink-0"
      style={{ border: "1px solid var(--border)", background: "var(--surface-3)", overflow: "hidden" }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className="px-4 py-1.5 text-xs font-medium transition-colors"
          style={{
            background: value === opt.value ? "var(--btn-primary)" : "transparent",
            color: value === opt.value ? "var(--btn-primary-text)" : "var(--text-muted)",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── BudgetPanel ───────────────────────────────────────────────────────────────
type PendingAllocation = { year: number; amount: number; newTotalAllocated: number };

export default function BudgetPanel() {
  const { trips, budget, setBudget, setAnnualAllocation, blackoutDates, addBlackoutDate, updateBlackoutDate, removeBlackoutDate, theme, toggleTheme, defaultView, setDefaultView } = useTripStore();
  const { currency, totalBudget, annualAllocations } = budget;

  const now = new Date();
  const currentYear = now.getFullYear();

  // Local state for the total budget input (formatted on display, raw while editing)
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalRaw, setTotalRaw] = useState("");
  const [totalError, setTotalError] = useState("");

  // Pending over-allocation prompt
  const [pendingAlloc, setPendingAlloc] = useState<PendingAllocation | null>(null);

  // Blackout date add form
  const [bdLabel,      setBdLabel]      = useState("");
  const [bdStartMonth, setBdStartMonth] = useState(1);
  const [bdStartYear,  setBdStartYear]  = useState(currentYear);
  const [bdEndMonth,   setBdEndMonth]   = useState(1);
  const [bdEndYear,    setBdEndYear]    = useState(currentYear);
  const [bdError,      setBdError]      = useState("");

  // Blackout conflict feedback (trips affected by a newly added/edited blackout)
  const [bdConflicts, setBdConflicts] = useState<Trip[]>([]);

  // Blackout date inline editing
  const [editBdId,         setEditBdId]         = useState<string | null>(null);
  const [editBdLabel,      setEditBdLabel]      = useState("");
  const [editBdStartMonth, setEditBdStartMonth] = useState(1);
  const [editBdStartYear,  setEditBdStartYear]  = useState(currentYear);
  const [editBdEndMonth,   setEditBdEndMonth]   = useState(1);
  const [editBdEndYear,    setEditBdEndYear]    = useState(currentYear);
  const [editBdError,      setEditBdError]      = useState("");

  function startEditBd(b: BlackoutDate) {
    setEditBdId(b.id);
    setEditBdLabel(b.label);
    setEditBdStartMonth(b.startMonth);
    setEditBdStartYear(b.startYear);
    setEditBdEndMonth(b.endMonth);
    setEditBdEndYear(b.endYear);
    setEditBdError("");
  }

  function saveEditBd() {
    if (!editBdLabel.trim()) { setEditBdError("Label required"); return; }
    const start = editBdStartYear * 12 + editBdStartMonth;
    const end   = editBdEndYear   * 12 + editBdEndMonth;
    if (end < start) { setEditBdError("End must be after start"); return; }
    const updated = {
      id: editBdId!, label: editBdLabel.trim(),
      startMonth: editBdStartMonth, startYear: editBdStartYear,
      endMonth: editBdEndMonth,     endYear: editBdEndYear,
    };
    updateBlackoutDate(editBdId!, updated);
    setEditBdId(null);
    const affected = trips.filter((t) => tripOverlapsBlackout(t, [updated]));
    if (affected.length > 0) setBdConflicts(affected);
  }

  // Year range: past years with trips or allocations, current through max future
  const scheduledYears = trips.filter((t) => t.scheduled).map((t) => t.scheduled!.startYear);
  const allocationYears = Object.keys(annualAllocations).map(Number);
  const defaultMaxFuture = currentYear + 4;
  const [maxFutureYear, setMaxFutureYear] = useState(
    Math.max(defaultMaxFuture, ...scheduledYears, ...allocationYears)
  );
  const [showPastYears, setShowPastYears] = useState(false);

  const minPastYear = Math.min(currentYear, ...scheduledYears, ...allocationYears);
  const allYears = Array.from(
    { length: maxFutureYear - minPastYear + 1 },
    (_, i) => minPastYear + i
  );
  const years = showPastYears ? allYears : allYears.filter((y) => y >= currentYear);
  const hasPastYears = allYears.some((y) => y < currentYear);

  // Overall totals
  const totalSpent = trips
    .filter((t) => t.status === "completed" && t.estimatedCost)
    .reduce((s, t) => s + (t.estimatedCost ?? 0), 0);
  const totalCommitted = trips
    .filter((t) => (t.status === "planning" || t.status === "booked") && t.estimatedCost)
    .reduce((s, t) => s + (t.estimatedCost ?? 0), 0);
  const totalAllocated = Object.values(annualAllocations).reduce((s, v) => s + v, 0);
  const totalConsumed = totalSpent + totalCommitted;
  const totalRemaining = totalBudget - totalConsumed;
  const overallOver = totalBudget > 0 && totalConsumed > totalBudget;

  // Guard: check if the new allocation would over-run total budget
  const handleAllocationRequest = (year: number, amount: number) => {
    const currentAlloc = annualAllocations[year] ?? 0;
    const newTotalAllocated = totalAllocated - currentAlloc + amount;
    if (totalBudget > 0 && newTotalAllocated > totalBudget) {
      setPendingAlloc({ year, amount, newTotalAllocated });
    } else {
      setAnnualAllocation(year, amount);
    }
  };

  // Commit the total budget, with guard against being immediately over-budget
  const commitTotalBudget = (raw: string) => {
    const n = parseFloat(raw);
    const newTotal = isNaN(n) ? 0 : Math.max(0, n);
    if (newTotal > 0 && newTotal < totalConsumed) {
      setTotalError(
        `Committed spend (${fmt(totalConsumed, currency)}) already exceeds ${fmt(newTotal, currency)}. Increase the budget or reduce trip costs first.`
      );
      return; // don't save
    }
    setTotalError("");
    setBudget({ totalBudget: newTotal });
    setEditingTotal(false);
  };

  const inputBase: React.CSSProperties = {
    background: "var(--surface-3)", color: "var(--text-primary)",
    border: "1px solid var(--border)", borderRadius: "8px",
    padding: "6px 10px", fontSize: "13px",
  };

  return (
    <main className="flex-1 overflow-y-auto px-6 py-5" style={{ background: "var(--surface-0)" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>

        {/* ── Page title ── */}
        <h1 className="font-display text-2xl mb-6" style={{ color: "var(--text-primary)" }}>
          Settings
        </h1>

        {/* ══════════════════════════════════════════════════════════
            Section 1 — Travel Budget
            ══════════════════════════════════════════════════════════ */}
        <div className="rounded-xl mb-8 overflow-hidden"
          style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>

          {/* Section header */}
          <div className="flex items-center gap-3 px-5 py-4"
            style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
            <Wallet size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
            <div>
              <h2 className="font-display text-base" style={{ color: "var(--text-primary)" }}>
                Travel Budget
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Set your overall budget, currency, and year-by-year allocations.
              </p>
            </div>
          </div>

          <div className="p-5">
          <div className="flex flex-wrap items-end gap-6">

            {/* Total budget — click-to-edit with Update button */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                Total Travel Budget
              </label>
              {editingTotal ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{currency}</span>
                  <input
                    autoFocus
                    type="number" min={0}
                    value={totalRaw}
                    placeholder="0"
                    onChange={(e) => { setTotalRaw(e.target.value); setTotalError(""); }}
                    onKeyDown={(e) => { if (e.key === "Enter") commitTotalBudget(totalRaw); if (e.key === "Escape") { setEditingTotal(false); setTotalError(""); } }}
                    style={{ ...inputBase, width: "150px", outline: "none" }}
                  />
                  <button onClick={() => commitTotalBudget(totalRaw)}
                    style={{
                      background: "var(--btn-primary)", color: "var(--btn-primary-text)",
                      padding: "6px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 700,
                      cursor: "pointer",
                    }}>
                    Update
                  </button>
                  <button onClick={() => { setEditingTotal(false); setTotalError(""); }}
                    style={{ fontSize: "12px", color: "var(--text-muted)", cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setTotalRaw(totalBudget > 0 ? String(totalBudget) : ""); setEditingTotal(true); }}
                  style={{
                    ...inputBase, cursor: "text", textAlign: "left", minWidth: "160px",
                    color: totalBudget > 0 ? "var(--text-primary)" : "var(--text-muted)",
                    fontWeight: totalBudget > 0 ? 700 : 400,
                    fontSize: totalBudget > 0 ? "15px" : "13px",
                  }}>
                  {totalBudget > 0 ? fmt(totalBudget, currency) : "Click to set budget"}
                </button>
              )}
              {totalError && (
                <div className="flex items-start gap-1.5 mt-1 max-w-xs">
                  <AlertTriangle size={12} color="#ef4444" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <p className="text-xs" style={{ color: "#ef4444" }}>{totalError}</p>
                </div>
              )}
            </div>

            {/* Currency */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>Currency</label>
              <select value={currency} onChange={(e) => setBudget({ currency: e.target.value })}
                style={{ ...inputBase, cursor: "pointer" }}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <hr className="my-5" style={{ border: "none", borderTop: "1px solid var(--border-subtle)" }} />

        {/* ── Overall summary ── */}
        {totalBudget > 0 && (
          <div className="rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center"
            style={{
              background: overallOver ? "rgba(239,68,68,0.08)" : "var(--surface-1)",
              border: `1px solid ${overallOver ? "#ef4444" : "var(--border)"}`,
            }}>
            {overallOver && (
              <div className="flex items-center gap-1.5 w-full mb-1" style={{ color: "#ef4444" }}>
                <AlertTriangle size={14} />
                <span className="text-xs font-semibold">
                  Total committed spend ({fmt(totalConsumed, currency)}) exceeds your overall budget
                </span>
              </div>
            )}
            {[
              { label: "Total Budget",   value: fmt(totalBudget, currency),     color: "var(--text-primary)",  pct: null },
              { label: "Allocated",      value: fmt(totalAllocated, currency),  color: "var(--text-secondary)", pct: totalBudget > 0 ? Math.round(totalAllocated / totalBudget * 100) : null },
              { label: "Committed",      value: fmt(totalCommitted, currency),  color: "#f59e0b",              pct: totalBudget > 0 ? Math.round(totalCommitted / totalBudget * 100) : null },
              { label: "Spent",          value: fmt(totalSpent, currency),      color: "#6366f1",              pct: totalBudget > 0 ? Math.round(totalSpent / totalBudget * 100) : null },
              {
                label: "Remaining",
                value: fmt(Math.abs(totalRemaining), currency) + (totalRemaining < 0 ? " over" : ""),
                color: totalRemaining < 0 ? "#ef4444" : "#10B981",
                pct: totalBudget > 0 ? Math.round(Math.abs(totalRemaining) / totalBudget * 100) : null,
              },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-0.5 min-w-[110px]">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold" style={{ color: s.color }}>{s.value}</span>
                  {s.pct !== null && (
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{s.pct}%</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-xl overflow-hidden mb-3"
          style={{ border: "1px solid var(--border)", background: "var(--surface-1)" }}>

          {/* Column headers */}
          <div className="grid px-4 py-2 text-xs font-semibold"
            style={{
              gridTemplateColumns: "72px 1fr 130px 110px 110px",
              gap: "12px",
              color: "var(--text-muted)",
              borderBottom: "1px solid var(--border)",
              background: "var(--surface-2)",
            }}>
            <span>Year</span>
            <span>Progress</span>
            <span style={{ textAlign: "right" }}>Allocation</span>
            <span style={{ textAlign: "right" }}>Committed</span>
            <span style={{ textAlign: "right" }}>Spent</span>
          </div>

          {years.map((year, i) => {
            const alloc = annualAllocations[year] ?? 0;
            const { spent, committed, total } = yearBudgetStats(trips, year);
            const isPast = year < currentYear;
            const isOver = alloc > 0 && total > alloc;
            const barMax = Math.max(alloc, total, 1);
            const spentPct = Math.min((spent / barMax) * 100, 100);
            const committedPct = Math.min((committed / barMax) * 100, 100 - spentPct);

            return (
              <div key={year}
                style={{
                  borderBottom: i < years.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  background: isOver
                    ? "rgba(239,68,68,0.07)"
                    : isPast ? "rgba(0,0,0,0.02)" : "transparent",
                }}>

                {/* Over-budget banner */}
                {isOver && (
                  <div className="flex items-center gap-2 px-4 py-1.5"
                    style={{ background: "rgba(239,68,68,0.12)", borderBottom: "1px solid rgba(239,68,68,0.2)" }}>
                    <AlertTriangle size={12} color="#ef4444" />
                    <span className="text-xs font-semibold" style={{ color: "#ef4444" }}>
                      {year} is over budget — {fmt(total - alloc, currency)} above allocation
                    </span>
                  </div>
                )}

                {/* Past year over-allocated banner */}
                {isPast && alloc > 0 && alloc > spent && !isOver && (
                  <div className="flex items-center justify-between gap-3 px-4 py-1.5"
                    style={{ background: "rgba(245,158,11,0.08)", borderBottom: "1px solid rgba(245,158,11,0.18)" }}>
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle size={12} color="#f59e0b" />
                      <span className="text-xs" style={{ color: "#f59e0b" }}>
                        {fmt(alloc - spent, currency)} of {year} allocation unused — actual spend was {fmt(spent, currency)}
                      </span>
                    </div>
                    <button
                      onClick={() => setAnnualAllocation(year, spent)}
                      className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-md transition-opacity hover:opacity-80"
                      style={{ background: "rgba(245,158,11,0.18)", color: "#f59e0b", whiteSpace: "nowrap" }}>
                      Set to {fmt(spent, currency)}
                    </button>
                  </div>
                )}

                <div className="grid px-4 py-3 items-center"
                  style={{ gridTemplateColumns: "72px 1fr 130px 110px 110px", gap: "12px" }}>

                  {/* Year */}
                  <span className="font-display text-sm" style={{
                    color: year === currentYear ? "var(--accent)"
                         : isPast ? "var(--text-muted)"
                         : "var(--text-secondary)",
                    opacity: isPast ? 0.75 : 1,
                  }}>
                    {year}
                    {isPast && <span className="text-xs ml-1" style={{ color: "var(--text-muted)", fontFamily: "sans-serif" }}>past</span>}
                  </span>

                  {/* Progress bar */}
                  <div style={{
                    height: "8px", borderRadius: "4px",
                    background: "var(--surface-3)", overflow: "hidden", position: "relative",
                  }}>
                    <div style={{
                      position: "absolute", left: 0, top: 0, bottom: 0,
                      width: `${spentPct}%`,
                      background: "#6366f1", borderRadius: "4px 0 0 4px",
                      transition: "width 0.3s ease",
                    }} />
                    <div style={{
                      position: "absolute", left: `${spentPct}%`, top: 0, bottom: 0,
                      width: `${committedPct}%`,
                      background: "#f59e0b", opacity: 0.85,
                      transition: "left 0.3s ease, width 0.3s ease",
                    }} />
                    {isOver && (
                      <div style={{
                        position: "absolute", right: 0, top: 0, bottom: 0, width: "4px",
                        background: "#ef4444",
                      }} />
                    )}
                  </div>

                  {/* Allocation */}
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <AllocationInput year={year} value={alloc} currency={currency} onChange={handleAllocationRequest} />
                  </div>

                  {/* Committed */}
                  <div style={{ textAlign: "right" }}>
                    {committed > 0
                      ? <span className="text-xs font-semibold" style={{ color: "#f59e0b" }}>{fmt(committed, currency)}</span>
                      : <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>}
                  </div>

                  {/* Spent */}
                  <div style={{ textAlign: "right" }}>
                    {spent > 0
                      ? <span className="text-xs font-semibold" style={{ color: "#6366f1" }}>{fmt(spent, currency)}</span>
                      : <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add year row + Show/hide past years */}
        <div className="flex items-center justify-between mb-5 mt-2">
          <button
            onClick={() => setMaxFutureYear((y) => y + 1)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{
              color: "var(--text-muted)", border: "1px dashed var(--border)",
              background: "transparent",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}>
            <Plus size={12} />
            Add {maxFutureYear + 1}
          </button>

          {hasPastYears && (
            <button
              onClick={() => setShowPastYears((v) => !v)}
              className="text-xs px-2 py-1 transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}>
              {showPastYears ? "Hide past years" : "Show past years"}
            </button>
          )}
        </div>

        {/* ── Over-allocation prompt ── */}
        {pendingAlloc && (
          <div className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: "rgba(0,0,0,0.6)" }}>
            <div className="rounded-xl p-5 w-96 flex flex-col gap-4 shadow-2xl"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderTop: "3px solid #f59e0b",
              }}>
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div>
                  <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                    Year allocation exceeds total budget
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    Setting {pendingAlloc.year} to {fmt(pendingAlloc.amount, currency)} brings total
                    allocations to {fmt(pendingAlloc.newTotalAllocated, currency)}, which is{" "}
                    {fmt(pendingAlloc.newTotalAllocated - totalBudget, currency)} over your{" "}
                    {fmt(totalBudget, currency)} budget.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setBudget({ totalBudget: pendingAlloc.newTotalAllocated });
                    setAnnualAllocation(pendingAlloc.year, pendingAlloc.amount);
                    setPendingAlloc(null);
                  }}
                  className="w-full py-2 rounded-lg text-sm font-semibold"
                  style={{ background: "#f59e0b", color: "#1c1917" }}>
                  Increase budget to {fmt(pendingAlloc.newTotalAllocated, currency)}
                </button>
                <button
                  onClick={() => setPendingAlloc(null)}
                  className="w-full py-2 rounded-lg text-sm"
                  style={{ background: "var(--surface-3)", color: "var(--text-secondary)" }}>
                  Cancel — keep current allocation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-5 px-1">
          {[
            { color: "#6366f1", label: "Spent (completed trips)" },
            { color: "#f59e0b", label: "Committed (planning / booked)" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: l.color }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{l.label}</span>
            </div>
          ))}
        </div>

          </div>{/* /p-5 */}
        </div>{/* /Travel Budget card */}

        {/* ══════════════════════════════════════════════════════════
            Section 2 — Blackout Dates
            ══════════════════════════════════════════════════════════ */}
        <div className="rounded-xl overflow-hidden"
          style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>

          {/* Section header */}
          <div className="flex items-center gap-3 px-5 py-4"
            style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
            <Ban size={16} style={{ color: "#f87171", flexShrink: 0 }} />
            <div>
              <h2 className="font-display text-base" style={{ color: "var(--text-primary)" }}>
                Blackout Dates
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Define periods when you can't travel. Scheduled trips that overlap will show a conflict warning.
              </p>
            </div>
          </div>

          <div className="p-5">

          {/* Add form */}
          <div className="flex flex-wrap gap-2 mb-3 items-end">
            <div className="flex flex-col gap-1">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Label</span>
              <input
                className="text-xs rounded-md px-2 py-1.5 outline-none w-40"
                style={{ background: "var(--surface-3)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                placeholder="e.g. Q4 Freeze"
                value={bdLabel}
                onChange={(e) => { setBdLabel(e.target.value); setBdError(""); }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Start</span>
              <div className="flex gap-1">
                <select className="text-xs rounded-md px-2 py-1.5 outline-none"
                  style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}
                  value={bdStartMonth} onChange={(e) => setBdStartMonth(Number(e.target.value))}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <input type="number" className="text-xs rounded-md px-2 py-1.5 outline-none w-16 text-center"
                  style={{ background: "var(--surface-3)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  value={bdStartYear} onChange={(e) => setBdStartYear(Number(e.target.value))} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>End</span>
              <div className="flex gap-1">
                <select className="text-xs rounded-md px-2 py-1.5 outline-none"
                  style={{ background: "var(--surface-3)", border: "1px solid var(--border)" }}
                  value={bdEndMonth} onChange={(e) => setBdEndMonth(Number(e.target.value))}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <input type="number" className="text-xs rounded-md px-2 py-1.5 outline-none w-16 text-center"
                  style={{ background: "var(--surface-3)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  value={bdEndYear} onChange={(e) => setBdEndYear(Number(e.target.value))} />
              </div>
            </div>
            <button
              onClick={() => {
                if (!bdLabel.trim()) { setBdError("Label required"); return; }
                const start = bdStartYear * 12 + bdStartMonth;
                const end   = bdEndYear   * 12 + bdEndMonth;
                if (end < start) { setBdError("End must be after start"); return; }
                const newBd = {
                  id: crypto.randomUUID(),
                  label: bdLabel.trim(),
                  startMonth: bdStartMonth, startYear: bdStartYear,
                  endMonth: bdEndMonth,     endYear: bdEndYear,
                };
                addBlackoutDate(newBd);
                setBdLabel(""); setBdError("");
                const affected = trips.filter((t) => tripOverlapsBlackout(t, [newBd]));
                if (affected.length > 0) setBdConflicts(affected);
              }}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ background: "var(--btn-primary)", color: "var(--btn-primary-text)" }}>
              <Plus size={12} /> Add
            </button>
          </div>
          {bdError && <p className="text-xs mb-2" style={{ color: "#ef4444" }}>{bdError}</p>}

          {/* List */}
          {blackoutDates.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No blackout dates defined.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {blackoutDates.map((b) => editBdId === b.id ? (
                /* ── Inline edit row ── */
                <div key={b.id} className="flex flex-col gap-2 px-3 py-2 rounded-lg"
                  style={{ background: "var(--surface-3)", border: "1px solid var(--accent)" }}>
                  <div className="flex flex-wrap gap-2 items-end">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>Label</span>
                      <input className="text-xs rounded-md px-2 py-1.5 outline-none w-36"
                        style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                        value={editBdLabel} onChange={(e) => { setEditBdLabel(e.target.value); setEditBdError(""); }} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>Start</span>
                      <div className="flex gap-1">
                        <select className="text-xs rounded-md px-2 py-1.5 outline-none"
                          style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                          value={editBdStartMonth} onChange={(e) => setEditBdStartMonth(Number(e.target.value))}>
                          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                        </select>
                        <input type="number" className="text-xs rounded-md px-2 py-1.5 outline-none w-16 text-center"
                          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                          value={editBdStartYear} onChange={(e) => setEditBdStartYear(Number(e.target.value))} />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>End</span>
                      <div className="flex gap-1">
                        <select className="text-xs rounded-md px-2 py-1.5 outline-none"
                          style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                          value={editBdEndMonth} onChange={(e) => setEditBdEndMonth(Number(e.target.value))}>
                          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                        </select>
                        <input type="number" className="text-xs rounded-md px-2 py-1.5 outline-none w-16 text-center"
                          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                          value={editBdEndYear} onChange={(e) => setEditBdEndYear(Number(e.target.value))} />
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={saveEditBd}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md font-medium"
                        style={{ background: "var(--btn-primary)", color: "var(--btn-primary-text)" }}>
                        <Check size={11} /> Save
                      </button>
                      <button onClick={() => setEditBdId(null)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md"
                        style={{ background: "var(--surface-2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                        <X size={11} /> Cancel
                      </button>
                    </div>
                  </div>
                  {editBdError && <p className="text-xs" style={{ color: "#ef4444" }}>{editBdError}</p>}
                </div>
              ) : (
                /* ── Display row ── */
                <div key={b.id} className="flex items-center justify-between px-3 py-2 rounded-lg"
                  style={{ background: "var(--surface-3)", border: "1px solid var(--border-subtle)" }}>
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{b.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {MONTHS[b.startMonth - 1]} {b.startYear} – {MONTHS[b.endMonth - 1]} {b.endYear}
                    </span>
                    <button onClick={() => startEditBd(b)} style={{ color: "var(--text-muted)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}>
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => removeBlackoutDate(b.id)} style={{ color: "var(--text-muted)" }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Conflict feedback after add/edit */}
          {bdConflicts.length > 0 && (
            <div className="mt-4 rounded-lg p-3 flex flex-col gap-1.5"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)" }}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={13} style={{ color: "#ef4444", flexShrink: 0 }} />
                <span className="text-xs font-semibold" style={{ color: "#ef4444" }}>
                  {bdConflicts.length} scheduled trip{bdConflicts.length > 1 ? "s" : ""} overlap this blackout period
                </span>
                <button onClick={() => setBdConflicts([])} style={{ marginLeft: "auto", color: "var(--text-muted)" }}>
                  <X size={12} />
                </button>
              </div>
              {bdConflicts.map((t) => (
                <div key={t.id} className="text-xs pl-5" style={{ color: "var(--text-secondary)" }}>
                  • {t.title}
                  {t.scheduled && (
                    <span style={{ color: "var(--text-muted)" }}>
                      {" "}({["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][t.scheduled.startMonth]} {t.scheduled.startYear})
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          </div>{/* /p-5 */}
        </div>{/* /Blackout Dates card */}

        {/* ══════════════════════════════════════════════════════════
            Section 3 — Display
            ══════════════════════════════════════════════════════════ */}
        <div className="rounded-xl mt-8 overflow-hidden"
          style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>

          {/* Section header */}
          <div className="flex items-center gap-3 px-5 py-4"
            style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
            <Monitor size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
            <div>
              <h2 className="font-display text-base" style={{ color: "var(--text-primary)" }}>
                Customizations
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Set your appearance and navigation preferences.
              </p>
            </div>
          </div>

          <div className="p-5 flex flex-col gap-5">

            {/* Home Page */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Home Page</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  View that opens when you click the Wanderlist logo
                </p>
              </div>
              <SegmentedToggle
                value={defaultView}
                options={[{ value: "planner", label: "Timeline" }, { value: "trips", label: "Trips" }]}
                onChange={(v) => setDefaultView(v as "planner" | "trips")}
              />
            </div>

            {/* Appearance */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Appearance</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Persistent color scheme — the nav Moon/Sun button overrides for the current session only
                </p>
              </div>
              <SegmentedToggle
                value={theme}
                options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]}
                onChange={() => toggleTheme()}
              />
            </div>

          </div>
        </div>{/* /Display card */}

      </div>
    </main>
  );
}
