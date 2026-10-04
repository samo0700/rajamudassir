import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin-dashboard";
import { isAdminSession } from "@/lib/admin-auth";
import { supabaseConfigured } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Admin Dashboard" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  if (!supabaseConfigured() || !await isAdminSession()) redirect("/admin/login");
  return <div className="admin-mode"><AdminDashboard /></div>;
}
