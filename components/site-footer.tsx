import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Facebook, Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import type { SiteSettings } from "@/lib/types";
import { firm } from "@/lib/firm";

function safeSocialUrl(value: string | undefined) {
  if (!value) return "";
  try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : ""; } catch { return ""; }
}

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  return <footer className="site-footer">
    <div className="wrap footer-top">
      <div className="footer-brand-block">
        <Link className="brand footer-brand" href="/"><Image className="brand-logo" src={settings.logo_url || firm.logoUrl} alt="SKB" width={54} height={54} unoptimized /><span><strong>{firm.websiteName}</strong><small>{firm.tagline}</small></span></Link>
        <p>{settings.footer_text}</p>
      </div>
      <div className="footer-column"><span className="eyebrow">Explore</span><Link href="/about">About</Link><Link href="/services">Legal services</Link><Link href="/consultation">Book consultation</Link><Link href="/contact">Contact</Link></div>
      <div className="footer-column footer-contact"><span className="eyebrow">Get in touch</span>
        {settings.email && <a href={`mailto:${settings.email}`}><Mail size={15} />{settings.email}</a>}
        {settings.phone && <a href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`}><Phone size={15} />{settings.phone}</a>}
        <span><MapPin size={15} />{[settings.address, settings.city].filter(Boolean).join(", ")}</span>
      </div>
      <div className="footer-note"><span className="eyebrow">A considered approach</span><p>Clear communication. Careful preparation. Representation shaped around the circumstances of each matter.</p><Link href="/consultation" className="text-link">Arrange a consultation <ArrowUpRight size={15} /></Link></div>
      <div className="footer-socials">{([["facebook", Facebook, "Facebook"], ["instagram", Instagram, "Instagram"], ["linkedin", Linkedin, "LinkedIn"]] as const).map(([key, Icon, label]) => { const href = safeSocialUrl(settings.social_links?.[key]); return href ? <a href={href} key={key} target="_blank" rel="noopener noreferrer" aria-label={label}><Icon size={16} /></a> : null; })}</div>
    </div>
    <div className="wrap footer-bottom"><span>© {new Date().getFullYear()} {firm.websiteName} · {firm.firmName}. All rights reserved.</span><span>General information only. No information on this website constitutes legal advice.</span></div>
  </footer>;
}
