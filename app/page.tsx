import Link from "next/link";
import { ArrowRight, ArrowUpRight, MapPin } from "lucide-react";
import { ServiceCard } from "@/components/service-card";
import { getProfile, getServices, getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [profile, services, settings] = await Promise.all([getProfile(), getServices(), getSettings()]);
  const featured = services.filter((service) => service.featured).slice(0, 4);
  return <>
    <section className="hero">
      <div className="wrap hero-inner">
        <div className="hero-content">
          <span className="eyebrow">Legal counsel · Lahore, Pakistan</span>
          <h1>Clear counsel.<em>Steady advocacy.</em></h1>
          <p className="hero-subtitle">{profile.full_name} · {profile.professional_title}</p>
          <p className="hero-copy">Thoughtful legal representation and consultation for individuals, families, and businesses in Lahore and across Pakistan.</p>
          <div className="hero-actions"><Link className="button button-primary" href="/consultation">Book consultation <ArrowRight size={17} /></Link><Link className="button button-outline" href="/contact">Contact the office <ArrowUpRight size={16} /></Link></div>
          <div className="hero-meta"><span><strong>{profile.experience_years} years</strong>Experience</span><span><strong>{profile.bar_council}</strong>Bar association</span><span><strong>Lahore</strong>Office location</span></div>
        </div>
        <div className="hero-art" aria-label="Abstract architectural detail">
          <div className="hero-art-frame" /><div className="hero-art-inner"><div className="column-arch" /><div className="arch-base" /></div>
          <div className="hero-quote">“Good counsel begins with listening.”<small>A considered first step</small></div>
        </div>
      </div>
    </section>
    <section className="section">
      <div className="wrap intro-section">
        <div className="intro-copy"><span className="eyebrow">A measured approach</span><h2>Practical guidance for consequential matters.</h2></div>
        <div><p>Legal issues can carry lasting consequences. Raja Mudassir Advocate offers consultation and representation grounded in careful preparation, direct communication, and an understanding of each client’s circumstances.</p><p>Whether you need to understand your options, prepare for a proceeding, or resolve a dispute, begin with a conversation about the facts and the way forward.</p><div className="intro-aside">Every matter is different. Advice and representation are shaped by the details of your case and applicable law.</div><p><Link className="text-link" href="/about">Learn about the practice <ArrowUpRight size={15} /></Link></p></div>
      </div>
    </section>
    <section className="section section-compact" style={{ background: "#fbfaf7" }}>
      <div className="wrap">
        <div className="section-heading section-heading-inline"><div><span className="eyebrow">Areas of service</span><h2>Legal support for the matters that affect you.</h2></div><Link className="text-link" href="/services">View all services <ArrowUpRight size={15} /></Link></div>
        {featured.length ? <div className="service-grid">{featured.map((service, index) => <ServiceCard service={service} index={index} key={service.id} />)}</div> : <p className="admin-empty">Featured services will appear here when published.</p>}
      </div>
    </section>
    <section className="section approach-section">
      <div className="wrap approach-grid">
        <div className="approach-intro"><span className="eyebrow">Working together</span><h2>A clear process, from the first conversation.</h2><p>Understanding the situation comes first. The next steps are discussed with care, with a focus on what is relevant to your matter.</p><Link href="/consultation" className="text-link">Request a consultation <ArrowUpRight size={15} /></Link></div>
        <div className="approach-list"><article className="approach-item"><span>01</span><div><h3>Listen and understand</h3><p>Share the key facts and any questions you have so the matter can be understood in context.</p></div></article><article className="approach-item"><span>02</span><div><h3>Consider the options</h3><p>Discuss relevant information, potential processes, and the documents that may be needed.</p></div></article><article className="approach-item"><span>03</span><div><h3>Agree on next steps</h3><p>Where representation is appropriate, clarify the scope of work and practical next steps.</p></div></article></div>
      </div>
    </section>
    <section className="section section-compact"><div className="wrap office-cta"><div><span className="eyebrow"><MapPin size={13} /> Office · {settings.city || "Lahore"}</span><h2>Speak with the office about your matter.</h2><p>{settings.address || "Near High Court"}, {settings.city || "Lahore"} · Exact address available when confirmed.</p></div><Link href="/contact" className="button button-primary">Office details <ArrowRight size={16} /></Link></div></section>
  </>;
}
