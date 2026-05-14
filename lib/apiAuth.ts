import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

type AuthSuccess = { userId: string; error?: never };
type AuthFailure = { userId?: never; error: NextResponse };

/** Verify the current user is logged in and is a member of workspaceId. */
export async function requireWorkspaceMember(
  workspaceId: string
): Promise<AuthSuccess | AuthFailure> {
  const { userId } = await auth();
  if (!userId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const db = getSupabaseAdmin();
  const { data } = await db
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { userId };
}
