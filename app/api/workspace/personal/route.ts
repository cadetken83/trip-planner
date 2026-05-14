import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

// GET /api/workspace/personal
// Returns the authenticated user's personal workspace, creating it if needed.
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();

  // Look for an existing personal workspace for this user (they're the owner + only member)
  const { data: existing } = await db
    .from("workspace_members")
    .select("workspace_id, workspaces!inner(id, name, owner_id)")
    .eq("user_id", userId)
    .eq("role", "owner")
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ workspaceId: existing.workspace_id });
  }

  // Create a new personal workspace
  const { data: workspace, error: wsErr } = await db
    .from("workspaces")
    .insert({ name: "My Trips", owner_id: userId })
    .select("id")
    .single();

  if (wsErr || !workspace) {
    console.error("Failed to create workspace:", wsErr);
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }

  // Add the user as owner
  const { error: memberErr } = await db
    .from("workspace_members")
    .insert({ workspace_id: workspace.id, user_id: userId, role: "owner" });

  if (memberErr) {
    console.error("Failed to add workspace member:", memberErr);
    return NextResponse.json({ error: "Failed to create workspace" }, { status: 500 });
  }

  // Seed default groups and categories for a fresh workspace
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

  const SEED_TRIPS = [
    {
      id: crypto.randomUUID(), title: "Tokyo Adventure", destination: "Tokyo, Japan",
      continent: "Asia", group_id: "family", category_id: "city",
      status: "unscheduled", duration_weeks: 2, tags: ["food", "culture", "example"],
      image_url: "https://wallpapertag.com/wallpaper/full/2/f/e/519365-large-japanese-scenery-wallpaper-2048x1401.jpg",
      is_private: false, created_by: userId, updated_by: userId, workspace_id: workspace.id,
    },
    {
      id: crypto.randomUUID(), title: "Amalfi Coast", destination: "Amalfi, Italy",
      continent: "Europe", group_id: "couples", category_id: "beach",
      status: "unscheduled", duration_weeks: 1, tags: ["food", "example"],
      image_url: "https://wallpaperaccess.com/full/2122279.jpg",
      is_private: false, created_by: userId, updated_by: userId, workspace_id: workspace.id,
    },
    {
      id: crypto.randomUUID(), title: "Patagonia Trek", destination: "Patagonia, Argentina",
      continent: "South America", group_id: "solo", category_id: "hiking",
      status: "unscheduled", duration_weeks: 3, tags: ["example"],
      image_url: "https://cdn.pixabay.com/photo/2022/11/25/20/11/argentina-7616819_1280.jpg",
      is_private: false, created_by: userId, updated_by: userId, workspace_id: workspace.id,
    },
    {
      id: crypto.randomUUID(), title: "Safari", destination: "Serengeti, Tanzania",
      continent: "Africa", group_id: "family", category_id: "safari",
      status: "unscheduled", duration_weeks: 2, tags: ["example"],
      image_url: "https://www.theluxeinsider.com/wp-content/uploads/2022/12/african-savannah.jpeg",
      is_private: false, created_by: userId, updated_by: userId, workspace_id: workspace.id,
    },
  ];

  await Promise.all([
    db.from("groups").insert(DEFAULT_GROUPS.map((g) => ({ ...g, workspace_id: workspace.id }))),
    db.from("categories").insert(DEFAULT_CATEGORIES.map((c) => ({ ...c, workspace_id: workspace.id }))),
    db.from("budget").insert({ workspace_id: workspace.id }),
    db.from("trips").insert(SEED_TRIPS),
    db.from("trip_order").insert({ workspace_id: workspace.id, ordered_ids: SEED_TRIPS.map((t) => t.id) }),
  ]);

  return NextResponse.json({ workspaceId: workspace.id });
}
