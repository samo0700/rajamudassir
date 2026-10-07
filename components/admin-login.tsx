"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, LoaderCircle, Scale } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { firm } from "@/lib/firm";

export function AdminLogin({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: loginError } = await supabase.auth.signInWithPassword({ email: String(form.get("email")), password: String(form.get("password")) });
      if (loginError) throw new Error("The email or password was not recognized.");
      const { data, error: accessError } = await supabase.rpc("is_admin");
      if (accessError || data !== true) { await supabase.auth.signOut(); throw new Error("This account has not been granted admin access."); }
      router.replace("/admin/dashboard"); router.refresh();
    } catch (caught) { setBusy(false); setError(caught instanceof Error ? caught.message : "Sign in could not be completed."); }
  }
  return <div className="login-wrap"><section className="login-card"><Link className="brand" href="/"><span className="brand-mark"><Scale size={20} /></span><span><strong>{firm.websiteName}</strong><small>{firm.firmName} · Administration</small></span></Link><h1>Admin sign in</h1><p>Use the administrator account created for this website.</p>
    {!configured ? <div className="form-alert">Supabase is not configured. Add the public project URL and key to the environment, then restart the server.</div> : <form className="login-form" onSubmit={submit}>{error && <div className="form-alert" role="alert">{error}</div>}<label>Email address<input name="email" type="email" required autoComplete="username" /></label><label>Password<input name="password" type="password" required autoComplete="current-password" /></label><button className="button button-dark" disabled={busy}>{busy ? <><LoaderCircle className="spin" size={17} /> Signing in</> : "Sign in securely"}</button></form>}
    <p className="fine-print" style={{ marginTop: 19 }}>Admin accounts are provisioned through Supabase. Public registration is disabled.</p><Link className="text-link" href="/"><ArrowLeft size={14} /> Return to website</Link></section></div>;
}
