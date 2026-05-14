import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Server-side admin client — bypasses RLS.
// Only import this in route handlers (server-side), never in client code.
export function getSupabaseAdmin(): SupabaseClient {
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}
