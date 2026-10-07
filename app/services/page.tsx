import type { Metadata } from "next";
import Link from "next/link";
import { ServiceCard } from "@/components/service-card";
import { getPublicSettings, getServices } from "@/lib/data";
import { firm } from "@/lib/firm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Legal Services", description: `Explore legal services at ${firm.websiteName}, representing ${firm.firmName} in Lahore. Find the relevant counsel and request a consultation through our office.` };

export default async function ServicesPage() {
  const [services, settings] = await Promise.all([getServices(), getPublicSettings()]);
  return <>
    <section className="page-hero"><div className="wrap page-heading"><div className="breadcrumbs"><Link href="/">Home</Link> / Services</div><span className="eyebrow">Our practice areas</span><h1>Thoughtful support across a range of legal matters.</h1><p>Explore the practice areas of {firm.firmName} through {firm.websiteName}. Our office can help you arrange a consultation with the relevant counsel.</p></div></section>
    <section className="section"><div className="wrap"><p className="service-page-intro">Each matter is different. Contact our office to discuss your circumstances and confirm the assistance available. The information on these pages is general in nature and does not constitute legal advice.</p>{services.length ? <div className="services-page-grid">{services.map((service, index) => <ServiceCard key={service.id} service={service} index={index} officePhone={settings.phone} />)}</div> : <div className="admin-empty">No services are currently published.</div>}</div></section>
  </>;
}
