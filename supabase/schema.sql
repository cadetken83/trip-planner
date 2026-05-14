-- ─────────────────────────────────────────────────────────────────────────────
-- Wanderlist — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- ─────────────────────────────────────────────────────────────────────────────

-- Helper: extract the Clerk user ID from the JWT sub claim.
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::text;
$$;


-- ─── Tables ───────────────────────────────────────────────────────────────────
-- All tables are created first so cross-table policy references don't fail.

CREATE TABLE IF NOT EXISTS workspaces (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  owner_id    text NOT NULL,
  invite_code uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      text NOT NULL,
  role         text NOT NULL DEFAULT 'editor'
                 CHECK (role IN ('owner', 'editor', 'viewer')),
  joined_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS trip_order (
  workspace_id uuid PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  ordered_ids  jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS groups (
  id           text NOT NULL,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         text NOT NULL,
  color        text,
  is_default   boolean NOT NULL DEFAULT false,
  PRIMARY KEY (id, workspace_id)
);

CREATE TABLE IF NOT EXISTS categories (
  id           text NOT NULL,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         text NOT NULL,
  icon         text,
  PRIMARY KEY (id, workspace_id)
);

CREATE TABLE IF NOT EXISTS budget (
  workspace_id       uuid PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  currency           text NOT NULL DEFAULT 'USD',
  total_budget       numeric NOT NULL DEFAULT 0,
  annual_allocations jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS blackout_dates (
  id           text NOT NULL,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  label        text,
  start_month  integer,
  start_year   integer,
  end_month    integer,
  end_year     integer,
  PRIMARY KEY (id, workspace_id)
);

CREATE TABLE IF NOT EXISTS trips (
  id               text PRIMARY KEY,
  workspace_id     uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title            text NOT NULL,
  destination      text,
  continent        text,
  group_id         text,
  category_id      text,
  status           text NOT NULL DEFAULT 'unscheduled',
  start_month      integer,
  start_year       integer,
  end_month        integer,
  end_year         integer,
  duration_weeks   integer,
  estimated_cost   numeric,
  book_by_month    integer,
  book_by_year     integer,
  book_by_day      integer,
  notes            text,
  tags             text[],
  image_url        text,
  is_private       boolean NOT NULL DEFAULT false,
  created_by       text,
  updated_by       text,
  updated_by_name  text,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Migration for existing deployments:
-- ALTER TABLE trips ADD COLUMN IF NOT EXISTS updated_by_name text;


-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE workspaces       ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_order       ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups           ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget           ENABLE ROW LEVEL SECURITY;
ALTER TABLE blackout_dates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips            ENABLE ROW LEVEL SECURITY;


-- ─── Policies: workspaces ─────────────────────────────────────────────────────

CREATE POLICY "workspaces_select" ON workspaces
  FOR SELECT USING (
    id IN (SELECT workspace_id FROM workspace_members WHERE user_id = requesting_user_id())
  );

CREATE POLICY "workspaces_insert" ON workspaces
  FOR INSERT WITH CHECK (owner_id = requesting_user_id());

CREATE POLICY "workspaces_update" ON workspaces
  FOR UPDATE USING (owner_id = requesting_user_id());

CREATE POLICY "workspaces_delete" ON workspaces
  FOR DELETE USING (owner_id = requesting_user_id());


-- ─── Policies: workspace_members ─────────────────────────────────────────────

CREATE POLICY "members_select" ON workspace_members
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = requesting_user_id())
  );

CREATE POLICY "members_insert" ON workspace_members
  FOR INSERT WITH CHECK (
    (user_id = requesting_user_id() AND role = 'owner')
    OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = requesting_user_id())
  );

CREATE POLICY "members_update" ON workspace_members
  FOR UPDATE USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = requesting_user_id())
  );

CREATE POLICY "members_delete" ON workspace_members
  FOR DELETE USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = requesting_user_id())
    OR user_id = requesting_user_id()
  );


-- ─── Policies: trip_order ─────────────────────────────────────────────────────

CREATE POLICY "trip_order_select" ON trip_order
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = requesting_user_id())
  );

CREATE POLICY "trip_order_all" ON trip_order
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = requesting_user_id() AND role IN ('owner', 'editor')
    )
  );


-- ─── Policies: groups ────────────────────────────────────────────────────────

CREATE POLICY "groups_select" ON groups
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = requesting_user_id())
  );

CREATE POLICY "groups_all" ON groups
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = requesting_user_id() AND role IN ('owner', 'editor')
    )
  );


-- ─── Policies: categories ────────────────────────────────────────────────────

CREATE POLICY "categories_select" ON categories
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = requesting_user_id())
  );

CREATE POLICY "categories_all" ON categories
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = requesting_user_id() AND role IN ('owner', 'editor')
    )
  );


-- ─── Policies: budget ────────────────────────────────────────────────────────

CREATE POLICY "budget_select" ON budget
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = requesting_user_id())
  );

CREATE POLICY "budget_all" ON budget
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = requesting_user_id() AND role IN ('owner', 'editor')
    )
  );


-- ─── Policies: blackout_dates ─────────────────────────────────────────────────

CREATE POLICY "blackout_select" ON blackout_dates
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = requesting_user_id())
  );

CREATE POLICY "blackout_all" ON blackout_dates
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = requesting_user_id() AND role IN ('owner', 'editor')
    )
  );


-- ─── Policies: trips ─────────────────────────────────────────────────────────

CREATE POLICY "trips_select" ON trips
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = requesting_user_id())
    AND (is_private = false OR created_by = requesting_user_id())
  );

CREATE POLICY "trips_insert" ON trips
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = requesting_user_id() AND role IN ('owner', 'editor')
    )
  );

CREATE POLICY "trips_update" ON trips
  FOR UPDATE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = requesting_user_id() AND role IN ('owner', 'editor')
    )
    AND (is_private = false OR created_by = requesting_user_id())
  );

CREATE POLICY "trips_delete" ON trips
  FOR DELETE USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = requesting_user_id() AND role IN ('owner', 'editor')
    )
    AND (is_private = false OR created_by = requesting_user_id())
  );


-- ─── Trigger: auto-update updated_at ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trips_updated_at
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
