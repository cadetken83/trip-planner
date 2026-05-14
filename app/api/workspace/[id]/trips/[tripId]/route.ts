import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; tripId: string }> }
) {
  const { id: workspaceId, tripId } = await params;
  const authResult = await requireWorkspaceMember(workspaceId);
  if (authResult.error) return authResult.error;

  const body = await req.json();
  // Strip immutable fields; server enforces workspace_id and updated_by
  const { id: _id, workspace_id: _ws, created_by: _cb, ...updateData } = body;

  const db = getSupabaseAdmin();
  const { error } = await db
    .from("trips")
    .update({ ...updateData, workspace_id: workspaceId, updated_by: authResult.userId })
    .eq("id", tripId)
    .eq("workspace_id", workspaceId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; tripId: string }> }
) {
  const { id: workspaceId, tripId } = await params;
  const authResult = await requireWorkspaceMember(workspaceId);
  if (authResult.error) return authResult.error;

  const db = getSupabaseAdmin();
  const { error } = await db
    .from("trips")
    .delete()
    .eq("id", tripId)
    .eq("workspace_id", workspaceId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
