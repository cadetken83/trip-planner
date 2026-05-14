import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// GET /api/workspace/invite/[code] — look up workspace by invite code (any authenticated user)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const { data: ws } = await db
    .from("workspaces")
    .select("id, name")
    .eq("invite_code", code)
    .maybeSingle();

  if (!ws) return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });

  // Check if already a member
  const { data: membership } = await db
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", ws.id)
    .eq("user_id", userId)
    .maybeSingle();

  return NextResponse.json({
    workspaceId: ws.id,
    name: ws.name,
    alreadyMember: !!membership,
  });
}

// POST /api/workspace/invite/[code] — join workspace as editor (idempotent)
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const { data: ws } = await db
    .from("workspaces")
    .select("id, owner_id")
    .eq("invite_code", code)
    .maybeSingle();

  if (!ws) return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });

  // If already a member, succeed silently
  const { data: existing } = await db
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", ws.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!existing) {
    const { error } = await db.from("workspace_members").insert({
      workspace_id: ws.id,
      user_id: userId,
      role: "editor",
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ workspaceId: ws.id });
}
