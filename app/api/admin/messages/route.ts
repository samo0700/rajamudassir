import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";

export async function GET() {
  const auth = await requireAdminApi(); if ("response" in auth) return auth.response;
  const { data, error } = await auth.supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
  if (error) return Response.json({ error: "Could not load messages." }, { status: 500 });
  return Response.json(data);
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApi(); if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => null);
  const parsed = z.object({ id: z.string().uuid(), read_status: z.boolean() }).safeParse(body);
  if (!parsed.success) return Response.json({ error: "Check the message update." }, { status: 400 });
  const { error } = await auth.supabase.from("contact_messages").update({ read_status: parsed.data.read_status }).eq("id", parsed.data.id);
  if (error) return Response.json({ error: "Could not update the message." }, { status: 400 });
  return Response.json({ ok: true });
}
