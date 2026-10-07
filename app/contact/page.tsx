import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Clock3, Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { getPublicSettings } from "@/lib/data";
import { firm } from "@/lib/firm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contact", description: "Contact The Law Consulate, the website of SKB in Lahore, to discuss legal services or arrange a consultation." };

function safeMapUrl(value: string) {
  try {
    const url = new URL(value);
    return ["google.com", "www.google.com", "maps.google.com", "maps.app.goo.gl"].includes(url.hostname) && url.protocol === "https:" ? url.toString() : "";
  } catch { return ""; }
}

export default async function ContactPage() {
  const settings = await getPublicSettings();
  const email = settings.email;
  const phone = settings.phone;
  const mapUrl = safeMapUrl(settings.map_url);
  const coordinatesAvailable = settings.latitude !== null && settings.longitude !== null;
  const mapEmbed = coordinatesAvailable
    ? `https://www.google.com/maps?q=${settings.latitude},${settings.longitude}&output=embed`
    : mapUrl && new URL(mapUrl).pathname.includes("/maps/embed") ? mapUrl : "";
  const directions = coordinatesAvailable
    ? `https://www.google.com/maps/dir/?api=1&destination=${settings.latitude},${settings.longitude}`
    : mapUrl;
  return <>
    <section className="page-hero"><div className="wrap page-heading"><div className="breadcrumbs"><Link href="/">Home</Link> / Contact</div><span className="eyebrow">Get in touch</span><h1>We’re here to listen.</h1><p>Contact the office to ask about services, arrange a consultation, or share a general inquiry.</p></div></section>
    <section className="section"><div className="wrap contact-grid">
      <div><div className="contact-intro"><span className="eyebrow">SKB · Office information</span><h2>Connect with our office.</h2><p>{firm.websiteName} welcomes inquiries about the services of {firm.firmName}. Share your matter with our office so we can direct you to the relevant counsel.</p></div>
        <div className="contact-list"><div className="contact-item"><span className="contact-icon"><Mail size={17} /></span><div><small>Email</small><a href={`mailto:${email}`}>{email}</a></div></div>{phone && <div className="contact-item"><span className="contact-icon"><Phone size={16} /></span><div><small>Phone</small><a href={`tel:${phone}`}>{phone}</a></div></div>}<div className="contact-item"><span className="contact-icon"><MapPin size={17} /></span><div><small>Office</small><strong>{settings.address}, {settings.city}</strong></div></div><div className="contact-item"><span className="contact-icon"><Clock3 size={17} /></span><div><small>Office timings</small><strong>{settings.office_timings}</strong></div></div></div>
        <div className="map-card">{mapEmbed ? <iframe src={mapEmbed} title="Map showing the office location" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : <div className="map-placeholder"><MapPin size={23} /><strong>Adjacent to Lahore High Court</strong><span>Contact our office to confirm directions before visiting.</span></div>}</div>
        {directions && <a className="map-directions" href={directions} target="_blank" rel="noopener noreferrer">Open directions <ArrowUpRight size={14} /></a>}
      </div>
      <div><div className="contact-intro" style={{ marginBottom: 17 }}><span className="eyebrow">Send an inquiry</span><h2>How can we help?</h2><p>Share your contact details and a short note. The office will follow up.</p></div><ContactForm /></div>
    </div></section>
  </>;
}
