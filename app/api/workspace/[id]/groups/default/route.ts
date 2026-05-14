import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase";

// PUT /api/workspace/[id]/groups/default
// Sets one group as the default, clearing the flag on all others.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params;
  const authResult = await requireWorkspaceMember(workspaceId);
  if (authResult.error) return authResult.error;

  const { groupId } = await req.json();
  const db = getSupabaseAdmin();

  // Two updates: clear all, then set the chosen one
  const [clearErr] = await Promise.all([
    db.from("groups").update({ is_default: false }).eq("workspace_id", workspaceId),
  ]);
  if (clearErr.error) return NextResponse.json({ error: clearErr.error.message }, { status: 500 });

  const { error: setErr } = await db
    .from("groups")
    .update({ is_default: true })
    .eq("id", groupId)
    .eq("workspace_id", workspaceId);
  if (setErr) return NextResponse.json({ error: setErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
