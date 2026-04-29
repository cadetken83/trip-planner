import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Trip, Group, FilterState, ScheduledRange,
  TripCategory, Theme, Budget, BlackoutDate,
  DEFAULT_GROUPS, DEFAULT_CATEGORIES, DEFAULT_BUDGET, GROUP_COLOR_PALETTE,
} from "@/types";

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED_TRIPS: Trip[] = [
  {
    id: "trip-1", title: "Tokyo Adventure", destination: "Tokyo, Japan",
    continent: "Asia", groupId: "family", categoryId: "city",
    status: "unscheduled", durationWeeks: 2, tags: ["food", "culture", "example"],
    imageUrl: "https://wallpapertag.com/wallpaper/full/2/f/e/519365-large-japanese-scenery-wallpaper-2048x1401.jpg",
  },
  {
    id: "trip-2", title: "Amalfi Coast", destination: "Amalfi, Italy",
    continent: "Europe", groupId: "couples", categoryId: "beach",
    status: "unscheduled", durationWeeks: 1, tags: ["food", "example"],
    imageUrl: "https://wallpaperaccess.com/full/2122279.jpg",
  },
  {
    id: "trip-3", title: "Patagonia Trek", destination: "Patagonia, Argentina",
    continent: "South America", groupId: "solo", categoryId: "hiking",
    status: "unscheduled", durationWeeks: 3, tags: ["example"],
    imageUrl: "https://cdn.pixabay.com/photo/2022/11/25/20/11/argentina-7616819_1280.jpg",
  },
  {
    id: "trip-4", title: "Safari", destination: "Serengeti, Tanzania",
    continent: "Africa", groupId: "family", categoryId: "safari",
    status: "unscheduled", durationWeeks: 2, tags: ["example"],
    imageUrl: "https://www.theluxeinsider.com/wp-content/uploads/2022/12/african-savannah.jpeg",
  },
];

const SEED_ORDER = SEED_TRIPS.map((t) => t.id);

// ─── Store shape ──────────────────────────────────────────────────────────────

type TripStore = {
  trips: Trip[];
  tripOrder: string[];   // ordered list of trip IDs for sidebar
  groups: Group[];
  categories: TripCategory[];
  filters: FilterState;
  theme: Theme;
  defaultView: "planner" | "trips";

  addTrip: (trip: Trip) => void;
  updateTrip: (id: string, updates: Partial<Trip>) => void;
  removeTrip: (id: string) => void;
  reorderTrips: (orderedIds: string[]) => void;
  scheduleTrip: (id: string, range: ScheduledRange) => void;
  unscheduleTrip: (id: string) => void;
  bookTrip: (id: string) => void;
  unbookTrip: (id: string) => void;
  completeTrip: (id: string) => void;
  uncompleteTrip: (id: string) => void;

  addGroup: (group: Omit<Group, "color"> & { color?: string }) => void;
  updateGroup: (id: string, updates: Partial<Group>) => void;
  removeGroup: (id: string) => void;
  setDefaultGroup: (id: string) => void;

  addCategory: (category: TripCategory) => void;
  updateCategory: (id: string, updates: Partial<TripCategory>) => void;
  removeCategory: (id: string) => void;

  setGroupFilter: (groupIds: string[]) => void;
  setContinentFilter: (continents: FilterState["continents"]) => void;
  setStatusFilter: (statuses: FilterState["statuses"]) => void;
  setCategoryFilter: (categoryIds: string[]) => void;
  toggleShowCompleted: () => void;
  setSearchQuery: (q: string) => void;
  clearFilters: () => void;

  toggleTheme: () => void;
  setDefaultView: (v: "planner" | "trips") => void;

  budget: Budget;
  setBudget: (updates: Partial<Omit<Budget, "annualAllocations">>) => void;
  setAnnualAllocation: (year: number, amount: number) => void;

  blackoutDates: BlackoutDate[];
  addBlackoutDate: (b: BlackoutDate) => void;
  updateBlackoutDate: (id: string, updates: Partial<Omit<BlackoutDate, "id">>) => void;
  removeBlackoutDate: (id: string) => void;

  importData: (data: {
    trips: Trip[];
    tripOrder: string[];
    groups: Group[];
    categories: TripCategory[];
    budget?: Budget;
    blackoutDates?: BlackoutDate[];
  }) => void;
};

function getNextColor(usedColors: string[]): string {
  const available = GROUP_COLOR_PALETTE.filter((c) => !usedColors.includes(c));
  return available.length > 0
    ? available[0]
    : GROUP_COLOR_PALETTE[usedColors.length % GROUP_COLOR_PALETTE.length];
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTripStore = create<TripStore>()(
  persist(
    (set, get) => ({
      trips: SEED_TRIPS,
      tripOrder: SEED_ORDER,
      groups: DEFAULT_GROUPS,
      categories: DEFAULT_CATEGORIES,
      budget: DEFAULT_BUDGET,
      blackoutDates: [],
      theme: "light",
      defaultView: "planner",
      filters: {
        groupIds: [], continents: [], statuses: [],
        categoryIds: [], showCompleted: false, searchQuery: "",
      },

      addTrip: (trip) =>
        set((s) => ({
          trips: [...s.trips, trip],
          tripOrder: [...s.tripOrder, trip.id],
        })),

      updateTrip: (id, updates) =>
        set((s) => ({
          trips: s.trips.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),

      removeTrip: (id) =>
        set((s) => ({
          trips: s.trips.filter((t) => t.id !== id),
          tripOrder: s.tripOrder.filter((oid) => oid !== id),
        })),

      reorderTrips: (orderedIds) =>
        set({ tripOrder: orderedIds }),

      scheduleTrip: (id, range) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === id ? { ...t, scheduled: range, status: "planning" } : t
          ),
        })),

      unscheduleTrip: (id) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === id ? { ...t, scheduled: undefined, status: "unscheduled" } : t
          ),
        })),

      bookTrip: (id) =>
        set((s) => ({
          trips: s.trips.map((t) => (t.id === id ? { ...t, status: "booked" } : t)),
        })),

      unbookTrip: (id) =>
        set((s) => ({
          trips: s.trips.map((t) => (t.id === id ? { ...t, status: "planning" } : t)),
        })),

      completeTrip: (id) =>
        set((s) => ({
          trips: s.trips.map((t) => (t.id === id ? { ...t, status: "completed" } : t)),
        })),

      uncompleteTrip: (id) =>
        set((s) => ({
          trips: s.trips.map((t) => (t.id === id ? { ...t, status: "planning" } : t)),
        })),

      addGroup: (groupInput) => {
        const usedColors = get().groups.map((g) => g.color);
        const color = groupInput.color ?? getNextColor(usedColors);
        set((s) => ({ groups: [...s.groups, { ...groupInput, color }] }));
      },

      updateGroup: (id, updates) =>
        set((s) => ({
          groups: s.groups.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        })),

      removeGroup: (id) =>
        set((s) => ({
          groups: s.groups.filter((g) => g.id !== id),
          filters: { ...s.filters, groupIds: s.filters.groupIds.filter((gid) => gid !== id) },
        })),

      setDefaultGroup: (id) =>
        set((s) => ({
          groups: s.groups.map((g) => ({ ...g, isDefault: g.id === id })),
        })),

      addCategory: (category) =>
        set((s) => ({ categories: [...s.categories, category] })),

      updateCategory: (id, updates) =>
        set((s) => ({
          categories: s.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),

      removeCategory: (id) =>
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          filters: { ...s.filters, categoryIds: s.filters.categoryIds.filter((cid) => cid !== id) },
        })),

      setGroupFilter: (groupIds) =>
        set((s) => ({ filters: { ...s.filters, groupIds } })),

      setContinentFilter: (continents) =>
        set((s) => ({ filters: { ...s.filters, continents } })),

      setStatusFilter: (statuses) =>
        set((s) => ({ filters: { ...s.filters, statuses } })),

      setCategoryFilter: (categoryIds) =>
        set((s) => ({ filters: { ...s.filters, categoryIds } })),

      toggleShowCompleted: () =>
        set((s) => ({
          filters: { ...s.filters, showCompleted: !s.filters.showCompleted },
        })),

      setSearchQuery: (searchQuery) =>
        set((s) => ({ filters: { ...s.filters, searchQuery } })),

      clearFilters: () =>
        set({
          filters: {
            groupIds: [], continents: [], statuses: [],
            categoryIds: [], showCompleted: false, searchQuery: "",
          },
        }),

      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),

      setDefaultView: (v) => set({ defaultView: v }),

      setBudget: (updates) =>
        set((s) => ({ budget: { ...s.budget, ...updates } })),
      setAnnualAllocation: (year, amount) =>
        set((s) => ({
          budget: {
            ...s.budget,
            annualAllocations: { ...s.budget.annualAllocations, [year]: amount },
          },
        })),

      addBlackoutDate: (b) =>
        set((s) => ({ blackoutDates: [...s.blackoutDates, b] })),

      updateBlackoutDate: (id, updates) =>
        set((s) => ({
          blackoutDates: s.blackoutDates.map((b) => b.id === id ? { ...b, ...updates } : b),
        })),

      removeBlackoutDate: (id) =>
        set((s) => ({ blackoutDates: s.blackoutDates.filter((b) => b.id !== id) })),

      importData: (data) =>
        set({
          trips: data.trips,
          tripOrder: data.tripOrder,
          groups: data.groups?.length ? data.groups : DEFAULT_GROUPS,
          categories: data.categories?.length ? data.categories : DEFAULT_CATEGORIES,
          budget: data.budget ?? DEFAULT_BUDGET,
          blackoutDates: data.blackoutDates ?? [],
          filters: {
            groupIds: [], continents: [], statuses: [],
            categoryIds: [], showCompleted: false, searchQuery: "",
          },
        }),
    }),
    {
      name: "trip-planner-storage",
      merge: (persisted: any, current) => {
        const seedById = Object.fromEntries(SEED_TRIPS.map((t) => [t.id, t]));
        const trips = (persisted?.trips ?? current.trips).map((t: Trip) => {
          const seed = seedById[t.id];
          if (!seed) return t;
          return {
            ...t,
            imageUrl: t.imageUrl ?? seed.imageUrl,
            tags: t.tags?.includes("example") ? t.tags : [...(t.tags ?? []), "example"],
          };
        });
        return {
          ...current,
          ...persisted,
          trips,
          tripOrder: persisted?.tripOrder ?? trips.map((t: Trip) => t.id),
          filters: {
            groupIds: [], continents: [], statuses: [],
            categoryIds: [], showCompleted: false, searchQuery: "",
            ...(persisted?.filters ?? {}),
          },
          categories: persisted?.categories ?? current.categories,
          theme: persisted?.theme ?? "light",
          defaultView: persisted?.defaultView ?? "planner",
          blackoutDates: persisted?.blackoutDates ?? [],
          groups: (persisted?.groups ?? current.groups).map((g: any) => ({
            isDefault: false, ...g,
          })),
        };
      },
    }
  )
);

// ─── Selectors ────────────────────────────────────────────────────────────────

function matchesSearch(t: Trip, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  return (
    t.title.toLowerCase().includes(lower) ||
    (t.destination?.toLowerCase().includes(lower) ?? false) ||
    (t.tags?.some((tag) => tag.toLowerCase().includes(lower)) ?? false)
  );
}

export const selectUnscheduledTrips = (
  trips: Trip[],
  tripOrder: string[],
  filters: FilterState
) => {
  const ordered = tripOrder
    .map((id) => trips.find((t) => t.id === id))
    .filter((t): t is Trip => !!t && t.status === "unscheduled");

  return ordered.filter((t) => {
    if (!matchesSearch(t, filters.searchQuery)) return false;
    if (filters.groupIds.length && !filters.groupIds.includes(t.groupId)) return false;
    if (filters.continents.length && t.continent && !filters.continents.includes(t.continent)) return false;
    if (filters.categoryIds.length && (!t.categoryId || !filters.categoryIds.includes(t.categoryId))) return false;
    return true;
  });
};

export const selectScheduledTrips = (trips: Trip[], filters: FilterState) =>
  trips.filter((t) => {
    if (!t.scheduled) return false;
    if (t.status === "unscheduled") return false;
    if (t.status === "completed" && !filters.showCompleted) return false;
    if (!matchesSearch(t, filters.searchQuery)) return false;
    if (filters.groupIds.length && !filters.groupIds.includes(t.groupId)) return false;
    if (filters.continents.length && t.continent && !filters.continents.includes(t.continent)) return false;
    if (filters.statuses.length && !filters.statuses.includes(t.status)) return false;
    if (filters.categoryIds.length && (!t.categoryId || !filters.categoryIds.includes(t.categoryId))) return false;
    return true;
  });

// ─── Blackout helpers ─────────────────────────────────────────────────────────

export function blackoutTouchesMonth(b: BlackoutDate, month: number, year: number): boolean {
  const m = year * 12 + month;
  return m >= b.startYear * 12 + b.startMonth && m <= b.endYear * 12 + b.endMonth;
}

export function tripOverlapsBlackout(trip: Trip, blackouts: BlackoutDate[]): boolean {
  if (!trip.scheduled) return false;
  // +1 normalizes trip months (0-indexed) to match BlackoutDate months (1-indexed)
  const ts = trip.scheduled.startYear * 12 + trip.scheduled.startMonth + 1;
  const te = trip.scheduled.endYear   * 12 + trip.scheduled.endMonth   + 1;
  return blackouts.some((b) => {
    const bs = b.startYear * 12 + b.startMonth;
    const be = b.endYear   * 12 + b.endMonth;
    return ts <= be && te >= bs;
  });
}
