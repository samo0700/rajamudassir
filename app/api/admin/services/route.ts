import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { serviceSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireAdminApi(); if ("response" in auth) return auth.response;
  const { data, error } = await auth.supabase.from("services").select("*").order("display_order");
  if (error) return Response.json({ error: "Could not load services." }, { status: 500 });
  return Response.json(data);
}

export async function POST(request: Request) {
  const auth = await requireAdminApi(); if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => null);
  const parsed = serviceSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Check the service details." }, { status: 400 });
  const { data, error } = await auth.supabase.from("services").insert(parsed.data).select().single();
  if (error) return Response.json({ error: error.code === "23505" ? "That service slug is already in use." : "Could not create the service." }, { status: 400 });
  return Response.json(data, { status: 201 });
}

const updateSchema = z.object({ id: z.string().uuid(), service: serviceSchema });
export async function PATCH(request: Request) {
  const auth = await requireAdminApi(); if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => null); const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Check the service details." }, { status: 400 });
  const { data, error } = await auth.supabase.from("services").update(parsed.data.service).eq("id", parsed.data.id).select().single();
  if (error) return Response.json({ error: error.code === "23505" ? "That service slug is already in use." : "Could not update the service." }, { status: 400 });
  return Response.json(data);
}

const deleteSchema = z.string().uuid();
export async function DELETE(request: Request) {
  const auth = await requireAdminApi(); if ("response" in auth) return auth.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !deleteSchema.safeParse(id).success) return Response.json({ error: "A valid service id is required." }, { status: 400 });
  const { error } = await auth.supabase.from("services").delete().eq("id", id);
  if (error) return Response.json({ error: "Could not delete the service." }, { status: 400 });
  return Response.json({ ok: true });
}
