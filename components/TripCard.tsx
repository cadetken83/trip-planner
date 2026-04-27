"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Trip, Group } from "@/types";
import { MapPin, Clock, GripVertical, Trash2 } from "lucide-react";
import TripEditModal from "@/components/TripEditModal";
import { useTripStore } from "@/store/useTripStore";

type Props = {
  trip: Trip;
  group: Group | undefined;
  sortHandleProps?: Record<string, any>; // from useSortable for reordering
};

export default function TripCard({ trip, group, sortHandleProps }: Props) {
  const { removeTrip } = useTripStore();
  const categories = useTripStore((s) => s.categories);
  const category = categories.find((c) => c.id === trip.categoryId);

  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hovered, setHovered] = useState(false);

  // useDraggable for dragging to calendar — separate from sort drag
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: trip.id, data: { tripId: trip.id } });

  const groupColor = group?.color ?? "#78716c";
  const hasImage = !!trip.imageUrl;
  const imageBg = hasImage
    ? `linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.55) 100%), url(${trip.imageUrl}) center/cover no-repeat`
    : `linear-gradient(135deg, ${groupColor}33 0%, ${groupColor}11 100%)`;

  return (
    <>
      <div
        className="relative rounded-lg overflow-hidden"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setShowDeleteConfirm(false); }}
      >
        <div
          ref={setNodeRef}
          style={{
            transform: CSS.Translate.toString(transform),
            background: "var(--surface-2)",
            opacity: isDragging ? 0.35 : 1,
            cursor: isDragging ? "grabbing" : "pointer",
            touchAction: "none",
            userSelect: "none",
            border: `1px solid var(--border-subtle)`,
            borderLeft: `3px solid ${groupColor}`,
          }}
          className="rounded-lg hover:shadow-lg"
          onClick={() => { if (!isDragging && !showDeleteConfirm) setShowEdit(true); }}
          suppressHydrationWarning
          {...attributes}
          {...listeners}
        >
          {/* Image / colour header */}
          <div style={{ height: "120px", background: imageBg, flexShrink: 0, position: "relative" }}>
            {/* Sort + drag handle — top left */}
            <div
              className="absolute top-2 left-2 cursor-grab active:cursor-grabbing rounded p-0.5"
              style={{ color: "#fff", opacity: 0.7, background: "rgba(0,0,0,0.3)" }}
              onMouseDown={(e) => e.stopPropagation()}
              {...(sortHandleProps ?? {})}
            >
              <GripVertical size={14} />
            </div>
          </div>

          {/* Card body */}
          <div className="p-3 pr-8">
            <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
              {trip.title}
            </p>

            {trip.destination && (
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin size={10} style={{ color: "var(--text-muted)" }} />
                <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                  {trip.destination}
                </span>
              </div>
            )}

            {trip.tags && trip.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {trip.tags.map((tag) => (
                  <span key={tag} className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: "var(--surface-3)", color: "var(--text-muted)" }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: `${groupColor}22`, color: groupColor }}>
                  {group?.name ?? "No group"}
                </span>
                {category && (
                  <span className="text-xs" title={category.name}>{category.icon}</span>
                )}
              </div>
              {trip.durationWeeks && (
                <div className="flex items-center gap-1">
                  <Clock size={10} style={{ color: "var(--text-muted)" }} />
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    ~{trip.durationWeeks}w
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delete button — floats over image header */}
        {hovered && !isDragging && (
          <div className="absolute top-2 right-2 z-10">
            {showDeleteConfirm ? (
              <div className="flex flex-col items-end gap-1">
                {trip.status === "booked" && (
                  <span className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: "#ef444422", color: "#ef4444" }}>
                    ⚠️ Booked!
                  </span>
                )}
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); removeTrip(trip.id); }}
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: "#ef4444", color: "#fff" }}>Delete</button>
                  <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: "var(--surface-3)", color: "var(--text-muted)" }}>No</button>
                </div>
              </div>
            ) : (
              <button onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: "var(--surface-3)", color: "var(--text-muted)" }}
                title="Delete trip">
                <Trash2 size={11} />
              </button>
            )}
          </div>
        )}
      </div>

      {showEdit && <TripEditModal trip={trip} onClose={() => setShowEdit(false)} />}
    </>
  );
}
