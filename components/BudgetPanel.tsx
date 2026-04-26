"use client";

import { useState } from "react";
import { useTripStore } from "@/store/useTripStore";
import { Trip } from "@/types";
import { AlertTriangle, Plus } from "lucide-react";

// ── Constants ──────────────────────────────────────────────────────────────────

const CURRENCIES = [
  { code: "USD", label: "USD – US Dollar" },
  { code: "EUR", label: "EUR – Euro" },
  { code: "GBP", label: "GBP – British Pound" },
  { code: "CAD", label: "CAD – Canadian Dollar" },
  { code: "AUD", label: "AUD – Australian Dollar" },
  { code: "JPY", label: "JPY – Japanese Yen" },
  { code: "CHF", label: "CHF – Swiss Franc" },
  { code: "NZD", label: "NZD – New Zealand Dollar" },
  { code: "SGD", label: "SGD – Singapore Dollar" },
  { code: "MXN", label: "MXN – Mexican Peso" },
  { code: "BRL", label: "BRL – Brazilian Real" },
  { code: "ZAR", label: "ZAR – South African Rand" },
  { code: "INR", label: "INR – Indian Rupee" },
  { code: "THB", label: "THB – Thai Baht" },
  { code: "HKD", label: "HKD – Hong Kong Dollar" },
  { code: "KRW", label: "KRW – South Korean Won" },
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

// ── BudgetPanel ───────────────────────────────────────────────────────────────
type PendingAllocation = { year: number; amount: number; newTotalAllocated: number };

export default function BudgetPanel() {
  const { trips, budget, setBudget, setAnnualAllocation } = useTripStore();
  const { currency, totalBudget, annualAllocations } = budget;

  const now = new Date();
  const currentYear = now.getFullYear();

  // Local state for the total budget input (formatted on display, raw while editing)
  const [editingTotal, setEditingTotal] = useState(false);
  const [totalRaw, setTotalRaw] = useState("");
  const [totalError, setTotalError] = useState("");

  // Pending over-allocation prompt
  const [pendingAlloc, setPendingAlloc] = useState<PendingAllocation | null>(null);

  // Year range: past years with trips or allocations, current through max future
  const scheduledYears = trips.filter((t) => t.scheduled).map((t) => t.scheduled!.startYear);
  const allocationYears = Object.keys(annualAllocations).map(Number);
  const defaultMaxFuture = currentYear + 4;
  const [maxFutureYear, setMaxFutureYear] = useState(
    Math.max(defaultMaxFuture, ...scheduledYears, ...allocationYears)
  );

  const minPastYear = Math.min(currentYear, ...scheduledYears, ...allocationYears);
  const years = Array.from(
    { length: maxFutureYear - minPastYear + 1 },
    (_, i) => minPastYear + i
  );

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

        {/* ── Settings header ── */}
        <div className="rounded-xl p-5 mb-6"
          style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>
          <h2 className="font-display text-lg mb-4" style={{ color: "var(--text-primary)" }}>
            Travel Budget
          </h2>
          <div className="flex flex-wrap items-end gap-6">

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
                      background: "var(--accent)", color: "#1c1917",
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
          </div>
        </div>

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
              { label: "Total Budget",   value: fmt(totalBudget, currency),     color: "var(--text-primary)" },
              { label: "Allocated",      value: fmt(totalAllocated, currency),  color: "var(--text-secondary)" },
              { label: "Committed",      value: fmt(totalCommitted, currency),  color: "#f59e0b" },
              { label: "Spent",          value: fmt(totalSpent, currency),      color: "#6366f1" },
              {
                label: "Remaining",
                value: fmt(Math.abs(totalRemaining), currency) + (totalRemaining < 0 ? " over" : ""),
                color: totalRemaining < 0 ? "#ef4444" : "#10B981",
              },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-0.5 min-w-[110px]">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</span>
                <span className="text-sm font-bold" style={{ color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Budget by Year ── */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-base" style={{ color: "var(--text-secondary)" }}>
            Budget by Year
          </h3>
        </div>

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

        {/* Add future year */}
        <button
          onClick={() => setMaxFutureYear((y) => y + 1)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors mb-5"
          style={{
            color: "var(--text-muted)", border: "1px dashed var(--border)",
            background: "transparent",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}>
          <Plus size={12} />
          Add {maxFutureYear + 1}
        </button>

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

      </div>
    </main>
  );
}
