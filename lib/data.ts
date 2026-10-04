import "server-only";
import { defaultProfile, defaultServices, defaultSettings } from "@/lib/defaults";
import { supabaseConfigured } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile, Service, SiteSettings } from "@/lib/types";

export async function getProfile(): Promise<Profile> {
  if (!supabaseConfigured()) return defaultProfile;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("profiles").select("*").eq("id", "main").maybeSingle();
    return !error && data ? { ...defaultProfile, ...data } as Profile : defaultProfile;
  } catch { return defaultProfile; }
}

export async function getSettings(): Promise<SiteSettings> {
  if (!supabaseConfigured()) return defaultSettings;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("site_settings").select("*").eq("id", "main").maybeSingle();
    return !error && data ? { ...defaultSettings, ...data } as SiteSettings : defaultSettings;
  } catch { return defaultSettings; }
}

export async function getServices(): Promise<Service[]> {
  if (!supabaseConfigured()) return defaultServices;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("services").select("*").eq("published", true).order("display_order");
    return !error && data ? data as Service[] : [];
  } catch { return []; }
}

export async function getService(slug: string): Promise<Service | null> {
  const services = await getServices();
  return services.find((service) => service.slug === slug) ?? null;
}
