"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";

export function ContactForm() {
  const [state, setState] = useState({ busy: false, error: "", success: false });
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setState({ busy: true, error: "", success: false }); const form = event.currentTarget;
    try {
      const response = await fetch("/api/contact", { method: "POST", body: new FormData(form) }); const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We could not send your message. Please try again.");
      form.reset(); setState({ busy: false, error: "", success: true });
    } catch (error) { setState({ busy: false, error: error instanceof Error ? error.message : "Something went wrong.", success: false }); }
  }
  if (state.success) return <div className="inline-success"><CheckCircle2 size={22} /><div><strong>Message received</strong><p>Thank you. Your message has been sent to the office.</p></div></div>;
  return <form className="contact-form" onSubmit={submit}>
    {state.error && <div className="form-alert" role="alert">{state.error}</div>}
    <div className="form-grid">
      <label>Your name <input name="name" required minLength={2} maxLength={120} autoComplete="name" placeholder="Full name" /></label>
      <label>Phone number <input name="phone" required minLength={7} maxLength={32} autoComplete="tel" placeholder="+92 3XX XXXXXXX" /></label>
      <label>Email address <input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="you@example.com" /></label>
      <label>Subject <input name="subject" required minLength={2} maxLength={160} placeholder="How can we help?" /></label>
      <label className="field-full">Message <textarea name="message" rows={5} required minLength={5} maxLength={3000} placeholder="Write your message…" /></label>
      <div className="trap-field" aria-hidden="true"><label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    </div>
    <button className="button button-dark" disabled={state.busy}>{state.busy ? <><LoaderCircle size={17} className="spin" /> Sending</> : <>Send message <ArrowRight size={17} /></>}</button>
  </form>;
}
