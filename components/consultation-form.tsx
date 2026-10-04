"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, FileText, LoaderCircle } from "lucide-react";
import type { Service } from "@/lib/types";

export function ConsultationForm({ services, selectedCategory = "" }: { services: Service[]; selectedCategory?: string }) {
  const [state, setState] = useState<{ busy: boolean; error: string; reference: string }>({ busy: false, error: "", reference: "" });
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ busy: true, error: "", reference: "" });
    const form = event.currentTarget;
    const file = (form.elements.namedItem("attachment") as HTMLInputElement).files?.[0];
    if (file && file.size > 8 * 1024 * 1024) { setState({ busy: false, error: "Please choose a file smaller than 8 MB.", reference: "" }); return; }
    try {
      const response = await fetch("/api/consultations", { method: "POST", body: new FormData(form) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We could not submit your request. Please try again.");
      setState({ busy: false, error: "", reference: result.booking_reference });
      form.reset();
    } catch (error) { setState({ busy: false, error: error instanceof Error ? error.message : "Something went wrong. Please try again.", reference: "" }); }
  }
  if (state.reference) return <div className="form-success"><span className="success-icon"><CheckCircle2 size={28} /></span><span className="eyebrow">Request received</span><h2>Thank you for reaching out.</h2><p>Your consultation request has been received and is pending review. Keep this reference for your records.</p><strong className="booking-reference">{state.reference}</strong><p className="fine-print">Submitting a request does not establish an advocate-client relationship. The office will contact you to confirm availability.</p></div>;
  return <form className="form-card consultation-form" onSubmit={submit}>
    <div className="form-intro"><span className="eyebrow">Consultation request</span><h2>Tell us a little about your matter.</h2><p>Share your preferred time and a brief summary. The office will follow up to confirm availability.</p></div>
    {state.error && <div className="form-alert" role="alert">{state.error}</div>}
    <div className="form-grid">
      <label>Full name <input name="full_name" required minLength={2} maxLength={120} autoComplete="name" placeholder="Your full name" /></label>
      <label>Phone number <input name="phone" required minLength={7} maxLength={32} autoComplete="tel" placeholder="+92 3XX XXXXXXX" /></label>
      <label>Email address <input name="email" type="email" required maxLength={254} autoComplete="email" placeholder="you@example.com" /></label>
      <label>Case category <select name="case_category" required defaultValue={selectedCategory}><option value="" disabled>Select a service</option>{services.map((service) => <option key={service.id} value={service.title}>{service.title}</option>)}<option value="Not sure yet">Not sure yet</option></select></label>
      <label>Preferred date <input name="preferred_date" type="date" required min={new Date().toISOString().slice(0, 10)} /></label>
      <label>Preferred time <select name="preferred_time" required defaultValue=""><option value="" disabled>Select a time range</option><option>Morning (9 am–12 pm)</option><option>Afternoon (12 pm–4 pm)</option><option>Evening (4 pm–7 pm)</option><option>Flexible</option></select></label>
      <label>Preferred contact method <select name="preferred_contact_method" defaultValue="Phone"><option>Phone</option><option>WhatsApp</option><option>Email</option></select><small style={{ fontWeight: 400, letterSpacing: 0, lineHeight: 1.5 }}>Choosing WhatsApp opts you in to receive consultation booking updates from Raja Mudassir Advocate at the phone number above.</small></label>
      <label className="file-field">Attach a document <span className="file-input-wrap"><FileText size={17} /><input name="attachment" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" /><small>PDF, JPG, PNG, DOC or DOCX · up to 8 MB</small></span></label>
      <label className="field-full">Short case summary <textarea name="message" rows={5} maxLength={3000} placeholder="Briefly describe what you would like to discuss…" /></label>
      <div className="trap-field" aria-hidden="true"><label>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    </div>
    <p className="fine-print">Please do not send highly sensitive information until the office has confirmed a secure way to share it.</p>
    <button className="button button-primary form-submit" disabled={state.busy}>{state.busy ? <><LoaderCircle size={17} className="spin" /> Sending request</> : <>Send consultation request <ArrowRight size={17} /></>}</button>
  </form>;
}
