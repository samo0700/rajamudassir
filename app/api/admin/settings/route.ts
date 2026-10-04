import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";

const schema = z.object({
  phone: z.string().trim().max(40), whatsapp: z.string().trim().max(40), email: z.string().trim().email().max(254),
  address: z.string().trim().max(240), city: z.string().trim().max(120), office_timings: z.string().trim().max(240),
  map_url: z.string().trim().max(2048), latitude: z.number().min(-90).max(90).nullable(), longitude: z.number().min(-180).max(180).nullable(),
  logo_url: z.string().trim().url().max(2048).refine((value) => /^https?:\/\//i.test(value)).nullable(), social_links: z.record(z.string(), z.string().trim().max(2048)), footer_text: z.string().trim().max(500)
});

export async function GET() {
  const auth = await requireAdminApi(); if ("response" in auth) return auth.response;
  const { data, error } = await auth.supabase.from("site_settings").select("*").eq("id", "main").maybeSingle();
  if (error) return Response.json({ error: "Could not load site settings." }, { status: 500 });
  return Response.json(data);
}

export async function PUT(request: Request) {
  const auth = await requireAdminApi(); if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => null); const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Check the site settings." }, { status: 400 });
  const { data, error } = await auth.supabase.from("site_settings").upsert({ id: "main", ...parsed.data }).select().single();
  if (error) return Response.json({ error: "Could not save site settings." }, { status: 400 });
  return Response.json(data);
}
