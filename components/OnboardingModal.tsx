"use client";

import { useEffect, useRef, useState } from "react";
import {
  X, GripVertical, ChevronRight,
  CalendarDays, List, Clock, Settings, Download, Upload,
} from "lucide-react";
import { useTripStore } from "@/store/useTripStore";
import { ONBOARDING } from "@/lib/content";

// ─── Slide Visuals ────────────────────────────────────────────────────────────

function VisualWelcome() {
  return (
    <div style={{
      background: "var(--surface-2)", border: "1px solid var(--border)",
      borderRadius: 8, padding: 8, width: "100%",
    }}>
      <div style={{
        background: "var(--surface-1)", borderBottom: "1px solid var(--border)",
        borderRadius: "6px 6px 0 0", padding: "5px 10px",
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <span style={{ color: "var(--accent)", fontWeight: 700, fontSize: 10 }}>✦ Wanderlist</span>
        <div style={{ display: "flex", gap: 3, marginLeft: "auto" }}>
          {["Timeline", "Trips", "History", "Settings"].map((label) => (
            <span key={label} style={{
              fontSize: 8, padding: "1px 5px", borderRadius: 3,
              background: label === "Timeline" ? "var(--accent-dim)" : "transparent",
              color: label === "Timeline" ? "var(--accent)" : "var(--text-muted)",
            }}>{label}</span>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 5, padding: 6, height: 100 }}>
        <div style={{
          width: 80, background: "var(--surface-1)", border: "1px solid var(--border)",
          borderRadius: 4, padding: 5,
        }}>
          <div style={{ fontSize: 7, color: "var(--text-muted)", marginBottom: 4 }}>Unscheduled</div>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ height: 12, background: "var(--surface-3)", borderRadius: 3, marginBottom: 3 }} />
          ))}
        </div>
        <div style={{
          flex: 1, background: "var(--surface-1)", border: "1px solid var(--border)",
          borderRadius: 4, padding: 5,
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 3, height: "100%" }}>
            {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"].map((m) => (
              <div key={m} style={{
                background: "var(--surface-2)", borderRadius: 3,
                display: "flex", alignItems: "flex-start", padding: "2px 3px",
              }}>
                <span style={{ fontSize: 6, color: "var(--text-muted)" }}>{m}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function VisualAddTrip() {
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div style={{
        width: 200, background: "var(--surface-2)", border: "1px solid var(--border)",
        borderRadius: 8, padding: 12,
      }}>
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", marginBottom: 10,
        }}>
          <span style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 600 }}>
            Unscheduled Trips
          </span>
          <span style={{
            background: "var(--accent)", color: "#000", borderRadius: "50%",
            width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700, lineHeight: 1,
            boxShadow: "0 0 0 3px var(--accent-dim)",
          }}>+</span>
        </div>
        {["Tokyo Adventure", "Amalfi Coast"].map((title) => (
          <div key={title} style={{
            height: 28, background: "var(--surface-1)", border: "1px solid var(--border)",
            borderRadius: 4, marginBottom: 4, padding: "0 8px",
            display: "flex", alignItems: "center",
          }}>
            <span style={{ fontSize: 9, color: "var(--text-secondary)" }}>{title}</span>
          </div>
        ))}
        <p style={{ fontSize: 8, color: "var(--accent)", marginTop: 8, marginBottom: 0, textAlign: "right" }}>
          tap + to add a trip ↑
        </p>
      </div>
    </div>
  );
}

function VisualSchedule() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{
        width: 120, background: "var(--surface-2)", border: "1px solid var(--border)",
        borderRadius: 6, padding: 8,
      }}>
        <div style={{ fontSize: 8, color: "var(--text-muted)", marginBottom: 6 }}>Unscheduled</div>
        <div style={{
          height: 32, background: "var(--surface-1)", border: "1px solid var(--border)",
          borderRadius: 4, display: "flex", alignItems: "center", gap: 4, padding: "0 6px",
        }}>
          <GripVertical size={10} color="var(--text-muted)" />
          <span style={{ fontSize: 8, color: "var(--text-secondary)" }}>Tokyo Adventure</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <ChevronRight size={18} color="var(--accent)" />
        <span style={{ fontSize: 7, color: "var(--text-muted)" }}>drag</span>
      </div>

      <div style={{
        flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)",
        borderRadius: 6, padding: 8,
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 3, marginBottom: 6 }}>
          {["Jun", "Jul", "Aug"].map((m) => (
            <div key={m} style={{ background: "var(--surface-1)", borderRadius: 3, padding: "3px 5px" }}>
              <span style={{ fontSize: 7, color: "var(--text-muted)" }}>{m}</span>
            </div>
          ))}
        </div>
        <div style={{
          height: 7, background: "var(--accent)", opacity: 0.85,
          borderRadius: 4, width: "68%", marginLeft: "4%",
        }} />
      </div>
    </div>
  );
}

function VisualEditModal() {
  return (
    <div style={{ display: "flex", justifyContent: "center" }}>
      <div style={{
        width: 240, background: "var(--surface-1)", border: "1px solid var(--border)",
        borderTop: "3px solid var(--accent)", borderRadius: 8, padding: 12,
        pointerEvents: "none",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 10,
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)" }}>
            Trip Details
          </span>
          <X size={12} color="var(--text-muted)" />
        </div>
        {["Trip Name", "Destination", "Status"].map((field) => (
          <div key={field} style={{ marginBottom: 7 }}>
            <div style={{ fontSize: 8, color: "var(--text-muted)", marginBottom: 2 }}>{field}</div>
            <div style={{
              height: 18, background: "var(--surface-2)",
              border: "1px solid var(--border)", borderRadius: 3,
            }} />
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: 8 }}>
          <div style={{
            height: 22, width: 55, background: "var(--surface-2)",
            border: "1px solid var(--border)", borderRadius: 4,
          }} />
          <div style={{ height: 22, width: 80, background: "var(--accent)", borderRadius: 4 }} />
        </div>
      </div>
    </div>
  );
}

function VisualExplore() {
  const tabs = [
    { label: "Timeline", icon: <CalendarDays size={9} />, active: true },
    { label: "Trips", icon: <List size={9} />, active: false },
    { label: "History", icon: <Clock size={9} />, active: false },
    { label: "Settings", icon: <Settings size={9} />, active: false },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{
        display: "flex", gap: 3, background: "var(--surface-2)",
        border: "1px solid var(--border)", borderRadius: 6, padding: 6,
        alignItems: "center",
      }}>
        {tabs.map((tab) => (
          <div key={tab.label} style={{
            display: "flex", alignItems: "center", gap: 3,
            padding: "3px 7px", borderRadius: 4,
            background: tab.active ? "var(--accent-dim)" : "transparent",
            color: tab.active ? "var(--accent)" : "var(--text-muted)",
            fontSize: 9,
          }}>
            {tab.icon}
            <span>{tab.label}</span>
          </div>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 5, alignItems: "center" }}>
          <div style={{ width: 1, height: 12, background: "var(--border)" }} />
          <Download size={11} color="var(--text-muted)" />
          <Upload size={11} color="var(--text-muted)" />
        </div>
      </div>
      <p style={{ fontSize: 10, color: "var(--text-muted)", textAlign: "center", margin: 0 }}>
        Use{" "}
        <span style={{ color: "var(--accent)" }}>↓ Export</span>
        {" & "}
        <span style={{ color: "var(--accent)" }}>↑ Import</span>
        {" "}to back up and restore your trips as JSON
      </p>
    </div>
  );
}

// ─── Step Data ────────────────────────────────────────────────────────────────

type Step = { title: string; body: string; Visual: React.FC };

const VISUALS: React.FC[] = [VisualWelcome, VisualAddTrip, VisualSchedule, VisualEditModal, VisualExplore];

const STEPS: Step[] = ONBOARDING.steps.map((s, i) => ({ ...s, Visual: VISUALS[i] }));

// ─── Modal ────────────────────────────────────────────────────────────────────

type OnboardingModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const { setHasSeenOnboarding } = useTripStore();
  const [currentStep, setCurrentStep] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) setCurrentStep(0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setHasSeenOnboarding(true);
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, setHasSeenOnboarding]);

  useEffect(() => {
    if (isOpen) dialogRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  const isFirst = currentStep === 0;
  const isLast = currentStep === STEPS.length - 1;
  const { title, body, Visual } = STEPS[currentStep];

  function handleFinish() {
    setHasSeenOnboarding(true);
    onClose();
  }

  function handleNext() {
    if (isLast) handleFinish();
    else setCurrentStep((s) => s + 1);
  }

  function handleBack() {
    if (!isFirst) setCurrentStep((s) => s - 1);
  }

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={handleFinish}
        style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0, 0, 0, 0.7)",
        }}
      />

      {/* Centering wrapper */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 51,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 16px",
          pointerEvents: "none",
        }}
      >
        {/* Dialog */}
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%", maxWidth: 520,
            maxHeight: "90vh", overflowY: "auto",
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderTop: "3px solid var(--accent)",
            borderRadius: 12,
            boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
            pointerEvents: "auto",
            outline: "none",
          }}
        >
          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px 0",
          }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Step {currentStep + 1} of {STEPS.length}
            </span>
            <button
              onClick={handleFinish}
              aria-label="Close tour"
              style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-muted)", padding: 2,
                display: "flex", alignItems: "center",
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Visual */}
          <div style={{ padding: "16px 20px 0" }}>
            <Visual />
          </div>

          {/* Content */}
          <div style={{ padding: "16px 20px 0" }}>
            <h2 style={{
              margin: "0 0 8px",
              fontSize: 18, fontWeight: 700,
              color: "var(--text-primary)",
              fontFamily: "var(--font-display, serif)",
            }}>
              {title}
            </h2>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "var(--text-secondary)" }}>
              {body}
            </p>
          </div>

          {/* Step dots */}
          <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "16px 20px 0" }}>
            {STEPS.map((_, i) => (
              <span key={i} style={{
                width: 7, height: 7, borderRadius: "50%", display: "inline-block",
                background: i === currentStep ? "var(--accent)" : "var(--surface-3)",
                transition: "background 0.2s",
              }} />
            ))}
          </div>

          {/* Footer */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 20px 20px",
          }}>
            <div style={{ width: 64 }}>
              {!isFirst && (
                <button
                  onClick={handleBack}
                  style={{
                    background: "none", border: "1px solid var(--border)",
                    borderRadius: 6, padding: "6px 12px", cursor: "pointer",
                    fontSize: 13, color: "var(--text-muted)",
                  }}
                >
                  {ONBOARDING.buttons.back}
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {!isLast && (
                <button
                  onClick={handleFinish}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 13, color: "var(--text-muted)", padding: "6px 4px",
                  }}
                >
                  {ONBOARDING.buttons.skip}
                </button>
              )}
              <button
                onClick={handleNext}
                style={{
                  background: "var(--accent)", border: "none",
                  borderRadius: 6, padding: "6px 18px", cursor: "pointer",
                  fontSize: 13, fontWeight: 600, color: "#000",
                }}
              >
                {isLast ? ONBOARDING.buttons.getStarted : ONBOARDING.buttons.next}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
