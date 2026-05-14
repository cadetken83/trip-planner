import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// GET /api/workspaces — list all workspaces the user belongs to
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("workspace_members")
    .select("workspace_id, role, workspaces!inner(id, name)")
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const workspaces = (data ?? []).map((row) => ({
    id: row.workspace_id,
    name: (row.workspaces as unknown as { name: string }).name,
    role: row.role,
  }));

  return NextResponse.json({ workspaces });
}

// POST /api/workspaces — create a new workspace and switch to it
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let name: string;
  try {
    ({ name } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const db = getSupabaseAdmin();

  const { data: workspace, error: wsErr } = await db
    .from("workspaces")
    .insert({ name: name.trim(), owner_id: userId })
    .select("id")
    .single();

  if (wsErr || !workspace) {
    console.error("Failed to create workspace:", wsErr);
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }

  const { error: memberErr } = await db
    .from("workspace_members")
    .insert({ workspace_id: workspace.id, user_id: userId, role: "owner" });

  if (memberErr) {
    console.error("Failed to add workspace member:", memberErr);
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }

  const DEFAULT_GROUPS = [
    { id: "family",  name: "Family",  color: "#3B82F6", is_default: true  },
    { id: "couples", name: "Couples", color: "#EC4899", is_default: false },
    { id: "solo",    name: "Solo",    color: "#10B981", is_default: false },
    { id: "friends", name: "Friends", color: "#F59E0B", is_default: false },
  ];
  const DEFAULT_CATEGORIES = [
    { id: "beach",     name: "Beach",      icon: "🏖️" },
    { id: "ski",       name: "Ski",        icon: "⛷️" },
    { id: "cruise",    name: "Cruise",     icon: "🚢" },
    { id: "city",      name: "City Break", icon: "🏙️" },
    { id: "safari",    name: "Safari",     icon: "🦁" },
    { id: "hiking",    name: "Hiking",     icon: "🥾" },
    { id: "road-trip", name: "Road Trip",  icon: "🚗" },
    { id: "cultural",  name: "Cultural",   icon: "🏛️" },
  ];

  await Promise.all([
    db.from("groups").insert(DEFAULT_GROUPS.map((g) => ({ ...g, workspace_id: workspace.id }))),
    db.from("categories").insert(DEFAULT_CATEGORIES.map((c) => ({ ...c, workspace_id: workspace.id }))),
    db.from("budget").insert({ workspace_id: workspace.id }),
    db.from("trip_order").insert({ workspace_id: workspace.id, ordered_ids: [] }),
  ]);

  return NextResponse.json({ workspaceId: workspace.id }, { status: 201 });
}
