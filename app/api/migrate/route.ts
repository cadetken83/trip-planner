import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Trip, Group, TripCategory, Budget, BlackoutDate } from "@/types";

type MigratePayload = {
  workspaceId: string;
  trips: Trip[];
  tripOrder: string[];
  groups: Group[];
  categories: TripCategory[];
  budget?: Budget;
  blackoutDates?: BlackoutDate[];
};

// POST /api/migrate
// Migrates localStorage data into the user's Supabase workspace.
// Safe to call multiple times — uses upsert throughout.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: MigratePayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { workspaceId, trips, tripOrder, groups, categories, budget, blackoutDates } = body;
  if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

  const db = getSupabaseAdmin();

  // Verify the user owns this workspace
  const { data: member } = await db
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!member || member.role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Upsert all data — safe to re-run if migration is interrupted
  const results = await Promise.allSettled([
    trips.length
      ? db.from("trips").upsert(
          trips.map((t) => ({
            id: t.id,
            workspace_id: workspaceId,
            title: t.title,
            destination: t.destination,
            continent: t.continent ?? null,
            group_id: t.groupId,
            category_id: t.categoryId ?? null,
            status: t.status,
            start_month: t.scheduled?.startMonth ?? null,
            start_year: t.scheduled?.startYear ?? null,
            end_month: t.scheduled?.endMonth ?? null,
            end_year: t.scheduled?.endYear ?? null,
            duration_weeks: t.durationWeeks ?? null,
            estimated_cost: t.estimatedCost ?? null,
            book_by_month: t.bookBy?.month ?? null,
            book_by_year: t.bookBy?.year ?? null,
            book_by_day: t.bookBy?.day ?? null,
            notes: t.notes ?? null,
            tags: t.tags ?? null,
            image_url: t.imageUrl ?? null,
            is_private: false,
            created_by: userId,
            updated_by: userId,
          }))
        )
      : Promise.resolve(),

    db.from("trip_order").upsert({
      workspace_id: workspaceId,
      ordered_ids: tripOrder,
    }),

    groups.length
      ? db.from("groups").upsert(
          groups.map((g) => ({
            id: g.id,
            workspace_id: workspaceId,
            name: g.name,
            color: g.color,
            is_default: g.isDefault ?? false,
          }))
        )
      : Promise.resolve(),

    categories.length
      ? db.from("categories").upsert(
          categories.map((c) => ({
            id: c.id,
            workspace_id: workspaceId,
            name: c.name,
            icon: c.icon,
          }))
        )
      : Promise.resolve(),

    budget
      ? db.from("budget").upsert({
          workspace_id: workspaceId,
          currency: budget.currency,
          total_budget: budget.totalBudget,
          annual_allocations: budget.annualAllocations,
        })
      : Promise.resolve(),

    blackoutDates?.length
      ? db.from("blackout_dates").upsert(
          blackoutDates.map((b) => ({
            id: b.id,
            workspace_id: workspaceId,
            label: b.label,
            start_month: b.startMonth,
            start_year: b.startYear,
            end_month: b.endMonth,
            end_year: b.endYear,
          }))
        )
      : Promise.resolve(),
  ]);

  const errors = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => r.reason?.message ?? "Unknown error");

  if (errors.length) {
    console.error("Migration partial failure:", errors);
    return NextResponse.json({ error: "Partial failure", details: errors }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
