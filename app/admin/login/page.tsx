import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isAdminSession } from "@/lib/admin-auth";
import { supabaseConfigured } from "@/lib/supabase/admin";
import { AdminLogin } from "@/components/admin-login";

export const metadata: Metadata = { title: "Admin Sign in" };
export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (supabaseConfigured() && await isAdminSession()) redirect("/admin/dashboard");
  return <div className="admin-mode"><AdminLogin configured={supabaseConfigured()} /></div>;
}
