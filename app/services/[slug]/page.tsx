import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight, BriefcaseBusiness } from "lucide-react";
import { getPublicSettings, getService, getServices } from "@/lib/data";
import { CounselContact } from "@/components/counsel-contact";
import { firm } from "@/lib/firm";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = await getService(slug);
  if (!service) return { title: "Service not found" };
  const title = service.seo_title || service.title;
  const description = service.seo_description || `${service.short_description} Contact ${firm.websiteName} to arrange a consultation with the ${firm.firmName} team in Lahore.`;
  return { title, description, openGraph: { title, description, siteName: firm.websiteName } };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const [service, services, settings] = await Promise.all([getService(slug), getServices(), getPublicSettings()]);
  if (!service) notFound();
  const related = services.filter((item) => item.id !== service.id).slice(0, 3);
  return <>
    <section className="detail-hero"><div className="wrap page-heading"><div className="breadcrumbs"><Link href="/">Home</Link> / <Link href="/services">Services</Link> / {service.title}</div><span className="eyebrow">Legal services</span><h1>{service.title}</h1><p>{service.short_description}</p></div></section>
    <section className="section"><div className="wrap detail-columns"><article className="detail-body"><div className="detail-image">{service.image_url ? <Image src={service.image_url} alt={`${service.title} legal service`} width={1200} height={700} unoptimized /> : <BriefcaseBusiness aria-hidden="true" />}</div>{service.full_description.split(/\n{2,}/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}<h2>Discuss your matter</h2><p>A consultation can help clarify which details, records, or next steps may be relevant. The appropriate process depends on the particular facts and applicable law.</p><p className="disclaimer">This page provides general information only and does not constitute legal advice or establish an advocate-client relationship.</p></article>
      <aside className="detail-aside"><h3>Contact {firm.websiteName}</h3><p>Our office coordinates consultations for {firm.firmName}. Request a consultation to discuss your matter with the relevant counsel.</p><CounselContact service={service} officePhone={settings.phone} /><Link className="button button-dark" href={`/consultation?service=${encodeURIComponent(service.title)}`}>Book consultation <ArrowRight size={16} /></Link>{settings.whatsapp && <a className="button button-primary" style={{ width: "100%", marginTop: 9 }} href={`https://wa.me/${settings.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello ${firm.websiteName}, I would like to inquire about ${service.title}.`)}`} target="_blank" rel="noopener noreferrer">WhatsApp the office <ArrowUpRight size={15} /></a>}<p className="disclaimer">Information provided here is general and not a substitute for legal advice.</p></aside>
    </div></section>
    {!!related.length && <section className="section section-compact" style={{ background: "#fbfaf7" }}><div className="wrap"><div className="section-heading"><span className="eyebrow">You may also explore</span><h2>Related legal services</h2></div><div className="related-grid" style={{ marginTop: 27 }}>{related.map((item) => <Link href={`/services/${item.slug}`} className="related-link" key={item.id}>{item.title} <ArrowUpRight size={15} /></Link>)}</div></div></section>}
  </>;
}
