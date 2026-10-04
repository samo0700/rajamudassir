import { requireAdminApi } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi(); if ("response" in auth) return auth.response;
  const { id } = await params;
  const { data: document, error } = await auth.supabase.from("consultation_documents").select("storage_path,file_name").eq("id", id).maybeSingle();
  if (error || !document) return Response.json({ error: "Document not found." }, { status: 404 });
  let admin;
  try { admin = createSupabaseAdminClient(); }
  catch { return Response.json({ error: "Secure document storage is not configured." }, { status: 503 }); }
  const { data, error: signedError } = await admin.storage.from("consultation-documents").createSignedUrl(document.storage_path, 60, { download: document.file_name });
  if (signedError || !data?.signedUrl) return Response.json({ error: "Could not create a secure document link." }, { status: 500 });
  return Response.json({ url: data.signedUrl });
}
