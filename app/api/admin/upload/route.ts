import { randomUUID } from "node:crypto";
import { requireAdminApi } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const imageTypes: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function POST(request: Request) {
  const auth = await requireAdminApi(); if ("response" in auth) return auth.response;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file"); const kind = form?.get("kind");
  if (!(file instanceof File) || !file.size || !["service", "profile", "logo"].includes(String(kind))) return Response.json({ error: "Choose a valid image to upload." }, { status: 400 });
  const extension = imageTypes[file.type];
  if (!extension || file.name.split(".").pop()?.toLowerCase() !== extension) return Response.json({ error: "Images must be JPG, PNG, or WebP files." }, { status: 400 });
  if (file.size > 6 * 1024 * 1024) return Response.json({ error: "Images must be smaller than 6 MB." }, { status: 400 });
  const signature = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const validSignature = file.type === "image/jpeg" ? signature[0] === 0xff && signature[1] === 0xd8 && signature[2] === 0xff
    : file.type === "image/png" ? signature.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10"
    : String.fromCharCode(...signature.slice(0, 4)) === "RIFF" && String.fromCharCode(...signature.slice(8, 12)) === "WEBP";
  if (!validSignature) return Response.json({ error: "The selected file is not a valid image." }, { status: 400 });
  let admin;
  try { admin = createSupabaseAdminClient(); }
  catch { return Response.json({ error: "Supabase storage is not configured." }, { status: 503 }); }
  const path = `${kind}/${randomUUID()}.${extension}`;
  const { error } = await admin.storage.from("public-assets").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (error) return Response.json({ error: "The image could not be uploaded." }, { status: 500 });
  const { data } = admin.storage.from("public-assets").getPublicUrl(path);
  return Response.json({ url: data.publicUrl }, { status: 201 });
}
