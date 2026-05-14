// ─── Continents ───────────────────────────────────────────────────────────────

export type Continent =
  | "North America"
  | "South America"
  | "Europe"
  | "Africa"
  | "Asia"
  | "Oceania"
  | "Antarctica";

// ─── Groups ───────────────────────────────────────────────────────────────────

export type Group = {
  id: string;
  name: string;
  color: string;
  isDefault?: boolean;
};

export const GROUP_COLOR_PALETTE = [
  "#3B82F6", "#EC4899", "#10B981", "#F59E0B", "#8B5CF6",
  "#EF4444", "#06B6D4", "#84CC16", "#F97316", "#6366F1",
];

export const DEFAULT_GROUPS: Group[] = [
  { id: "family",  name: "Family",  color: "#3B82F6", isDefault: true },
  { id: "couples", name: "Couples", color: "#EC4899" },
  { id: "solo",    name: "Solo",    color: "#10B981" },
  { id: "friends", name: "Friends", color: "#F59E0B" },
];

// ─── Trip Categories ──────────────────────────────────────────────────────────

export type TripCategory = {
  id: string;
  name: string;
  icon: string; // emoji icon
};

export const DEFAULT_CATEGORIES: TripCategory[] = [
  { id: "beach",     name: "Beach",        icon: "🏖️" },
  { id: "ski",       name: "Ski",          icon: "⛷️" },
  { id: "cruise",    name: "Cruise",       icon: "🚢" },
  { id: "city",      name: "City Break",   icon: "🏙️" },
  { id: "safari",    name: "Safari",       icon: "🦁" },
  { id: "hiking",    name: "Hiking",       icon: "🥾" },
  { id: "road-trip", name: "Road Trip",    icon: "🚗" },
  { id: "cultural",  name: "Cultural",     icon: "🏛️" },
];

// ─── Trip Status ──────────────────────────────────────────────────────────────

export type TripStatus = "unscheduled" | "planning" | "booked" | "completed";

// ─── Scheduled Range ──────────────────────────────────────────────────────────

export type ScheduledRange = {
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
};

// ─── Book By Date ─────────────────────────────────────────────────────────────

export type BookBy = {
  month: number;
  year: number;
  day?: number;
};

// ─── Trip ─────────────────────────────────────────────────────────────────────

export type Trip = {
  id: string;
  title: string;
  destination: string;
  continent?: Continent;
  groupId: string;
  categoryId?: string;
  status: TripStatus;
  scheduled?: ScheduledRange;
  durationWeeks?: number;
  estimatedCost?: number;
  bookBy?: BookBy;
  notes?: string;
  tags?: string[];
  imageUrl?: string;
  // Collaboration fields (undefined when store not yet initialized)
  workspaceId?: string;
  isPrivate?: boolean;
  createdBy?: string;
  updatedBy?: string;
  updatedByName?: string;
  updatedAt?: string;
};

// ─── Filter State ─────────────────────────────────────────────────────────────

export type FilterState = {
  groupIds: string[];
  continents: Continent[];
  statuses: TripStatus[];
  categoryIds: string[];
  searchQuery: string;
};

// ─── Drag / Drop ──────────────────────────────────────────────────────────────

export type DragData = { tripId: string };
export type DropData = { month: number; year: number };

// ─── Budget ───────────────────────────────────────────────────────────────────

export type Budget = {
  currency: string;
  totalBudget: number;
  annualAllocations: Record<number, number>;
};

export const DEFAULT_BUDGET: Budget = {
  currency: "USD",
  totalBudget: 0,
  annualAllocations: {},
};

// ─── Blackout Dates ───────────────────────────────────────────────────────────

export type BlackoutDate = {
  id: string;
  label: string;
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
};

// ─── Theme ────────────────────────────────────────────────────────────────────

export type Theme = "dark" | "light";

// ─── Collaboration ────────────────────────────────────────────────────────────

export type WorkspaceRole = "owner" | "editor" | "viewer";

export type Workspace = {
  id: string;
  name: string;
  ownerId: string;
  inviteCode: string;
  createdAt: string;
};

export type WorkspaceMember = {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: string;
};
