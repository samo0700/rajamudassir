import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";

const schema = z.object({
  full_name: z.string().trim().min(2).max(120), professional_title: z.string().trim().min(2).max(120),
  experience_years: z.number().int().min(0).max(100), bar_council: z.string().trim().max(200),
  biography: z.string().trim().max(10000), profile_image: z.string().trim().url().max(2048).refine((value) => /^https?:\/\//i.test(value)).nullable(),
  email: z.string().trim().email().max(254), phone: z.string().trim().max(40), whatsapp: z.string().trim().max(40)
});

export async function GET() {
  const auth = await requireAdminApi(); if ("response" in auth) return auth.response;
  const { data, error } = await auth.supabase.from("profiles").select("*").eq("id", "main").maybeSingle();
  if (error) return Response.json({ error: "Could not load profile." }, { status: 500 });
  return Response.json(data);
}

export async function PUT(request: Request) {
  const auth = await requireAdminApi(); if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => null); const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Check the profile details." }, { status: 400 });
  const { data, error } = await auth.supabase.from("profiles").upsert({ id: "main", ...parsed.data }).select().single();
  if (error) return Response.json({ error: "Could not save the profile." }, { status: 400 });
  return Response.json(data);
}
