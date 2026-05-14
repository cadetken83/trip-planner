import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; catId: string }> }
) {
  const { id: workspaceId, catId } = await params;
  const authResult = await requireWorkspaceMember(workspaceId);
  if (authResult.error) return authResult.error;

  const body = await req.json();
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("categories")
    .update(body)
    .eq("id", catId)
    .eq("workspace_id", workspaceId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; catId: string }> }
) {
  const { id: workspaceId, catId } = await params;
  const authResult = await requireWorkspaceMember(workspaceId);
  if (authResult.error) return authResult.error;

  const db = getSupabaseAdmin();
  const { error } = await db
    .from("categories")
    .delete()
    .eq("id", catId)
    .eq("workspace_id", workspaceId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
