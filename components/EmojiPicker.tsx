"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const TRAVEL_EMOJIS = [
  // Transport (8)
  "✈️", "🚢", "🚗", "🚂", "🚁", "🛥️", "🚌", "🏍️",
  // Nature (9)
  "🏖️", "🏔️", "🌊", "🌴", "🏜️", "🌋", "🗻", "🏕️", "🏞️",
  // Activities (9)
  "⛷️", "🥾", "🤿", "🧗", "🏄", "🎭", "🍽️", "🎵", "🎨",
  // Places (9)
  "🏙️", "🏛️", "🗼", "🗽", "🏯", "⛩️", "🎡", "🏟️", "🌉",
  // Wildlife (6)
  "🦁", "🐘", "🦒", "🐧", "🦜", "🦋",
  // Misc (8)
  "🧳", "📸", "🌍", "🗺️", "🧭", "⭐", "🍹", "🎒",
]; // 49 total (7×7)

interface Props {
  value: string;
  onChange: (emoji: string) => void;
}

export function EmojiPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (btnRef.current && !btnRef.current.contains(target)) {
        // also allow clicks inside the portal grid
        const grid = document.getElementById("emoji-picker-portal");
        if (!grid || !grid.contains(target)) setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const GRID_W = 232;
      const GRID_H = 224;

      // Walk up the DOM to find the nearest overflow-hidden ancestor (the panel card).
      // Use its right edge as the max right boundary so the grid stays within the panel.
      let maxRight = window.innerWidth - 8;
      let el: HTMLElement | null = btnRef.current.parentElement;
      while (el && el !== document.body) {
        const cs = window.getComputedStyle(el);
        if (cs.overflowX === "hidden" || cs.overflow === "hidden") {
          maxRight = el.getBoundingClientRect().right - 4;
          break;
        }
        el = el.parentElement;
      }

      const left = Math.max(8, Math.min(r.left, maxRight - GRID_W));

      let top = r.bottom + 4;
      if (top + GRID_H > window.innerHeight - 8) {
        top = r.top - GRID_H - 4;
      }

      setCoords({ top, left });
    }
    setOpen((o) => !o);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className="text-base rounded-md px-2 py-1.5 outline-none w-14 text-center transition-colors"
        style={{
          background: "var(--surface-3)",
          border: `1px solid ${open ? "var(--accent)" : "var(--border)"}`,
          color: "var(--text-primary)",
          cursor: "pointer",
        }}
      >
        {value || "✈️"}
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          id="emoji-picker-portal"
          className="rounded-lg p-2 grid gap-0.5"
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            zIndex: 9999,
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
            gridTemplateColumns: "repeat(7, 1fr)",
            width: "210px",
          }}
        >
          {TRAVEL_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => { onChange(emoji); setOpen(false); }}
              className="text-base rounded p-1 text-center transition-colors"
              style={{ lineHeight: 1 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-3)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {emoji}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
