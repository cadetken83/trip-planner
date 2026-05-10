"use client";

import { useState, useEffect, useRef } from "react";
import { useTripStore } from "@/store/useTripStore";
import { inferContinent } from "@/utils/inferContinent";
import { Trip, TripStatus, Continent } from "@/types";
import { AlertTriangle, X, Trash2, Ban } from "lucide-react";
import { TRIP_EDIT, MONTH_NAMES_LONG, CONTINENTS } from "@/lib/content";

const SCHEDULED_STATUSES: { value: TripStatus; label: string }[] = [
  { value: "unscheduled", label: "Unscheduled" },
  { value: "planning",    label: "Planning" },
  { value: "booked",      label: "Booked" },
  { value: "completed",   label: "Completed" },
];

function isTripInPast(trip: Trip): boolean {
  if (!trip.scheduled) return false;
  const now = new Date();
  const endIdx = trip.scheduled.endYear * 12 + trip.scheduled.endMonth;
  const nowIdx = now.getFullYear() * 12 + now.getMonth();
  return endIdx < nowIdx;
}

type Props = {
  trip: Trip;
  onClose: () => void;
};

export default function TripEditModal({ trip, onClose }: Props) {
  const { trips, groups, updateTrip, removeTrip, unscheduleTrip } = useTripStore();
  const categories    = useTripStore((s) => s.categories);
  const currency      = useTripStore((s) => s.budget.currency);
  const blackoutDates = useTripStore((s) => s.blackoutDates);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 2 + i);

  const [imageUrl,       setImageUrl]       = useState(trip.imageUrl ?? "");
  const [title,          setTitle]          = useState(trip.title);
  const [estimatedCost,  setEstimatedCost]  = useState<string>(
    trip.estimatedCost !== undefined ? String(trip.estimatedCost) : ""
  );
  const [destination,   setDestination]   = useState(trip.destination);
  const [groupId,       setGroupId]       = useState(trip.groupId);
  const [categoryId,    setCategoryId]    = useState(trip.categoryId ?? "");
  const [status,        setStatus]        = useState<TripStatus>(trip.status);
  const [durationWeeks, setDurationWeeks] = useState(trip.durationWeeks ?? 1);
  const [notes,         setNotes]         = useState(trip.notes ?? "");
  const [tagInput,      setTagInput]      = useState("");
  const [tags,          setTags]          = useState<string[]>(trip.tags ?? []);

  // Continent — always auto-inferred; user can also pick manually from the dropdown
  const [continent, setContinent] = useState<Continent | "">(trip.continent ?? "");
  const prevDestRef = useRef(trip.destination);

  // Scheduling
  const isScheduled = !!trip.scheduled;
  const [wantsToSchedule, setWantsToSchedule] = useState(false);
  const localIsScheduled = isScheduled || wantsToSchedule;

  const scheduleRef = useRef<HTMLDivElement>(null);

  const [showBookBy,  setShowBookBy]  = useState(!!trip.bookBy);
  const [bookByMonth, setBookByMonth] = useState(trip.bookBy?.month ?? new Date().getMonth());
  const [bookByYear,  setBookByYear]  = useState(trip.bookBy?.year  ?? currentYear);
  const [bookByDay,   setBookByDay]   = useState<string>(trip.bookBy?.day?.toString() ?? "");

  // Scheduled range
  const [startMonth, setStartMonth] = useState(trip.scheduled?.startMonth ?? new Date().getMonth());
  const [startYear,  setStartYear]  = useState(trip.scheduled?.startYear  ?? currentYear);
  const [endMonth,   setEndMonth]   = useState(trip.scheduled?.endMonth   ?? new Date().getMonth());
  const [endYear,    setEndYear]    = useState(trip.scheduled?.endYear    ?? currentYear);

  // Errors / warnings
  const [dupError,         setDupError]         = useState("");
  const [bookByError,      setBookByError]       = useState("");
  const [confirmDelete,    setConfirmDelete]     = useState(false);
  const [durationWarn,     setDurationWarn]      = useState(false);
  const [bookedDateChange, setBookedDateChange]  = useState(false);
  const [pendingSave,      setPendingSave]       = useState<Partial<Trip> | null>(null);

  const group = groups.find((g) => g.id === groupId);
  const groupColor = group?.color ?? "#78716c";

  // Auto-infer continent when destination changes
  useEffect(() => {
    const destChanged = destination !== prevDestRef.current;
    prevDestRef.current = destination;
    if (!destChanged) return;
    const inferred = inferContinent(destination);
    if (inferred) setContinent(inferred);
  }, [destination]);

  // Duration warning
  useEffect(() => {
    if (durationWeeks > 4 && localIsScheduled) {
      const spanMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
      setDurationWarn(spanMonths < Math.ceil(durationWeeks / 4));
    } else {
      setDurationWarn(false);
    }
  }, [durationWeeks, startMonth, startYear, endMonth, endYear, localIsScheduled]);

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase();
      if (!tags.includes(tag)) setTags([...tags, tag]);
      setTagInput("");
    }
    if (e.key === "Backspace" && !tagInput && tags.length)
      setTags(tags.slice(0, -1));
  };

  const validateBookBy = (): boolean => {
    if (!showBookBy || !localIsScheduled) return true;
    const bookByIdx = bookByYear * 12 + bookByMonth;
    const startIdx  = startYear  * 12 + startMonth;
    if (bookByIdx >= startIdx) {
      setBookByError(TRIP_EDIT.warnings.bookByBefore);
      return false;
    }
    setBookByError("");
    return true;
  };

  const buildUpdates = (): Partial<Trip> => ({
    imageUrl: imageUrl.trim() || undefined,
    title: title.trim(),
    destination: destination.trim(),
    groupId,
    categoryId: categoryId || undefined,
    // Newly-scheduled trips keep "completed" status; others start as "planning"
    status: !isScheduled && wantsToSchedule ? (trip.status === "completed" ? "completed" : "planning") : status,
    durationWeeks,
    notes: notes.trim() || undefined,
    continent: continent || undefined,
    tags,
    estimatedCost: estimatedCost !== "" ? Math.max(0, parseFloat(estimatedCost)) || undefined : undefined,
    bookBy: showBookBy && localIsScheduled
      ? { month: bookByMonth, year: bookByYear, day: bookByDay ? Number(bookByDay) : undefined }
      : undefined,
    scheduled: localIsScheduled
      ? { startMonth, startYear, endMonth, endYear }
      : undefined,
  });

  const handleSave = () => {
    if (!title.trim()) return;
    const isDup = trips.some(
      (t) => t.id !== trip.id && t.title.toLowerCase() === title.trim().toLowerCase()
    );
    if (isDup) { setDupError(`A trip named "${title.trim()}" already exists.`); return; }

    // Unscheduling via status dropdown — save other edits and clear schedule
    if (status === "unscheduled" && isScheduled) {
      updateTrip(trip.id, {
        title: title.trim(), destination: destination.trim(),
        groupId, categoryId: categoryId || undefined,
        status: "unscheduled", scheduled: undefined, bookBy: undefined,
        durationWeeks, notes: notes.trim() || undefined,
        continent: continent || undefined, tags,
        estimatedCost: estimatedCost !== "" ? Math.max(0, parseFloat(estimatedCost)) || undefined : undefined,
        imageUrl: imageUrl.trim() || undefined,
      });
      onClose();
      return;
    }

    if (!validateBookBy()) return;

    const updates = buildUpdates();

    // If trip is booked and dates/duration changed — require confirmation
    if (
      trip.status === "booked" && isScheduled &&
      (startMonth !== trip.scheduled!.startMonth ||
       startYear  !== trip.scheduled!.startYear  ||
       endMonth   !== trip.scheduled!.endMonth   ||
       endYear    !== trip.scheduled!.endYear    ||
       durationWeeks !== trip.durationWeeks)
    ) {
      setPendingSave(updates);
      setBookedDateChange(true);
      return;
    }

    updateTrip(trip.id, updates);
    onClose();
  };

  const handleConfirmBookedChange = () => {
    if (pendingSave) updateTrip(trip.id, pendingSave);
    onClose();
  };

  const handleDelete = () => {
    removeTrip(trip.id);
    onClose();
  };

  // Blackout conflict — derived from current form date state, updates reactively
  const conflictingBlackouts = localIsScheduled ? blackoutDates.filter((b) => {
    const ts = startYear * 12 + startMonth + 1;
    const te = endYear   * 12 + endMonth   + 1;
    const bs = b.startYear * 12 + b.startMonth;
    const be = b.endYear   * 12 + b.endMonth;
    return ts <= be && te >= bs;
  }) : [];

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
    <div className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="rounded-xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl"
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderTop: "3px solid var(--accent)",
        }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <h2 className="font-display text-lg" style={{ color: "var(--text-primary)" }}>{TRIP_EDIT.modalTitle}</h2>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}><X size={18} /></button>
        </div>

        {/* Booked date change confirmation overlay */}
        {bookedDateChange && (
          <div className="px-5 py-4 flex flex-col gap-3"
            style={{ background: "#f59e0b11", borderBottom: "1px solid #f59e0b33" }}>
            <p className="text-sm font-medium" style={{ color: "#f59e0b" }}>
              {TRIP_EDIT.warnings.bookedChangTitle}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {TRIP_EDIT.warnings.bookedChangBody}
            </p>
            <div className="flex gap-2">
              <button onClick={() => { setBookedDateChange(false); setPendingSave(null); }}
                className="flex-1 py-1.5 rounded-lg text-sm"
                style={{ background: "var(--surface-3)", color: "var(--text-secondary)" }}>
                {TRIP_EDIT.actions.goBack}
              </button>
              <button onClick={handleConfirmBookedChange}
                className="flex-1 py-1.5 rounded-lg text-sm font-medium"
                style={{ background: "#f59e0b", color: "#0c0a09" }}>
                {TRIP_EDIT.actions.confirmChange}
              </button>
            </div>
          </div>
        )}

        {/* Blackout conflict warning */}
        {conflictingBlackouts.length > 0 && (
          <div className="px-5 py-3 flex items-start gap-2 shrink-0"
            style={{ background: "#ef444411", borderBottom: "1px solid #ef444433" }}>
            <Ban size={14} style={{ color: "#ef4444", flexShrink: 0, marginTop: "2px" }} />
            <div>
              <p className="text-sm font-medium" style={{ color: "#ef4444" }}>{TRIP_EDIT.warnings.conflictTitle}</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Dates overlap: <strong>{conflictingBlackouts.map((b) => b.label).join(", ")}</strong>.
                {TRIP_EDIT.warnings.conflictBody}
              </p>
            </div>
          </div>
        )}

        <div className="px-5 py-4 flex flex-col gap-4 flex-1 overflow-y-auto min-h-0">

          {/* Title */}
          <div className="flex flex-col gap-1">
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>{TRIP_EDIT.labels.tripName}</label>
            <input className="w-full text-sm rounded-md px-3 py-2 outline-none" style={inputStyle}
              value={title} onChange={(e) => { setTitle(e.target.value); setDupError(""); }}
              placeholder={TRIP_EDIT.placeholders.tripName} />
            {dupError && <p className="text-xs" style={{ color: "#ef4444" }}>{dupError}</p>}
          </div>

          {/* Destination */}
          <div className="flex flex-col gap-1">
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>{TRIP_EDIT.labels.destination}</label>
            <input className="w-full text-sm rounded-md px-3 py-2 outline-none" style={inputStyle}
              value={destination} onChange={(e) => setDestination(e.target.value)}
              placeholder={TRIP_EDIT.placeholders.destination} />
          </div>

          {/* Continent */}
          <div className="flex flex-col gap-1">
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>{TRIP_EDIT.labels.continent}</label>
            <select className="w-full text-sm rounded-md px-3 py-2 outline-none" style={inputStyle}
              value={continent}
              onChange={(e) => setContinent(e.target.value as Continent | "")}>
              <option value="">Unknown</option>
              {CONTINENTS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Trip Type */}
          <div className="flex flex-col gap-1">
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>{TRIP_EDIT.labels.tripType}</label>
            <select className="w-full text-sm rounded-md px-3 py-2 outline-none" style={selectStyle(categoryId)}
              value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">None</option>
              {[...categories].sort((a, b) => a.name.localeCompare(b.name)).map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1">
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>{TRIP_EDIT.labels.tags}</label>
            <div className="flex flex-wrap gap-1 rounded-md px-2 py-1.5 min-h-[36px]" style={inputStyle}>
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "var(--surface-1)", color: "var(--text-secondary)" }}>
                  {tag}
                  <button onClick={() => setTags(tags.filter((t) => t !== tag))}><X size={9} /></button>
                </span>
              ))}
              <input className="flex-1 min-w-[80px] text-xs outline-none bg-transparent"
                style={{ color: "var(--text-primary)" }}
                placeholder={tags.length === 0 ? TRIP_EDIT.placeholders.tags : ""}
                value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown} />
            </div>
          </div>

          {/* Group + Status */}
          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs" style={{ color: "var(--text-muted)" }}>{TRIP_EDIT.labels.travelGroup}</label>
              <select className="w-full text-sm rounded-md px-3 py-2 outline-none" style={inputStyle}
                value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                <option value="">None</option>
                {[...groups].sort((a, b) => a.name.localeCompare(b.name)).map((g) => (
                  <option key={g.id} value={g.id}>{g.name}{g.isDefault ? " ★" : ""}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs" style={{ color: "var(--text-muted)" }}>{TRIP_EDIT.labels.status}</label>
              {!localIsScheduled ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 text-sm rounded-md px-3 py-2"
                    style={{ ...inputStyle, opacity: 0.6, cursor: "not-allowed" }}>
                    Unscheduled
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setWantsToSchedule(true);
                      setTimeout(() => scheduleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                    }}
                    className="shrink-0 text-xs px-2 py-2 rounded-md transition-opacity hover:opacity-80"
                    style={{ background: "var(--accent-dim)", color: "var(--accent)", border: "1px solid var(--accent)", whiteSpace: "nowrap" }}
                    title="Set calendar dates for this trip"
                  >
                    {TRIP_EDIT.actions.schedule}
                  </button>
                </div>
              ) : (
                <select className="w-full text-sm rounded-md px-3 py-2 outline-none" style={inputStyle}
                  value={status} onChange={(e) => setStatus(e.target.value as TripStatus)}>
                  {SCHEDULED_STATUSES.filter((o) => {
                    if (trip.status === "completed") return o.value === "completed" || o.value === "unscheduled";
                    if (isTripInPast(trip)) return o.value !== "planning" && o.value !== "booked";
                    return true;
                  }).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Duration */}
          <div className="flex flex-col gap-1">
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>{TRIP_EDIT.labels.duration}</label>
            <div className="flex items-center gap-2">
              <input type="number" min={1} max={52}
                className="w-20 text-sm rounded-md px-3 py-2 outline-none text-center" style={inputStyle}
                value={durationWeeks} onChange={(e) => setDurationWeeks(Number(e.target.value))} />
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>{TRIP_EDIT.labels.durationUnit}</span>
            </div>
            {durationWarn && (
              <p className="text-xs" style={{ color: "#f59e0b" }}>
                ⚠️ Duration suggests ~{Math.ceil(durationWeeks / 4)} month{Math.ceil(durationWeeks / 4) > 1 ? "s" : ""} on the calendar.
              </p>
            )}
          </div>

          {/* Estimated Cost */}
          <div className="flex flex-col gap-1">
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>{TRIP_EDIT.labels.estimatedCost}</label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2 py-2 rounded-md"
                style={{ background: "var(--surface-3)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                {currency}
              </span>
              <input type="number" min={0} step={1}
                className="flex-1 text-sm rounded-md px-3 py-2 outline-none" style={inputStyle}
                placeholder="0"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)} />
            </div>
          </div>

          {/* Scheduled range */}
          {localIsScheduled && (
            <div ref={scheduleRef} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs" style={{ color: "var(--text-muted)" }}>{TRIP_EDIT.labels.calendarRange}</label>
                {wantsToSchedule && (
                  <button
                    type="button"
                    onClick={() => { setWantsToSchedule(false); setShowBookBy(false); setBookByError(""); }}
                    className="ml-auto text-xs px-2 py-0.5 rounded-full border transition-colors"
                    style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                  >
                    {TRIP_EDIT.actions.removeDates}
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                {/* Start */}
                <div className="flex flex-col gap-1 flex-1">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{TRIP_EDIT.labels.calendarStart}</span>
                  <div className="flex gap-1">
                    <select className="flex-1 text-xs rounded-md px-2 py-1.5 outline-none" style={inputStyle}
                      value={startMonth}
                      onChange={(e) => {
                        const m = Number(e.target.value);
                        setStartMonth(m);
                        // Initial scheduling: end always follows; editing: push end if start exceeds it
                        if (wantsToSchedule || startYear * 12 + m > endYear * 12 + endMonth)
                          setEndMonth(m);
                      }}>
                      {MONTH_NAMES_LONG.map((m, i) => <option key={m} value={i}>{m.slice(0, 3)}</option>)}
                    </select>
                    <select className="text-xs rounded-md px-2 py-1.5 outline-none" style={inputStyle}
                      value={startYear}
                      onChange={(e) => {
                        const y = Number(e.target.value);
                        setStartYear(y);
                        if (wantsToSchedule || y * 12 + startMonth > endYear * 12 + endMonth) {
                          setEndMonth(startMonth);
                          setEndYear(y);
                        }
                      }}>
                      {years.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>

                {/* End */}
                <div className="flex flex-col gap-1 flex-1">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{TRIP_EDIT.labels.calendarEnd}</span>
                  <div className="flex gap-1">
                    <select className="flex-1 text-xs rounded-md px-2 py-1.5 outline-none" style={inputStyle}
                      value={endMonth}
                      onChange={(e) => {
                        const m = Number(e.target.value);
                        // Snap back to start if end would go before it
                        setEndMonth(endYear * 12 + m < startYear * 12 + startMonth ? startMonth : m);
                      }}>
                      {MONTH_NAMES_LONG.map((m, i) => <option key={m} value={i}>{m.slice(0, 3)}</option>)}
                    </select>
                    <select className="text-xs rounded-md px-2 py-1.5 outline-none" style={inputStyle}
                      value={endYear}
                      onChange={(e) => {
                        const y = Number(e.target.value);
                        if (y * 12 + endMonth < startYear * 12 + startMonth) {
                          setEndMonth(startMonth);
                          setEndYear(startYear);
                        } else {
                          setEndYear(y);
                        }
                      }}>
                      {years.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Book By — only available when scheduled */}
          {localIsScheduled && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs" style={{ color: "var(--text-muted)" }}>{TRIP_EDIT.labels.bookByDate}</label>
                <button onClick={() => { setShowBookBy(!showBookBy); setBookByError(""); }}
                  className="text-xs px-2 py-0.5 rounded-full border transition-all"
                  style={{
                    borderColor: showBookBy ? "var(--accent)" : "var(--border)",
                    color: showBookBy ? "var(--accent)" : "var(--text-muted)",
                    background: showBookBy ? "var(--accent-dim)" : "transparent",
                  }}>
                  {showBookBy ? TRIP_EDIT.actions.removeBookBy : TRIP_EDIT.actions.addBookBy}
                </button>
              </div>
              {showBookBy && (
                <>
                  <div className="flex gap-2 items-center">
                    <select className="text-sm rounded-md px-2 py-1.5 outline-none flex-1" style={inputStyle}
                      value={bookByMonth} onChange={(e) => { setBookByMonth(Number(e.target.value)); setBookByError(""); }}>
                      {MONTH_NAMES_LONG.map((m, i) => <option key={m} value={i}>{m}</option>)}
                    </select>
                    <select className="text-sm rounded-md px-2 py-1.5 outline-none" style={inputStyle}
                      value={bookByYear} onChange={(e) => { setBookByYear(Number(e.target.value)); setBookByError(""); }}>
                      {Array.from({ length: 8 }, (_, i) => currentYear + i).map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <input type="number" min={1} max={31} placeholder="Day (opt)"
                      className="w-20 text-sm rounded-md px-2 py-1.5 outline-none text-center" style={inputStyle}
                      value={bookByDay} onChange={(e) => setBookByDay(e.target.value)} />
                  </div>
                  {bookByError && <p className="text-xs" style={{ color: "#ef4444" }}>{bookByError}</p>}
                  {(() => {
                    if (trip.status === "booked" || trip.status === "completed") return null;
                    const limit = new Date(bookByYear, bookByMonth, bookByDay ? Number(bookByDay) : 1);
                    if (limit >= new Date()) return null;
                    return (
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle size={12} style={{ color: "#f59e0b", flexShrink: 0 }} />
                        <p className="text-xs" style={{ color: "#f59e0b" }}>
                          {TRIP_EDIT.warnings.bookByPassed}
                        </p>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* Image URL */}
          <div className="flex flex-col gap-1">
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>{TRIP_EDIT.labels.imageUrl}</label>
            <div className="relative">
              <input className="w-full text-sm rounded-md px-3 py-2 pr-8 outline-none" style={inputStyle}
                value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                placeholder={TRIP_EDIT.placeholders.imageUrl} />
              {imageUrl && (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded"
                  style={{ color: "var(--text-muted)" }}
                  onClick={() => setImageUrl("")}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>{TRIP_EDIT.labels.notes}</label>
            <textarea className="w-full text-sm rounded-md px-3 py-2 outline-none resize-none"
              style={{ ...inputStyle, minHeight: "72px" }}
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder={TRIP_EDIT.placeholders.notes} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0 gap-3"
          style={{ borderTop: "1px solid var(--border-subtle)" }}>
          {confirmDelete ? (
            <div className="flex items-center gap-2 flex-wrap">
              {trip.status === "booked" && (
                <span className="text-xs font-medium" style={{ color: "#ef4444" }}>{TRIP_EDIT.warnings.bookedLabel}</span>
              )}
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{TRIP_EDIT.warnings.deletePrompt}</span>
              <button onClick={handleDelete} className="text-xs px-3 py-1.5 rounded-md font-medium"
                style={{ background: "#ef4444", color: "#fff" }}>{TRIP_EDIT.actions.deleteConfirm}</button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs px-3 py-1.5 rounded-md"
                style={{ background: "var(--surface-3)", color: "var(--text-secondary)" }}>{TRIP_EDIT.actions.cancel}</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors hover:bg-red-950"
              style={{ color: "#ef4444" }}>
              <Trash2 size={12} />
              {TRIP_EDIT.actions.deleteTrip}
            </button>
          )}

          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg"
              style={{ background: "var(--surface-3)", color: "var(--text-secondary)" }}>
              {TRIP_EDIT.actions.cancel}
            </button>
            <button onClick={handleSave}
              className="text-sm px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-90"
              style={{ background: "var(--btn-primary)", color: "var(--btn-primary-text)" }}>
              {TRIP_EDIT.actions.saveChanges}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
