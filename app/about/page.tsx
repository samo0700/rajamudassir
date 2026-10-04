import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { getProfile, getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "About", description: "Learn about Raja Mudassir Advocate, Advocate High Court, and the approach to legal representation in Lahore." };

export default async function AboutPage() {
  const [profile, settings] = await Promise.all([getProfile(), getSettings()]);
  return <>
    <section className="page-hero"><div className="wrap page-heading"><div className="breadcrumbs"><Link href="/">Home</Link> / About</div><span className="eyebrow">The advocate</span><h1>Experience, perspective, and a commitment to careful counsel.</h1><p>Get to know Raja Mudassir Advocate and the principles that guide the practice.</p></div></section>
    <section className="section"><div className="wrap about-grid">
      <div className="profile-placeholder" aria-label={profile.profile_image ? `Portrait of ${profile.full_name}` : "Profile photograph placeholder"}>{profile.profile_image ? <Image src={profile.profile_image} alt={`Profile of ${profile.full_name}`} width={800} height={1000} unoptimized /> : <span className="profile-monogram">RM</span>}<div className="profile-caption"><span>{profile.professional_title}</span><span>{settings.city}</span></div></div>
      <div className="about-copy"><span className="eyebrow">Professional profile</span><h2>{profile.full_name}</h2><p>{profile.biography}</p><p>With {profile.experience_years} years of professional experience, the practice focuses on considered guidance and representation across the areas of law listed on this website. For information about a specific matter, please arrange a consultation.</p>
        <div className="about-facts"><div className="about-fact"><span>Professional title</span><strong>{profile.professional_title}</strong></div><div className="about-fact"><span>Experience</span><strong>{profile.experience_years} years</strong></div><div className="about-fact"><span>Bar council / association</span><strong>{profile.bar_council}</strong></div><div className="about-fact"><span>Office</span><strong>{settings.city}, near High Court</strong></div></div>
        <div className="note-box">Professional biography, profile photograph, and association details are managed by the office. No qualifications, awards, or affiliations are stated here unless verified and supplied by the advocate.</div>
        <p style={{ marginTop: 22 }}><Link className="button button-dark" href="/consultation">Request a consultation <ArrowRight size={16} /></Link></p>
      </div>
    </div></section>
    <section className="section approach-section"><div className="wrap approach-grid"><div className="approach-intro"><span className="eyebrow">Professional approach</span><h2>Clear information. Considered decisions.</h2><p>Legal representation works best when the facts, process, and expectations are discussed openly.</p></div><div className="approach-list"><article className="approach-item"><span>01</span><div><h3>Listen carefully</h3><p>Take time to understand the client’s account, documents, and concerns.</p></div></article><article className="approach-item"><span>02</span><div><h3>Explain the process</h3><p>Make relevant steps and practical considerations easier to understand.</p></div></article><article className="approach-item"><span>03</span><div><h3>Prepare with care</h3><p>Approach each agreed matter with focus on its particular facts and requirements.</p></div></article></div></div></section>
    <section className="section section-compact"><div className="wrap office-cta"><div><span className="eyebrow">Have a question?</span><h2>Start with a conversation.</h2><p>Contact the office to discuss arranging a consultation.</p></div><Link className="button button-primary" href="/contact">Get in touch <ArrowUpRight size={16} /></Link></div></section>
  </>;
}
