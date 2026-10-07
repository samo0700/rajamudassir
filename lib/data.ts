import "server-only";
import { defaultProfile, defaultServices, defaultSettings } from "@/lib/defaults";
import { supabaseConfigured } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile, Service, SiteSettings } from "@/lib/types";
import { firm, firmCopy } from "@/lib/firm";

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
    if (error || !data) return defaultSettings;
    const settings = { ...defaultSettings, ...data } as SiteSettings;
    return {
      ...settings,
      address: !settings.address || /^(near high court|near lahore high court)$/i.test(settings.address.trim()) ? firm.address : settings.address,
      footer_text: firmCopy(settings.footer_text || defaultSettings.footer_text)
    };
  } catch { return defaultSettings; }
}

export async function getPublicSettings(): Promise<SiteSettings> {
  const settings = await getSettings();
  return {
    ...settings,
    logo_url: firm.logoUrl,
    phone: firm.officeContactsConfirmed ? settings.phone : "",
    whatsapp: firm.officeContactsConfirmed ? settings.whatsapp : ""
  };
}

export async function getServices(): Promise<Service[]> {
  if (!supabaseConfigured()) return defaultServices;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("services").select("*").eq("published", true).order("display_order");
    return !error && data ? (data as Service[]).map((service) => ({
      ...service,
      short_description: firmCopy(service.short_description),
      full_description: firmCopy(service.full_description),
      seo_title: service.seo_title ? firmCopy(service.seo_title) : null,
      seo_description: service.seo_description ? firmCopy(service.seo_description) : null
    })) : [];
  } catch { return []; }
}

export async function getService(slug: string): Promise<Service | null> {
  const services = await getServices();
  return services.find((service) => service.slug === slug) ?? null;
}
