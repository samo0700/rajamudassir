import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin-auth";
import { supabaseConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminIndexPage() {
  if (supabaseConfigured() && await isAdminSession()) redirect("/admin/dashboard");
  redirect("/admin/login");
}
