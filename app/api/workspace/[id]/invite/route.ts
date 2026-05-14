import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// GET /api/workspace/[id]/invite — return current invite code + URL (owner only)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const { data: ws } = await db
    .from("workspaces")
    .select("owner_id, invite_code")
    .eq("id", workspaceId)
    .maybeSingle();

  if (!ws) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ws.owner_id !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const origin = new URL(req.url).origin;
  return NextResponse.json({
    inviteCode: ws.invite_code,
    inviteUrl: `${origin}/join/${ws.invite_code}`,
  });
}

// POST /api/workspace/[id]/invite — rotate invite code (owner only)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const { data: ws } = await db
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .maybeSingle();

  if (!ws) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (ws.owner_id !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: updated, error } = await db
    .from("workspaces")
    .update({ invite_code: crypto.randomUUID() })
    .eq("id", workspaceId)
    .select("invite_code")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const origin = new URL(req.url).origin;
  return NextResponse.json({
    inviteCode: updated.invite_code,
    inviteUrl: `${origin}/join/${updated.invite_code}`,
  });
}
