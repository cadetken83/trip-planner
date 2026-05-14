import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// GET /api/workspace/[id]/members — list members with display names (members only)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: workspaceId } = await params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();

  // Verify caller is a member
  const { data: selfRow } = await db
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!selfRow) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: rows, error } = await db
    .from("workspace_members")
    .select("user_id, role, joined_at")
    .eq("workspace_id", workspaceId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!rows?.length) return NextResponse.json({ members: [] });

  // Resolve display names from Clerk
  const client = await clerkClient();
  const clerkUsers = await client.users.getUserList({
    userId: rows.map((r) => r.user_id),
    limit: 100,
  });

  const userMap = Object.fromEntries(
    clerkUsers.data.map((u) => [
      u.id,
      {
        name: u.fullName ?? u.firstName ?? u.primaryEmailAddress?.emailAddress ?? u.id,
        email: u.primaryEmailAddress?.emailAddress ?? "",
        imageUrl: u.imageUrl,
      },
    ])
  );

  const members = rows.map((r) => ({
    userId: r.user_id,
    role: r.role,
    joinedAt: r.joined_at,
    ...(userMap[r.user_id] ?? { name: r.user_id, email: "", imageUrl: "" }),
  }));

  return NextResponse.json({ members });
}
