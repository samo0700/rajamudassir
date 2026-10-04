"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, FileText, LoaderCircle, LogOut, Plus, RefreshCw, Save } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { defaultProfile, defaultSettings } from "@/lib/defaults";
import type { Consultation, ContactMessage, Profile, Service, SiteSettings } from "@/lib/types";

type Tab = "Overview" | "Consultations" | "Services" | "Profile" | "Office & settings" | "Messages";
type DataState = { profile: Profile; settings: SiteSettings; services: Service[]; consultations: Consultation[]; messages: ContactMessage[] };
const blankService = { title: "", slug: "", short_description: "", full_description: "", image_url: null as string | null, featured: false, published: false, display_order: 0, seo_title: "", seo_description: "" };
class AdminSessionExpired extends Error {}

async function fetchDashboardData(): Promise<DataState> {
  const endpoints = ["profile", "settings", "services", "consultations", "messages"];
  const results = await Promise.all(endpoints.map(async (endpoint) => {
    const response = await fetch(`/api/admin/${endpoint}`, { cache: "no-store" });
    const body = await response.json();
    if (response.status === 401 || response.status === 403) throw new AdminSessionExpired("Your admin session has ended.");
    if (!response.ok) throw new Error(body.error || `Could not load ${endpoint}.`);
    return body;
  }));
  return { profile: results[0] || defaultProfile, settings: results[1] || defaultSettings, services: results[2], consultations: results[3], messages: results[4] };
}

export function AdminDashboard() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("Overview");
  const [data, setData] = useState<DataState>({ profile: defaultProfile, settings: defaultSettings, services: [], consultations: [], messages: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [serviceDraft, setServiceDraft] = useState(blankService);
  const [editingService, setEditingService] = useState("");
  const [serviceFormOpen, setServiceFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serviceImage, setServiceImage] = useState<File | null>(null);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [logoImage, setLogoImage] = useState<File | null>(null);

  async function loadData() {
    setLoading(true); setError("");
    try { setData(await fetchDashboardData()); }
    catch (caught) { if (caught instanceof AdminSessionExpired) { router.replace("/admin/login"); return; } setError(caught instanceof Error ? caught.message : "Could not load the dashboard."); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    fetchDashboardData().then((result) => { if (active) setData(result); }).catch((caught: unknown) => { if (!active) return; if (caught instanceof AdminSessionExpired) { router.replace("/admin/login"); return; } setError(caught instanceof Error ? caught.message : "Could not load the dashboard."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [router]);

  async function api(path: string, method: string, body?: unknown) {
    const response = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "The change could not be saved.");
    return result;
  }

  async function uploadImage(file: File, kind: "service" | "profile" | "logo") {
    const form = new FormData(); form.set("file", file); form.set("kind", kind);
    const response = await fetch("/api/admin/upload", { method: "POST", body: form }); const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The image upload failed.");
    return result.url as string;
  }

  async function saveService(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      let imageUrl = serviceDraft.image_url;
      if (serviceImage) imageUrl = await uploadImage(serviceImage, "service");
      const payload = { ...serviceDraft, image_url: imageUrl, seo_title: serviceDraft.seo_title || null, seo_description: serviceDraft.seo_description || null };
      await api(editingService ? "/api/admin/services" : "/api/admin/services", editingService ? "PATCH" : "POST", editingService ? { id: editingService, service: payload } : payload);
      setServiceDraft(blankService); setServiceImage(null); setEditingService(""); setServiceFormOpen(false); setNotice("Service saved. Public pages now show the latest content."); await loadData();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save service."); }
    finally { setBusy(false); }
  }

  function editService(service: Service) {
    setServiceDraft({ ...service, seo_title: service.seo_title || "", seo_description: service.seo_description || "" }); setEditingService(service.id); setServiceImage(null); setServiceFormOpen(true); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteService(id: string) {
    if (!window.confirm("Delete this service? This cannot be undone.")) return;
    setError(""); setNotice("");
    try { await api(`/api/admin/services?id=${encodeURIComponent(id)}`, "DELETE"); setNotice("Service deleted."); await loadData(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not delete service."); }
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      let image = data.profile.profile_image;
      if (profileImage) image = await uploadImage(profileImage, "profile");
      await api("/api/admin/profile", "PUT", { ...data.profile, experience_years: Number(data.profile.experience_years), profile_image: image });
      setProfileImage(null); setNotice("Profile updated."); await loadData();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save profile."); }
    finally { setBusy(false); }
  }

  async function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      const logo = logoImage ? await uploadImage(logoImage, "logo") : data.settings.logo_url;
      await api("/api/admin/settings", "PUT", { ...data.settings, logo_url: logo, social_links: data.settings.social_links || {} });
      setLogoImage(null);
      setNotice("Office and site settings updated."); await loadData();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not save settings."); }
    finally { setBusy(false); }
  }

  async function updateConsultation(item: Consultation, status?: Consultation["status"]) {
    setError(""); setNotice("");
    try {
      const result = await api("/api/admin/consultations", "PATCH", { id: item.id, ...(status ? { status } : {}), internal_notes: item.internal_notes || "" });
      if (result.notification?.status === "sent") setNotice(`${status || "Appointment status"} saved. WhatsApp was accepted by Meta.`);
      else if (result.notification?.status === "not_configured") setNotice(`${status || "Appointment status"} saved. WhatsApp is not configured.`);
      else if (result.notification?.status === "failed") setNotice(`${status || "Appointment status"} saved, but WhatsApp failed. Check server logs and template settings.`);
      else if (result.notification?.status === "not_requested") setNotice(`${status || "Appointment status"} saved. The client did not opt in to WhatsApp updates.`);
      else setNotice("Appointment updated.");
      await loadData();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update appointment."); }
  }

  async function markMessage(message: ContactMessage) {
    try { await api("/api/admin/messages", "PATCH", { id: message.id, read_status: !message.read_status }); await loadData(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update message."); }
  }

  async function openDocument(id: string) {
    try { const result = await api(`/api/admin/consultations/${id}/document`, "GET"); window.open(result.url, "_blank", "noopener,noreferrer"); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not open secure document."); }
  }

  async function signOut() { const supabase = createSupabaseBrowserClient(); await supabase.auth.signOut(); router.replace("/admin/login"); router.refresh(); }

  const pending = useMemo(() => data.consultations.filter((item) => item.status === "Pending").length, [data.consultations]);
  const confirmed = useMemo(() => data.consultations.filter((item) => item.status === "Confirmed").length, [data.consultations]);
  const completed = useMemo(() => data.consultations.filter((item) => item.status === "Completed").length, [data.consultations]);
  const unread = useMemo(() => data.messages.filter((item) => !item.read_status).length, [data.messages]);

  function setProfile<K extends keyof Profile>(key: K, value: Profile[K]) { setData((current) => ({ ...current, profile: { ...current.profile, [key]: value } })); }
  function setSetting<K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) { setData((current) => ({ ...current, settings: { ...current.settings, [key]: value } })); }

  return <div className="admin-shell">
    <header className="admin-header"><Link className="brand" href="/"><span className="brand-mark"><span>RM</span></span><span><strong>Raja Mudassir Advocate</strong><small>Admin dashboard</small></span></Link><div className="admin-header-actions"><Link href="/" target="_blank">View website <ArrowUpRight size={14} /></Link><button onClick={() => void signOut()}><LogOut size={15} /> Sign out</button></div></header>
    <main className="admin-main">
      <div className="admin-title-row"><div><span className="eyebrow">Practice administration</span><h1>Dashboard</h1></div><button className="small-action" onClick={() => void loadData()}><RefreshCw size={13} /> Refresh</button></div>
      {error && <div className="admin-alert error" role="alert">{error}</div>}{notice && <div className="admin-alert" role="status">{notice}</div>}
      <nav className="admin-tabs" aria-label="Admin sections">{(["Overview", "Consultations", "Services", "Profile", "Office & settings", "Messages"] as Tab[]).map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}{item === "Messages" && unread ? ` (${unread})` : ""}</button>)}</nav>
      {loading ? <div className="admin-empty"><LoaderCircle className="spin" size={19} /> Loading dashboard…</div> : <>
        {tab === "Overview" && <>
          <div className="admin-stat-grid"><div className="admin-stat"><span>Total requests</span><strong>{data.consultations.length}</strong></div><div className="admin-stat"><span>Pending</span><strong>{pending}</strong></div><div className="admin-stat"><span>Confirmed</span><strong>{confirmed}</strong></div><div className="admin-stat"><span>Completed</span><strong>{completed}</strong></div></div>
          <div className="admin-stat-grid"><div className="admin-stat"><span>Published services</span><strong>{data.services.filter((service) => service.published).length}</strong></div><div className="admin-stat"><span>Unread inquiries</span><strong>{unread}</strong></div><div className="admin-stat"><span>All services</span><strong>{data.services.length}</strong></div><div className="admin-stat"><span>Office</span><strong style={{ fontSize: 19 }}>{data.settings.city || "Lahore"}</strong></div></div>
          <div className="admin-panel"><div className="admin-panel-heading"><h2>Recent consultation requests</h2><button className="small-action" onClick={() => setTab("Consultations")}>View all</button></div><ConsultationTable items={data.consultations.slice(0, 5)} update={updateConsultation} openDocument={openDocument} /></div>
          <div className="admin-panel"><div className="admin-panel-heading"><h2>Recent inquiries</h2><button className="small-action" onClick={() => setTab("Messages")}>View messages</button></div><MessageList items={data.messages.slice(0, 4)} mark={markMessage} /></div>
        </>}
        {tab === "Consultations" && <div className="admin-panel"><div className="admin-panel-heading"><h2>Consultation requests</h2><span className="status-pill pending">{pending} pending</span></div><ConsultationTable items={data.consultations} update={updateConsultation} openDocument={openDocument} /></div>}
        {tab === "Services" && <div className="admin-panel"><div className="admin-panel-heading"><h2>Services</h2><button className="button button-dark" onClick={() => { setServiceDraft(blankService); setEditingService(""); setServiceImage(null); setServiceFormOpen(!serviceFormOpen); }}><Plus size={15} /> Add service</button></div>
          {serviceFormOpen && <form className="admin-form" onSubmit={saveService} style={{ padding: "17px 0 23px", marginBottom: 18, borderBottom: "1px solid var(--line)" }}>
            <h3 className="field-full" style={{ margin: 0, fontFamily: "var(--serif)", fontSize: 20, fontWeight: 400 }}>{editingService ? "Edit service" : "New service"}</h3>
            <label>Service title<input required value={serviceDraft.title} onChange={(e) => setServiceDraft({ ...serviceDraft, title: e.target.value, slug: serviceDraft.slug || slugify(e.target.value) })} /></label>
            <label>URL slug<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={serviceDraft.slug} onChange={(e) => setServiceDraft({ ...serviceDraft, slug: e.target.value })} /></label>
            <label className="field-full">Short description<textarea required rows={2} maxLength={280} value={serviceDraft.short_description} onChange={(e) => setServiceDraft({ ...serviceDraft, short_description: e.target.value })} /></label>
            <label className="field-full">Detailed description<textarea required rows={5} value={serviceDraft.full_description} onChange={(e) => setServiceDraft({ ...serviceDraft, full_description: e.target.value })} /></label>
            <label>Service image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setServiceImage(e.target.files?.[0] || null)} /><small>{serviceDraft.image_url && !serviceImage ? "An image is currently saved; choose a new file to replace it." : "JPG, PNG or WebP · up to 6 MB"}</small></label>
            <label>Display order<input type="number" min="0" max="10000" value={serviceDraft.display_order} onChange={(e) => setServiceDraft({ ...serviceDraft, display_order: Number(e.target.value) })} /></label>
            <label>SEO title<input maxLength={160} value={serviceDraft.seo_title} onChange={(e) => setServiceDraft({ ...serviceDraft, seo_title: e.target.value })} /></label>
            <label>SEO description<input maxLength={320} value={serviceDraft.seo_description} onChange={(e) => setServiceDraft({ ...serviceDraft, seo_description: e.target.value })} /></label>
            <label className="check-field"><input type="checkbox" checked={serviceDraft.featured} onChange={(e) => setServiceDraft({ ...serviceDraft, featured: e.target.checked })} /> Featured on homepage</label>
            <label className="check-field"><input type="checkbox" checked={serviceDraft.published} onChange={(e) => setServiceDraft({ ...serviceDraft, published: e.target.checked })} /> Published on website</label>
            <div className="field-full" style={{ display: "flex", gap: 9 }}><button className="button button-primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={15} /> : <Save size={15} />}{editingService ? "Save changes" : "Create service"}</button><button className="small-action" type="button" onClick={() => { setServiceFormOpen(false); setEditingService(""); }}>Cancel</button></div>
          </form>}
          <ServiceTable services={data.services} edit={editService} remove={deleteService} toggle={async (service) => { try { await api("/api/admin/services", "PATCH", { id: service.id, service: { ...service, published: !service.published } }); setNotice("Service visibility updated."); await loadData(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update service."); } }} />
        </div>}
        {tab === "Profile" && <div className="admin-panel"><h2>Professional profile</h2><p className="fine-print">Public details appear on the About page and throughout the website. Only publish verified information.</p><form className="admin-form" onSubmit={saveProfile}>
          <label>Professional name<input required value={data.profile.full_name} onChange={(e) => setProfile("full_name", e.target.value)} /></label><label>Professional title<input required value={data.profile.professional_title} onChange={(e) => setProfile("professional_title", e.target.value)} /></label>
          <label>Years of experience<input type="number" min="0" max="100" value={data.profile.experience_years} onChange={(e) => setProfile("experience_years", Number(e.target.value))} /></label><label>Bar council / association<input value={data.profile.bar_council} onChange={(e) => setProfile("bar_council", e.target.value)} /></label>
          <label>Email address<input type="email" required value={data.profile.email} onChange={(e) => setProfile("email", e.target.value)} /></label><label>Phone<input value={data.profile.phone} onChange={(e) => setProfile("phone", e.target.value)} /></label>
          <label>WhatsApp number<input value={data.profile.whatsapp} onChange={(e) => setProfile("whatsapp", e.target.value)} /></label><label>Profile photograph<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setProfileImage(e.target.files?.[0] || null)} /><small>JPG, PNG or WebP · up to 6 MB</small></label>
          <label className="field-full">Biography<textarea rows={6} maxLength={10000} value={data.profile.biography} onChange={(e) => setProfile("biography", e.target.value)} /></label>
          <button className="button button-primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={15} /> : <Save size={15} />} Save profile</button>
        </form></div>}
        {tab === "Office & settings" && <div className="admin-panel"><h2>Office and site settings</h2><p className="fine-print">Only add an exact street address or map pin after it has been verified.</p><form className="admin-form" onSubmit={saveSettings}>
          <label>Phone<input value={data.settings.phone} onChange={(e) => setSetting("phone", e.target.value)} /></label><label>WhatsApp<input value={data.settings.whatsapp} onChange={(e) => setSetting("whatsapp", e.target.value)} /></label>
          <label>Public email<input type="email" required value={data.settings.email} onChange={(e) => setSetting("email", e.target.value)} /></label><label>City<input value={data.settings.city} onChange={(e) => setSetting("city", e.target.value)} /></label>
          <label className="field-full">Office address<input value={data.settings.address} onChange={(e) => setSetting("address", e.target.value)} placeholder="Near High Court (add confirmed street address when available)" /></label>
          <label>Office timings<input value={data.settings.office_timings} onChange={(e) => setSetting("office_timings", e.target.value)} /></label><label>Google Maps URL<input type="url" value={data.settings.map_url} onChange={(e) => setSetting("map_url", e.target.value)} placeholder="https://www.google.com/maps/..." /></label>
          <label>Latitude<input type="number" step="any" value={data.settings.latitude ?? ""} onChange={(e) => setSetting("latitude", e.target.value === "" ? null : Number(e.target.value))} /></label><label>Longitude<input type="number" step="any" value={data.settings.longitude ?? ""} onChange={(e) => setSetting("longitude", e.target.value === "" ? null : Number(e.target.value))} /></label>
          <label>Logo image URL<input type="url" value={data.settings.logo_url || ""} onChange={(e) => setSetting("logo_url", e.target.value || null)} /></label><label>Upload a logo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setLogoImage(e.target.files?.[0] || null)} /><small>JPG, PNG or WebP · up to 6 MB</small></label><label className="field-full">Footer text<input value={data.settings.footer_text} onChange={(e) => setSetting("footer_text", e.target.value)} /></label>
          <label>Facebook URL<input type="url" value={data.settings.social_links?.facebook || ""} onChange={(e) => setSetting("social_links", { ...data.settings.social_links, facebook: e.target.value })} /></label><label>Instagram URL<input type="url" value={data.settings.social_links?.instagram || ""} onChange={(e) => setSetting("social_links", { ...data.settings.social_links, instagram: e.target.value })} /></label><label>LinkedIn URL<input type="url" value={data.settings.social_links?.linkedin || ""} onChange={(e) => setSetting("social_links", { ...data.settings.social_links, linkedin: e.target.value })} /></label>
          <button className="button button-primary" disabled={busy}>{busy ? <LoaderCircle className="spin" size={15} /> : <Save size={15} />} Save settings</button>
        </form></div>}
        {tab === "Messages" && <div className="admin-panel"><div className="admin-panel-heading"><h2>Contact inquiries</h2><span>{unread} unread</span></div><MessageList items={data.messages} mark={markMessage} /></div>}
      </>}
    </main>
  </div>;
}

function slugify(value: string) { return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

function ConsultationTable({ items, update, openDocument }: { items: Consultation[]; update: (item: Consultation, status?: Consultation["status"]) => Promise<void>; openDocument: (id: string) => Promise<void> }) {
  if (!items.length) return <div className="admin-empty">No consultation requests yet.</div>;
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Client / reference</th><th>Matter & requested time</th><th>Contact</th><th>Status</th><th>Files / actions</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.full_name}</strong><br /><span>{item.booking_reference}</span><br /><span>{new Date(item.created_at).toLocaleDateString()}</span><small style={{ display: "block", marginTop: 5, opacity: .72 }}>Admin WhatsApp: {item.admin_whatsapp_status || "Unknown"}</small><small style={{ display: "block", opacity: .72 }}>Client WhatsApp: {item.client_whatsapp_status || "Unknown"}</small></td><td><strong>{item.case_category}</strong><br /><span>{item.preferred_date} · {item.preferred_time}</span><br /><span>{item.message || "No case summary"}</span><details><summary>Internal notes</summary><textarea aria-label={`Internal notes for ${item.full_name}`} defaultValue={item.internal_notes} rows={2} onBlur={(event) => { if (event.target.value !== item.internal_notes) void update({ ...item, internal_notes: event.target.value }); }} /></details></td><td><a href={`tel:${item.phone}`}>{item.phone}</a><br /><a href={`mailto:${item.email}`}>{item.email}</a></td><td><span className={`status-pill ${item.status.toLowerCase()}`}>{item.status}</span><select aria-label={`Change status for ${item.full_name}`} value={item.status} onChange={(event) => void update(item, event.target.value as Consultation["status"])} style={{ display: "block", marginTop: 7, maxWidth: 125, minHeight: 31, fontSize: 10 }}><option>Pending</option><option>Confirmed</option><option>Completed</option><option>Cancelled</option></select></td><td>{item.consultation_documents?.length ? <div className="admin-actions">{item.consultation_documents.map((doc) => <button className="small-action" key={doc.id} onClick={() => void openDocument(doc.id)}><FileText size={12} /> {doc.file_name}</button>)}</div> : <span>No attachment</span>}<div className="admin-actions" style={{ marginTop: 7 }}><button className="small-action" onClick={() => void update(item)}>Save notes</button></div></td></tr>)}</tbody></table></div>;
}

function ServiceTable({ services, edit, remove, toggle }: { services: Service[]; edit: (service: Service) => void; remove: (id: string) => void; toggle: (service: Service) => void }) {
  if (!services.length) return <div className="admin-empty">No services found.</div>;
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Service</th><th>Featured</th><th>Order</th><th>Visibility</th><th>Actions</th></tr></thead><tbody>{services.map((service) => <tr key={service.id}><td><strong>{service.title}</strong><br /><span>/{service.slug}</span></td><td>{service.featured ? "Yes" : "—"}</td><td>{service.display_order}</td><td><span className={`status-pill ${service.published ? "confirmed" : "cancelled"}`}>{service.published ? "Published" : "Hidden"}</span></td><td><div className="admin-actions"><button className="small-action" onClick={() => edit(service)}>Edit</button><button className="small-action" onClick={() => void toggle(service)}>{service.published ? "Unpublish" : "Publish"}</button><button className="small-action danger" onClick={() => void remove(service.id)}>Delete</button></div></td></tr>)}</tbody></table></div>;
}

function MessageList({ items, mark }: { items: ContactMessage[]; mark: (message: ContactMessage) => void }) {
  if (!items.length) return <div className="admin-empty">No contact inquiries yet.</div>;
  return <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Sender</th><th>Subject / message</th><th>Received</th><th>Status</th><th></th></tr></thead><tbody>{items.map((message) => <tr key={message.id}><td><strong>{message.name}</strong><br /><a href={`tel:${message.phone}`}>{message.phone}</a><br /><a href={`mailto:${message.email}`}>{message.email}</a></td><td><strong>{message.subject}</strong><br /><span>{message.message}</span></td><td>{new Date(message.created_at).toLocaleString()}</td><td><span className={`status-pill ${message.read_status ? "" : "pending"}`}>{message.read_status ? "Read" : "New"}</span></td><td><button className="small-action" onClick={() => mark(message)}>{message.read_status ? "Mark unread" : "Mark read"}</button></td></tr>)}</tbody></table></div>;
}
