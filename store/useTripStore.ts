import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Trip, Group, FilterState, ScheduledRange,
  TripCategory, Theme, Budget, BlackoutDate,
  DEFAULT_GROUPS, DEFAULT_CATEGORIES, DEFAULT_BUDGET, GROUP_COLOR_PALETTE,
} from "@/types";

// ─── API helpers ──────────────────────────────────────────────────────────────

function apiFetch(url: string, method: string, body?: unknown): Promise<Response> {
  return fetch(url, {
    method,
    ...(body !== undefined
      ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      : {}),
  });
}

// Fire-and-forget API mutation — logs errors, never throws into the UI
function apiBg(p: Promise<Response>): void {
  void p.then((r) => {
    if (!r.ok) r.text().then((t) => console.error("API error:", r.status, t));
  }).catch(console.error);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNextColor(usedColors: string[]): string {
  const available = GROUP_COLOR_PALETTE.filter((c) => !usedColors.includes(c));
  return available.length > 0
    ? available[0]
    : GROUP_COLOR_PALETTE[usedColors.length % GROUP_COLOR_PALETTE.length];
}

// Convert a Supabase trips row to the client Trip type
function rowToTrip(row: Record<string, unknown>): Trip {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    title: row.title as string,
    destination: row.destination as string,
    continent: row.continent as Trip["continent"],
    groupId: row.group_id as string,
    categoryId: row.category_id as string | undefined,
    status: row.status as Trip["status"],
    scheduled: row.start_month != null ? {
      startMonth: row.start_month as number,
      startYear: row.start_year as number,
      endMonth: row.end_month as number,
      endYear: row.end_year as number,
    } : undefined,
    durationWeeks: row.duration_weeks as number | undefined,
    estimatedCost: row.estimated_cost as number | undefined,
    bookBy: row.book_by_month != null ? {
      month: row.book_by_month as number,
      year: row.book_by_year as number,
      day: row.book_by_day as number | undefined,
    } : undefined,
    notes: row.notes as string | undefined,
    tags: row.tags as string[] | undefined,
    imageUrl: row.image_url as string | undefined,
    isPrivate: row.is_private as boolean | undefined,
    createdBy: row.created_by as string | undefined,
    updatedBy: row.updated_by as string | undefined,
    updatedByName: row.updated_by_name as string | undefined,
    updatedAt: row.updated_at as string | undefined,
  };
}

// Convert client Trip to Supabase row shape for API requests
function tripToRow(trip: Trip, workspaceId: string, userId: string) {
  return {
    id: trip.id,
    workspace_id: workspaceId,
    title: trip.title,
    destination: trip.destination,
    continent: trip.continent ?? null,
    group_id: trip.groupId,
    category_id: trip.categoryId ?? null,
    status: trip.status,
    start_month: trip.scheduled?.startMonth ?? null,
    start_year: trip.scheduled?.startYear ?? null,
    end_month: trip.scheduled?.endMonth ?? null,
    end_year: trip.scheduled?.endYear ?? null,
    duration_weeks: trip.durationWeeks ?? null,
    estimated_cost: trip.estimatedCost ?? null,
    book_by_month: trip.bookBy?.month ?? null,
    book_by_year: trip.bookBy?.year ?? null,
    book_by_day: trip.bookBy?.day ?? null,
    notes: trip.notes ?? null,
    tags: trip.tags ?? null,
    image_url: trip.imageUrl ?? null,
    is_private: trip.isPrivate ?? false,
    created_by: trip.createdBy ?? userId,
    updated_by: userId,
    updated_by_name: trip.updatedByName ?? null,
  };
}

// ─── Store shape ──────────────────────────────────────────────────────────────

type TripStore = {
  // ── Data (Supabase-backed, not persisted to localStorage) ──
  trips: Trip[];
  tripOrder: string[];
  groups: Group[];
  categories: TripCategory[];
  budget: Budget;
  blackoutDates: BlackoutDate[];

  // ── Workspace / session ──
  currentWorkspaceId: string | null;
  currentUserId: string | null;
  isLoading: boolean;

  // ── UI (persisted to localStorage via partialize) ──
  theme: Theme;
  defaultView: "planner" | "trips";
  hasSeenOnboarding: boolean;         // derived at init() from seenOnboardingByUser; not persisted directly
  seenOnboardingByUser: Record<string, boolean>;
  filters: FilterState;

  // ── Lifecycle ──
  init: (workspaceId: string, userId: string) => Promise<void>;
  cleanup: () => void;

  // ── Trip actions ──
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

  // ── Group actions ──
  addGroup: (group: Omit<Group, "color"> & { color?: string }) => void;
  updateGroup: (id: string, updates: Partial<Group>) => void;
  removeGroup: (id: string) => void;
  setDefaultGroup: (id: string) => void;

  // ── Category actions ──
  addCategory: (category: TripCategory) => void;
  updateCategory: (id: string, updates: Partial<TripCategory>) => void;
  removeCategory: (id: string) => void;

  // ── Filter actions ──
  setGroupFilter: (groupIds: string[]) => void;
  setContinentFilter: (continents: FilterState["continents"]) => void;
  setStatusFilter: (statuses: FilterState["statuses"]) => void;
  setCategoryFilter: (categoryIds: string[]) => void;
  setSearchQuery: (q: string) => void;
  clearFilters: () => void;

  // ── UI actions ──
  toggleTheme: () => void;
  setDefaultView: (v: "planner" | "trips") => void;
  setHasSeenOnboarding: (value: boolean) => void;

  // ── Budget actions ──
  setBudget: (updates: Partial<Omit<Budget, "annualAllocations">>) => void;
  setAnnualAllocation: (year: number, amount: number) => void;

  // ── Blackout actions ──
  addBlackoutDate: (b: BlackoutDate) => void;
  updateBlackoutDate: (id: string, updates: Partial<Omit<BlackoutDate, "id">>) => void;
  removeBlackoutDate: (id: string) => void;

  // ── Import / export ──
  importData: (data: {
    trips: Trip[];
    tripOrder: string[];
    groups: Group[];
    categories: TripCategory[];
    budget?: Budget;
    blackoutDates?: BlackoutDate[];
  }) => Promise<void>;
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useTripStore = create<TripStore>()(
  persist(
    (set, get) => ({
      // Data defaults — overwritten by init()
      trips: [],
      tripOrder: [],
      groups: DEFAULT_GROUPS,
      categories: DEFAULT_CATEGORIES,
      budget: DEFAULT_BUDGET,
      blackoutDates: [],

      currentWorkspaceId: null,
      currentUserId: null,
      isLoading: false,

      // UI defaults (restored from localStorage via partialize)
      theme: "light",
      defaultView: "planner",
      hasSeenOnboarding: false,
      seenOnboardingByUser: {},
      filters: {
        groupIds: [], continents: [], statuses: [],
        categoryIds: [], searchQuery: "",
      },

      // ── Lifecycle ──────────────────────────────────────────────────────────

      init: async (workspaceId, userId) => {
        set({
          isLoading: true,
          currentWorkspaceId: workspaceId,
          currentUserId: userId,
          hasSeenOnboarding: get().seenOnboardingByUser[userId] ?? false,
        });

        const res = await fetch(`/api/workspace/${workspaceId}/data`);
        if (!res.ok) {
          console.error("Failed to load workspace data:", res.status);
          set({ isLoading: false });
          return;
        }
        const data = await res.json();

        const trips = (data.trips ?? []).map(rowToTrip);
        const tripOrder: string[] = data.tripOrder ?? trips.map((t: Trip) => t.id);
        const groups: Group[] = (data.groups ?? []).map((r: Record<string, unknown>) => ({
          id: r.id, name: r.name, color: r.color, isDefault: r.is_default,
        }));
        const categories: TripCategory[] = (data.categories ?? []).map((r: Record<string, unknown>) => ({
          id: r.id, name: r.name, icon: r.icon,
        }));
        const budget: Budget = data.budget
          ? { currency: data.budget.currency, totalBudget: data.budget.total_budget, annualAllocations: data.budget.annual_allocations }
          : DEFAULT_BUDGET;
        const blackoutDates: BlackoutDate[] = (data.blackoutDates ?? []).map((r: Record<string, unknown>) => ({
          id: r.id, label: r.label, startMonth: r.start_month, startYear: r.start_year,
          endMonth: r.end_month, endYear: r.end_year,
        }));

        set({ trips, tripOrder, groups, categories, budget, blackoutDates, isLoading: false });
      },

      cleanup: () => {
        set({ currentWorkspaceId: null, currentUserId: null, trips: [], tripOrder: [], isLoading: false });
      },

      // ── Trip actions ───────────────────────────────────────────────────────

      addTrip: (trip) => {
        set((s) => ({
          trips: [...s.trips, trip],
          tripOrder: [...s.tripOrder, trip.id],
        }));
        const { currentWorkspaceId, currentUserId } = get();
        if (!currentWorkspaceId || !currentUserId) return;
        const ws = currentWorkspaceId;
        apiBg(apiFetch(`/api/workspace/${ws}/trips`, "POST",
          tripToRow({ ...trip, workspaceId: ws }, ws, currentUserId)));
        apiBg(apiFetch(`/api/workspace/${ws}/order`, "PUT",
          { orderedIds: get().tripOrder }));
      },

      updateTrip: (id, updates) => {
        set((s) => ({
          trips: s.trips.map((t) => t.id === id
            ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t),
        }));
        const { currentWorkspaceId, currentUserId, trips } = get();
        if (!currentWorkspaceId || !currentUserId) return;
        const trip = trips.find((t) => t.id === id);
        if (!trip) return;
        apiBg(apiFetch(`/api/workspace/${currentWorkspaceId}/trips/${id}`, "PATCH",
          tripToRow(trip, currentWorkspaceId, currentUserId)));
      },

      removeTrip: (id) => {
        set((s) => ({
          trips: s.trips.filter((t) => t.id !== id),
          tripOrder: s.tripOrder.filter((oid) => oid !== id),
        }));
        const { currentWorkspaceId } = get();
        if (!currentWorkspaceId) return;
        apiBg(apiFetch(`/api/workspace/${currentWorkspaceId}/trips/${id}`, "DELETE"));
        apiBg(apiFetch(`/api/workspace/${currentWorkspaceId}/order`, "PUT",
          { orderedIds: get().tripOrder }));
      },

      reorderTrips: (orderedIds) => {
        set({ tripOrder: orderedIds });
        const { currentWorkspaceId } = get();
        if (!currentWorkspaceId) return;
        apiBg(apiFetch(`/api/workspace/${currentWorkspaceId}/order`, "PUT", { orderedIds }));
      },

      scheduleTrip: (id, range) => {
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === id
              ? { ...t, scheduled: range, status: t.status === "completed" ? "completed" : "planning" }
              : t
          ),
        }));
        const { currentWorkspaceId, trips } = get();
        if (!currentWorkspaceId) return;
        const trip = trips.find((t) => t.id === id);
        apiBg(apiFetch(`/api/workspace/${currentWorkspaceId}/trips/${id}`, "PATCH", {
          start_month: range.startMonth,
          start_year: range.startYear,
          end_month: range.endMonth,
          end_year: range.endYear,
          status: trip?.status === "completed" ? "completed" : "planning",
        }));
      },

      unscheduleTrip: (id) => {
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === id ? { ...t, scheduled: undefined, status: "unscheduled" } : t
          ),
        }));
        const { currentWorkspaceId } = get();
        if (!currentWorkspaceId) return;
        apiBg(apiFetch(`/api/workspace/${currentWorkspaceId}/trips/${id}`, "PATCH", {
          start_month: null, start_year: null, end_month: null, end_year: null,
          status: "unscheduled",
        }));
      },

      bookTrip: (id) => {
        set((s) => ({
          trips: s.trips.map((t) => t.id === id ? { ...t, status: "booked" } : t),
        }));
        const { currentWorkspaceId } = get();
        if (!currentWorkspaceId) return;
        apiBg(apiFetch(`/api/workspace/${currentWorkspaceId}/trips/${id}`, "PATCH",
          { status: "booked" }));
      },

      unbookTrip: (id) => {
        set((s) => ({
          trips: s.trips.map((t) => t.id === id ? { ...t, status: "planning" } : t),
        }));
        const { currentWorkspaceId } = get();
        if (!currentWorkspaceId) return;
        apiBg(apiFetch(`/api/workspace/${currentWorkspaceId}/trips/${id}`, "PATCH",
          { status: "planning" }));
      },

      completeTrip: (id) => {
        set((s) => ({
          trips: s.trips.map((t) => t.id === id ? { ...t, status: "completed" } : t),
        }));
        const { currentWorkspaceId } = get();
        if (!currentWorkspaceId) return;
        apiBg(apiFetch(`/api/workspace/${currentWorkspaceId}/trips/${id}`, "PATCH",
          { status: "completed" }));
      },

      uncompleteTrip: (id) => {
        set((s) => ({
          trips: s.trips.map((t) => t.id === id ? { ...t, status: "planning" } : t),
        }));
        const { currentWorkspaceId } = get();
        if (!currentWorkspaceId) return;
        apiBg(apiFetch(`/api/workspace/${currentWorkspaceId}/trips/${id}`, "PATCH",
          { status: "planning" }));
      },

      // ── Group actions ──────────────────────────────────────────────────────

      addGroup: (groupInput) => {
        const usedColors = get().groups.map((g) => g.color);
        const color = groupInput.color ?? getNextColor(usedColors);
        const group = { ...groupInput, color };
        set((s) => ({ groups: [...s.groups, group] }));
        const { currentWorkspaceId } = get();
        if (!currentWorkspaceId) return;
        apiBg(apiFetch(`/api/workspace/${currentWorkspaceId}/groups`, "POST", {
          id: group.id, name: group.name, color: group.color, is_default: group.isDefault ?? false,
        }));
      },

      updateGroup: (id, updates) => {
        set((s) => ({
          groups: s.groups.map((g) => g.id === id ? { ...g, ...updates } : g),
        }));
        const { currentWorkspaceId, groups } = get();
        if (!currentWorkspaceId) return;
        const group = groups.find((g) => g.id === id);
        if (!group) return;
        apiBg(apiFetch(`/api/workspace/${currentWorkspaceId}/groups/${id}`, "PATCH", {
          name: group.name, color: group.color, is_default: group.isDefault ?? false,
        }));
      },

      removeGroup: (id) => {
        set((s) => ({
          groups: s.groups.filter((g) => g.id !== id),
          filters: { ...s.filters, groupIds: s.filters.groupIds.filter((gid) => gid !== id) },
        }));
        const { currentWorkspaceId } = get();
        if (!currentWorkspaceId) return;
        apiBg(apiFetch(`/api/workspace/${currentWorkspaceId}/groups/${id}`, "DELETE"));
      },

      setDefaultGroup: (id) => {
        set((s) => ({
          groups: s.groups.map((g) => ({ ...g, isDefault: g.id === id })),
        }));
        const { currentWorkspaceId } = get();
        if (!currentWorkspaceId) return;
        apiBg(apiFetch(`/api/workspace/${currentWorkspaceId}/groups/default`, "PUT",
          { groupId: id }));
      },

      // ── Category actions ───────────────────────────────────────────────────

      addCategory: (category) => {
        set((s) => ({ categories: [...s.categories, category] }));
        const { currentWorkspaceId } = get();
        if (!currentWorkspaceId) return;
        apiBg(apiFetch(`/api/workspace/${currentWorkspaceId}/categories`, "POST", {
          id: category.id, name: category.name, icon: category.icon,
        }));
      },

      updateCategory: (id, updates) => {
        set((s) => ({
          categories: s.categories.map((c) => c.id === id ? { ...c, ...updates } : c),
        }));
        const { currentWorkspaceId, categories } = get();
        if (!currentWorkspaceId) return;
        const cat = categories.find((c) => c.id === id);
        if (!cat) return;
        apiBg(apiFetch(`/api/workspace/${currentWorkspaceId}/categories/${id}`, "PATCH", {
          name: cat.name, icon: cat.icon,
        }));
      },

      removeCategory: (id) => {
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          filters: { ...s.filters, categoryIds: s.filters.categoryIds.filter((cid) => cid !== id) },
        }));
        const { currentWorkspaceId } = get();
        if (!currentWorkspaceId) return;
        apiBg(apiFetch(`/api/workspace/${currentWorkspaceId}/categories/${id}`, "DELETE"));
      },

      // ── Filter actions (UI-only, no API) ──────────────────────────────────

      setGroupFilter: (groupIds) =>
        set((s) => ({ filters: { ...s.filters, groupIds } })),
      setContinentFilter: (continents) =>
        set((s) => ({ filters: { ...s.filters, continents } })),
      setStatusFilter: (statuses) =>
        set((s) => ({ filters: { ...s.filters, statuses } })),
      setCategoryFilter: (categoryIds) =>
        set((s) => ({ filters: { ...s.filters, categoryIds } })),
      setSearchQuery: (searchQuery) =>
        set((s) => ({ filters: { ...s.filters, searchQuery } })),
      clearFilters: () =>
        set({ filters: { groupIds: [], continents: [], statuses: [], categoryIds: [], searchQuery: "" } }),

      // ── UI actions (localStorage-persisted) ───────────────────────────────

      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      setDefaultView: (v) => set({ defaultView: v }),
      setHasSeenOnboarding: (value) => {
        const userId = get().currentUserId;
        set((s) => ({
          hasSeenOnboarding: value,
          seenOnboardingByUser: userId
            ? { ...s.seenOnboardingByUser, [userId]: value }
            : s.seenOnboardingByUser,
        }));
      },

      // ── Budget actions ─────────────────────────────────────────────────────

      setBudget: (updates) => {
        set((s) => ({ budget: { ...s.budget, ...updates } }));
        const { currentWorkspaceId, budget } = get();
        if (!currentWorkspaceId) return;
        apiBg(apiFetch(`/api/workspace/${currentWorkspaceId}/budget`, "PUT", {
          currency: budget.currency,
          total_budget: budget.totalBudget,
          annual_allocations: budget.annualAllocations,
        }));
      },

      setAnnualAllocation: (year, amount) => {
        set((s) => ({
          budget: { ...s.budget, annualAllocations: { ...s.budget.annualAllocations, [year]: amount } },
        }));
        const { currentWorkspaceId, budget } = get();
        if (!currentWorkspaceId) return;
        apiBg(apiFetch(`/api/workspace/${currentWorkspaceId}/budget`, "PUT", {
          currency: budget.currency,
          total_budget: budget.totalBudget,
          annual_allocations: budget.annualAllocations,
        }));
      },

      // ── Blackout date actions ──────────────────────────────────────────────

      addBlackoutDate: (b) => {
        set((s) => ({ blackoutDates: [...s.blackoutDates, b] }));
        const { currentWorkspaceId } = get();
        if (!currentWorkspaceId) return;
        apiBg(apiFetch(`/api/workspace/${currentWorkspaceId}/blackout-dates`, "POST", {
          id: b.id, label: b.label,
          start_month: b.startMonth, start_year: b.startYear,
          end_month: b.endMonth, end_year: b.endYear,
        }));
      },

      updateBlackoutDate: (id, updates) => {
        set((s) => ({
          blackoutDates: s.blackoutDates.map((b) => b.id === id ? { ...b, ...updates } : b),
        }));
        const { currentWorkspaceId, blackoutDates } = get();
        if (!currentWorkspaceId) return;
        const b = blackoutDates.find((bd) => bd.id === id);
        if (!b) return;
        apiBg(apiFetch(`/api/workspace/${currentWorkspaceId}/blackout-dates/${id}`, "PATCH", {
          label: b.label,
          start_month: b.startMonth, start_year: b.startYear,
          end_month: b.endMonth, end_year: b.endYear,
        }));
      },

      removeBlackoutDate: (id) => {
        set((s) => ({ blackoutDates: s.blackoutDates.filter((b) => b.id !== id) }));
        const { currentWorkspaceId } = get();
        if (!currentWorkspaceId) return;
        apiBg(apiFetch(`/api/workspace/${currentWorkspaceId}/blackout-dates/${id}`, "DELETE"));
      },

      // ── Import (used by the export/import JSON feature) ───────────────────

      importData: async (data) => {
        const { currentWorkspaceId, currentUserId } = get();
        if (!currentWorkspaceId || !currentUserId) return;
        await fetch("/api/migrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId: currentWorkspaceId, ...data }),
        });
        await get().init(currentWorkspaceId, currentUserId);
      },
    }),
    {
      name: "wanderlist-ui",
      // Only persist UI state to localStorage — trip data lives in Supabase
      partialize: (s) => ({
        theme: s.theme,
        filters: s.filters,
        defaultView: s.defaultView,
        seenOnboardingByUser: s.seenOnboardingByUser,
        currentWorkspaceId: s.currentWorkspaceId,
      }),
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
    if (filters.continents.length && (!t.continent || !filters.continents.includes(t.continent))) return false;
    if (filters.categoryIds.length && (!t.categoryId || !filters.categoryIds.includes(t.categoryId))) return false;
    return true;
  });
};

export const selectScheduledTrips = (trips: Trip[], filters: FilterState) =>
  trips.filter((t) => {
    if (!t.scheduled) return false;
    if (t.status === "unscheduled") return false;
    if (t.status === "completed") return false;
    if (!matchesSearch(t, filters.searchQuery)) return false;
    if (filters.groupIds.length && !filters.groupIds.includes(t.groupId)) return false;
    if (filters.continents.length && (!t.continent || !filters.continents.includes(t.continent))) return false;
    if (filters.statuses.length && !filters.statuses.includes(t.status)) return false;
    if (filters.categoryIds.length && (!t.categoryId || !filters.categoryIds.includes(t.categoryId))) return false;
    return true;
  });

export function selectHistoryTrips(trips: Trip[], filters: FilterState): Trip[] {
  return trips.filter((t) => {
    if (t.status !== "completed") return false;
    if (!matchesSearch(t, filters.searchQuery)) return false;
    if (filters.groupIds.length && !filters.groupIds.includes(t.groupId)) return false;
    if (filters.continents.length && (!t.continent || !filters.continents.includes(t.continent))) return false;
    if (filters.categoryIds.length && (!t.categoryId || !filters.categoryIds.includes(t.categoryId))) return false;
    return true;
  });
}

// ─── Blackout helpers ─────────────────────────────────────────────────────────

export function blackoutTouchesMonth(b: BlackoutDate, month: number, year: number): boolean {
  const m = year * 12 + month;
  return m >= b.startYear * 12 + b.startMonth && m <= b.endYear * 12 + b.endMonth;
}

export function tripOverlapsBlackout(trip: Trip, blackouts: BlackoutDate[]): boolean {
  if (!trip.scheduled) return false;
  const ts = trip.scheduled.startYear * 12 + trip.scheduled.startMonth + 1;
  const te = trip.scheduled.endYear   * 12 + trip.scheduled.endMonth   + 1;
  return blackouts.some((b) => {
    const bs = b.startYear * 12 + b.startMonth;
    const be = b.endYear   * 12 + b.endMonth;
    return ts <= be && te >= bs;
  });
}
