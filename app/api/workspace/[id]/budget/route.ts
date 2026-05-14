import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params;
  const authResult = await requireWorkspaceMember(workspaceId);
  if (authResult.error) return authResult.error;

  const { currency, total_budget, annual_allocations } = await req.json();
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("budget")
    .upsert({ workspace_id: workspaceId, currency, total_budget, annual_allocations });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
