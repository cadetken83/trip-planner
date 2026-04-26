"use client";

import { useState } from "react";
import { useTripStore } from "@/store/useTripStore";
import { Trip } from "@/types";
import { AlertTriangle } from "lucide-react";

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

// ── Editable amount cell ───────────────────────────────────────────────────────
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
          width: "110px", padding: "3px 8px", borderRadius: "6px", fontSize: "13px",
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
        borderRadius: "6px", padding: "3px 10px", cursor: "text", minWidth: "110px",
        textAlign: "right",
      }}
    >
      {value > 0 ? fmt(value, currency) : "Set allocation"}
    </button>
  );
}

// ── BudgetPanel ───────────────────────────────────────────────────────────────
export default function BudgetPanel() {
  const { trips, budget, setBudget, setAnnualAllocation } = useTripStore();
  const { currency, totalBudget, annualAllocations } = budget;

  const now = new Date();
  const currentYear = now.getFullYear();

  // Year range: current year through max(currentYear+4, farthest scheduled trip)
  const scheduledYears = trips
    .filter((t) => t.scheduled)
    .map((t) => t.scheduled!.startYear);
  const maxYear = Math.max(currentYear + 4, ...scheduledYears);
  const years = Array.from({ length: maxYear - currentYear + 1 }, (_, i) => currentYear + i);

  // Overall totals
  const totalSpent = trips
    .filter((t) => t.status === "completed" && t.estimatedCost)
    .reduce((s, t) => s + (t.estimatedCost ?? 0), 0);
  const totalCommitted = trips
    .filter((t) => (t.status === "planning" || t.status === "booked") && t.estimatedCost)
    .reduce((s, t) => s + (t.estimatedCost ?? 0), 0);
  const totalAllocated = Object.values(annualAllocations).reduce((s, v) => s + v, 0);
  const totalRemaining = totalBudget - totalSpent - totalCommitted;
  const overallOverBudget = totalBudget > 0 && totalSpent + totalCommitted > totalBudget;

  return (
    <main className="flex-1 overflow-y-auto px-6 py-5" style={{ background: "var(--surface-0)" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>

        {/* ── Settings header ── */}
        <div className="rounded-xl p-5 mb-6"
          style={{ background: "var(--surface-1)", border: "1px solid var(--border)" }}>
          <h2 className="font-display text-lg mb-4" style={{ color: "var(--text-primary)" }}>
            Trip Budget
          </h2>
          <div className="flex flex-wrap items-end gap-6">
            {/* Currency */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setBudget({ currency: e.target.value })}
                style={{
                  background: "var(--surface-3)", color: "var(--text-primary)",
                  border: "1px solid var(--border)", borderRadius: "8px",
                  padding: "6px 10px", fontSize: "13px", cursor: "pointer",
                }}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Total budget */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                Total Trip Budget
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{currency}</span>
                <input
                  type="number"
                  min={0}
                  value={totalBudget || ""}
                  placeholder="0"
                  onChange={(e) => {
                    const n = parseFloat(e.target.value);
                    setBudget({ totalBudget: isNaN(n) ? 0 : Math.max(0, n) });
                  }}
                  style={{
                    width: "140px", padding: "6px 10px", borderRadius: "8px", fontSize: "13px",
                    background: "var(--surface-3)", color: "var(--text-primary)",
                    border: "1px solid var(--border)", outline: "none",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Overall summary ── */}
        {totalBudget > 0 && (
          <div className="rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center"
            style={{
              background: overallOverBudget ? "rgba(239,68,68,0.08)" : "var(--surface-1)",
              border: `1px solid ${overallOverBudget ? "#ef4444" : "var(--border)"}`,
            }}>
            {overallOverBudget && (
              <div className="flex items-center gap-1.5 w-full mb-1" style={{ color: "#ef4444" }}>
                <AlertTriangle size={14} />
                <span className="text-xs font-semibold">Total committed spend exceeds your overall budget</span>
              </div>
            )}
            {[
              { label: "Total Budget",  value: fmt(totalBudget, currency),   color: "var(--text-primary)" },
              { label: "Allocated",     value: fmt(totalAllocated, currency), color: "var(--text-secondary)" },
              { label: "Committed",     value: fmt(totalCommitted, currency), color: "#f59e0b" },
              { label: "Spent",         value: fmt(totalSpent, currency),     color: "#6366f1" },
              { label: "Remaining",     value: fmt(Math.max(0, totalRemaining), currency),
                color: totalRemaining < 0 ? "#ef4444" : "#10B981" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-0.5 min-w-[100px]">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{s.label}</span>
                <span className="text-sm font-bold" style={{ color: s.color }}>{s.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Year rows ── */}
        <div className="rounded-xl overflow-hidden"
          style={{ border: "1px solid var(--border)", background: "var(--surface-1)" }}>
          {/* Header */}
          <div className="grid px-4 py-2 text-xs font-semibold"
            style={{
              gridTemplateColumns: "80px 1fr 110px 110px 110px",
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
            const isOver = alloc > 0 && total > alloc;
            const barMax = Math.max(alloc, total, 1);
            const spentPct = Math.min((spent / barMax) * 100, 100);
            const committedPct = Math.min((committed / barMax) * 100, 100 - spentPct);

            return (
              <div
                key={year}
                className="grid px-4 py-3 items-center"
                style={{
                  gridTemplateColumns: "80px 1fr 110px 110px 110px",
                  gap: "12px",
                  borderBottom: i < years.length - 1 ? "1px solid var(--border-subtle)" : "none",
                  background: isOver ? "rgba(239,68,68,0.04)" : "transparent",
                }}
              >
                {/* Year */}
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-sm" style={{
                    color: year === currentYear ? "var(--accent)" : "var(--text-secondary)",
                  }}>
                    {year}
                  </span>
                  {isOver && <AlertTriangle size={12} color="#ef4444" />}
                </div>

                {/* Progress bar */}
                <div style={{
                  height: "8px", borderRadius: "4px",
                  background: "var(--surface-3)", overflow: "hidden", position: "relative",
                }}>
                  {/* Spent segment */}
                  <div style={{
                    position: "absolute", left: 0, top: 0, bottom: 0,
                    width: `${spentPct}%`,
                    background: "#6366f1", borderRadius: "4px 0 0 4px",
                    transition: "width 0.3s ease",
                  }} />
                  {/* Committed segment */}
                  <div style={{
                    position: "absolute", left: `${spentPct}%`, top: 0, bottom: 0,
                    width: `${committedPct}%`,
                    background: "#f59e0b",
                    opacity: 0.8,
                    transition: "left 0.3s ease, width 0.3s ease",
                  }} />
                  {/* Over-budget overflow indicator */}
                  {isOver && (
                    <div style={{
                      position: "absolute", right: 0, top: 0, bottom: 0, width: "3px",
                      background: "#ef4444", borderRadius: "0 4px 4px 0",
                    }} />
                  )}
                </div>

                {/* Allocation (editable) */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <AllocationInput
                    year={year} value={alloc} currency={currency}
                    onChange={setAnnualAllocation}
                  />
                </div>

                {/* Committed */}
                <div style={{ textAlign: "right" }}>
                  {committed > 0 ? (
                    <span className="text-xs font-semibold" style={{ color: "#f59e0b" }}>
                      {fmt(committed, currency)}
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                  )}
                </div>

                {/* Spent */}
                <div style={{ textAlign: "right" }}>
                  {spent > 0 ? (
                    <span className="text-xs font-semibold" style={{ color: "#6366f1" }}>
                      {fmt(spent, currency)}
                    </span>
                  ) : (
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Legend ── */}
        <div className="flex items-center gap-5 mt-3 px-1">
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
