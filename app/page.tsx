import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, MapPin } from "lucide-react";
import { ServiceCard } from "@/components/service-card";
import { CounselTeam } from "@/components/counsel-team";
import { getPublicSettings, getServices } from "@/lib/data";
import { firm } from "@/lib/firm";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [services, settings] = await Promise.all([getServices(), getPublicSettings()]);
  const featured = services.filter((service) => service.featured).slice(0, 4);
  return <>
    <section className="hero">
      <div className="wrap hero-inner">
        <div className="hero-content">
          <span className="eyebrow">{firm.websiteName} · Lahore</span>
          <h1>Clear counsel.<em>Steady advocacy.</em></h1>
          <p className="hero-subtitle">A legal practice by {firm.firmName}.</p>
          <p className="hero-copy">Our counsel brings together civil, criminal, family, corporate, and tax / FBR practice. Speak with our office about the support your matter needs.</p>
          <div className="hero-actions"><Link className="button button-primary" href="/consultation">Book consultation <ArrowRight size={17} /></Link><Link className="button button-outline" href="/contact">Contact the office <ArrowUpRight size={16} /></Link></div>
          <div className="hero-meta"><span><strong>SKB</strong>Our firm</span><span><strong>Five counsel</strong>Our team</span><span><strong>Lahore High Court</strong>Adjacent office</span></div>
        </div>
        <figure className="hero-team-photo">
          <Image src={firm.teamImage} alt="SKB counsel team, left to right: Athar Touqeer, Noman Attique Gujjar, Raja Mahmood Subhani seated in the centre, Usman Touqeer, and Raja Mudassir." width={1024} height={765} sizes="(max-width: 700px) 100vw, 50vw" preload />
          <figcaption><span>The counsel of SKB</span><span>{firm.websiteName}</span></figcaption>
        </figure>
      </div>
    </section>
    <section className="section">
      <div className="wrap intro-section">
        <div className="intro-copy"><span className="eyebrow">A measured approach</span><h2>Practical guidance for consequential matters.</h2></div>
        <div><p>{firm.introduction}</p><p>We begin by listening to the facts, understanding your concerns, and discussing the scope of any proposed work. Our approach centres on preparation and clear communication.</p><div className="intro-aside">Every matter is different. Advice and representation are shaped by the details of your case and applicable law.</div><p><Link className="text-link" href="/about">Learn about our firm <ArrowUpRight size={15} /></Link></p></div>
      </div>
    </section>
    <section className="section section-compact" style={{ background: "#fbfaf7" }}>
      <div className="wrap">
        <div className="section-heading section-heading-inline"><div><span className="eyebrow">Areas of service</span><h2>Legal support for the matters that affect you.</h2></div><Link className="text-link" href="/services">View all services <ArrowUpRight size={15} /></Link></div>
        {featured.length ? <div className="service-grid">{featured.map((service, index) => <ServiceCard service={service} officePhone={settings.phone} index={index} key={service.id} />)}</div> : <p className="admin-empty">Featured services will appear here when published.</p>}
      </div>
    </section>
    <section className="section"><div className="wrap"><div className="section-heading section-heading-inline"><div><span className="eyebrow">Our counsel</span><h2>A team for the matters that matter to you.</h2></div><Link className="text-link" href="/about#our-team">Meet our team <ArrowUpRight size={15} /></Link></div><CounselTeam officePhone={settings.phone} /></div></section>
    <section className="section approach-section">
      <div className="wrap approach-grid">
        <div className="approach-intro"><span className="eyebrow">Working together</span><h2>A clear process, from the first conversation.</h2><p>Understanding the situation comes first. The next steps are discussed with care, with a focus on what is relevant to your matter.</p><Link href="/consultation" className="text-link">Request a consultation <ArrowUpRight size={15} /></Link></div>
        <div className="approach-list"><article className="approach-item"><span>01</span><div><h3>Listen and understand</h3><p>Share the key facts and any questions you have so the matter can be understood in context.</p></div></article><article className="approach-item"><span>02</span><div><h3>Consider the options</h3><p>Discuss relevant information, potential processes, and the documents that may be needed.</p></div></article><article className="approach-item"><span>03</span><div><h3>Agree on next steps</h3><p>Where representation is appropriate, clarify the scope of work and practical next steps.</p></div></article></div>
      </div>
    </section>
    <section className="section section-compact"><div className="wrap office-cta"><div><span className="eyebrow"><MapPin size={13} /> SKB office · {settings.city || firm.city}</span><h2>Speak with our office about your matter.</h2><p>{settings.address || firm.address}, {settings.city || firm.city}</p></div><Link href="/contact" className="button button-primary">Office details <ArrowRight size={16} /></Link></div></section>
  </>;
}
