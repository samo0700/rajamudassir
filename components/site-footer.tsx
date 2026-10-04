import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, Facebook, Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import type { Profile, SiteSettings } from "@/lib/types";

function safeSocialUrl(value: string | undefined) {
  if (!value) return "";
  try { const url = new URL(value); return url.protocol === "https:" ? url.toString() : ""; } catch { return ""; }
}

export function SiteFooter({ profile, settings }: { profile: Profile; settings: SiteSettings }) {
  return <footer className="site-footer">
    <div className="wrap footer-top">
      <div className="footer-brand-block">
        <Link className="brand footer-brand" href="/">{settings.logo_url ? <Image className="brand-logo" src={settings.logo_url} alt="" width={42} height={42} unoptimized /> : <span className="brand-mark"><span>RM</span></span>}<span><strong>{profile.full_name}</strong><small>{profile.professional_title}</small></span></Link>
        <p>{settings.footer_text}</p>
      </div>
      <div className="footer-column"><span className="eyebrow">Explore</span><Link href="/about">About</Link><Link href="/services">Legal services</Link><Link href="/consultation">Book consultation</Link><Link href="/contact">Contact</Link></div>
      <div className="footer-column footer-contact"><span className="eyebrow">Get in touch</span>
        <a href={`mailto:${settings.email || profile.email}`}><Mail size={15} />{settings.email || profile.email}</a>
        {(settings.phone || profile.phone) && <a href={`tel:${settings.phone || profile.phone}`}><Phone size={15} />{settings.phone || profile.phone}</a>}
        <span><MapPin size={15} />{[settings.address, settings.city].filter(Boolean).join(", ")}</span>
      </div>
      <div className="footer-note"><span className="eyebrow">A considered approach</span><p>Clear communication. Careful preparation. Representation shaped around the circumstances of each matter.</p><Link href="/consultation" className="text-link">Arrange a consultation <ArrowUpRight size={15} /></Link></div>
      <div className="footer-socials">{([["facebook", Facebook, "Facebook"], ["instagram", Instagram, "Instagram"], ["linkedin", Linkedin, "LinkedIn"]] as const).map(([key, Icon, label]) => { const href = safeSocialUrl(settings.social_links?.[key]); return href ? <a href={href} key={key} target="_blank" rel="noopener noreferrer" aria-label={label}><Icon size={16} /></a> : null; })}</div>
    </div>
    <div className="wrap footer-bottom"><span>© {new Date().getFullYear()} {profile.full_name}. All rights reserved.</span><span>General information only. No information on this website constitutes legal advice.</span></div>
  </footer>;
}
