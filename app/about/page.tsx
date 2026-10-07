import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { CounselTeam } from "@/components/counsel-team";
import { getPublicSettings } from "@/lib/data";
import { firm } from "@/lib/firm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Our Firm & Counsel", description: "Meet the SKB counsel team at The Law Consulate, adjacent to Lahore High Court, with practice in civil, criminal, family, corporate, and tax / FBR matters." };

export default async function AboutPage() {
  const settings = await getPublicSettings();
  return <>
    <section className="page-hero"><div className="wrap page-heading"><div className="breadcrumbs"><Link href="/">Home</Link> / Our firm</div><span className="eyebrow">The Law Consulate · SKB</span><h1>Our firm. Our counsel. A considered approach.</h1><p>Meet the team behind our legal practice in Lahore.</p></div></section>
    <section className="section"><div className="wrap firm-about-grid">
      <figure className="firm-team-photo"><Image src={firm.teamImage} alt="The SKB legal team: Athar Touqeer, Noman Attique Gujjar, Raja Mahmood Subhani seated, Usman Touqeer, and Raja Mudassir." width={1024} height={765} sizes="(max-width: 700px) 100vw, 55vw" /><figcaption>The counsel of SKB · Lahore</figcaption></figure>
      <div className="about-copy"><span className="eyebrow">Our firm</span><h2>{firm.websiteName}</h2><p>{firm.introduction}</p><p>We work with individuals, families, and businesses. The relevant counsel considers the facts and documents of each matter, while our office coordinates inquiries and consultation requests.</p>
        <div className="about-facts"><div className="about-fact"><span>Firm</span><strong>{firm.firmName}</strong></div><div className="about-fact"><span>Office</span><strong>Adjacent to Lahore High Court</strong></div></div>
        <p style={{ marginTop: 22 }}><Link className="button button-dark" href="/consultation">Speak with our team <ArrowRight size={16} /></Link></p>
      </div>
    </div></section>
    <section className="section section-compact" id="our-team" style={{ background: "#fbfaf7" }}><div className="wrap"><div className="section-heading"><span className="eyebrow">Our counsel</span><h2>Meet the SKB team.</h2><p>Our counsel and their practice areas are listed below. Consultation requests are coordinated through our main office.</p></div><CounselTeam officePhone={settings.phone} /></div></section>
    <section className="section approach-section"><div className="wrap approach-grid"><div className="approach-intro"><span className="eyebrow">Our approach</span><h2>Clear information. Considered decisions.</h2><p>We focus on understanding the matter, explaining the proposed process, and preparing the agreed work with care.</p></div><div className="approach-list"><article className="approach-item"><span>01</span><div><h3>Listen carefully</h3><p>We begin with your account, documents, and concerns.</p></div></article><article className="approach-item"><span>02</span><div><h3>Explain the process</h3><p>We discuss relevant steps and practical considerations.</p></div></article><article className="approach-item"><span>03</span><div><h3>Prepare with care</h3><p>We approach each agreed matter with attention to its facts and requirements.</p></div></article></div></div></section>
    <section className="section section-compact"><div className="wrap office-cta"><div><span className="eyebrow">Our office</span><h2>Start with a conversation.</h2><p>{settings.address}, {settings.city}. Contact us to discuss arranging a consultation.</p></div><Link className="button button-primary" href="/contact">Get in touch <ArrowUpRight size={16} /></Link></div></section>
  </>;
}
