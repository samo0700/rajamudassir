import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function isAdminSession() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data, error } = await supabase.rpc("is_admin");
    return !error && data === true;
  } catch { return false; }
}

export async function requireAdminApi() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return { response: Response.json({ error: "Supabase is not configured yet." }, { status: 503 }) };
  }
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: Response.json({ error: "Sign in to continue." }, { status: 401 }) };
  const { data, error } = await supabase.rpc("is_admin");
  if (error || data !== true) return { response: Response.json({ error: "Admin access is required." }, { status: 403 }) };
  return { supabase, user };
}
