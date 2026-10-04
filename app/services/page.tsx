import type { Metadata } from "next";
import Link from "next/link";
import { ServiceCard } from "@/components/service-card";
import { getServices } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Legal Services", description: "Explore legal services and arrange a consultation with Raja Mudassir Advocate in Lahore, Pakistan." };

export default async function ServicesPage() {
  const services = await getServices();
  return <>
    <section className="page-hero"><div className="wrap page-heading"><div className="breadcrumbs"><Link href="/">Home</Link> / Services</div><span className="eyebrow">Areas of service</span><h1>Thoughtful support across a range of legal matters.</h1><p>Explore the services offered by Raja Mudassir Advocate. A consultation can help determine whether assistance is suitable for your particular circumstances.</p></div></section>
    <section className="section"><div className="wrap"><p className="service-page-intro">Each matter is different. The information on these pages is general in nature and should not be relied on as legal advice. Please contact the office to discuss the facts and confirm the services available.</p>{services.length ? <div className="services-page-grid">{services.map((service, index) => <ServiceCard key={service.id} service={service} index={index} />)}</div> : <div className="admin-empty">No services are currently published.</div>}</div></section>
  </>;
}
