import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params;
  const authResult = await requireWorkspaceMember(workspaceId);
  if (authResult.error) return authResult.error;

  const db = getSupabaseAdmin();
  const [tripsRes, orderRes, groupsRes, catsRes, budgetRes, blackoutsRes] = await Promise.all([
    db.from("trips").select("*").eq("workspace_id", workspaceId),
    db.from("trip_order").select("ordered_ids").eq("workspace_id", workspaceId).maybeSingle(),
    db.from("groups").select("*").eq("workspace_id", workspaceId),
    db.from("categories").select("*").eq("workspace_id", workspaceId),
    db.from("budget").select("*").eq("workspace_id", workspaceId).maybeSingle(),
    db.from("blackout_dates").select("*").eq("workspace_id", workspaceId),
  ]);

  return NextResponse.json({
    trips: tripsRes.data ?? [],
    tripOrder: orderRes.data?.ordered_ids ?? null,
    groups: groupsRes.data ?? [],
    categories: catsRes.data ?? [],
    budget: budgetRes.data ?? null,
    blackoutDates: blackoutsRes.data ?? [],
  });
}
