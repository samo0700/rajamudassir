import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock3, MapPin } from "lucide-react";
import { ConsultationForm } from "@/components/consultation-form";
import { getServices, getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Book a Consultation", description: "Request a legal consultation with Raja Mudassir Advocate in Lahore, Pakistan." };

export default async function ConsultationPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const [{ service }, services, settings] = await Promise.all([searchParams, getServices(), getSettings()]);
  const selectedCategory = services.find((item) => item.title === service)?.title || "";
  return <>
    <section className="page-hero"><div className="wrap page-heading"><div className="breadcrumbs"><Link href="/">Home</Link> / Book consultation</div><span className="eyebrow">Start a conversation</span><h1>Request a consultation.</h1><p>Share a few details about your matter and preferred time. The office will contact you to confirm availability.</p></div></section>
    <section className="section"><div className="wrap consultation-layout"><ConsultationForm services={services} selectedCategory={selectedCategory} /><aside className="consultation-aside"><span className="eyebrow">What to expect</span><h3>A careful first conversation.</h3><p>Your request will be reviewed by the office. An appointment is not confirmed until the office contacts you.</p><ul><li>Select the service that is closest to your matter.</li><li>Include a short summary; save detailed documents for a secure follow-up.</li><li>Requests begin as pending and are confirmed by the office.</li></ul><div className="aside-divider" /><p><MapPin size={15} style={{ verticalAlign: "-3px", marginRight: 6 }} />{settings.address}, {settings.city}</p><p><Clock3 size={15} style={{ verticalAlign: "-3px", marginRight: 6 }} />{settings.office_timings}</p><Link className="text-link" href="/contact">View contact information <ArrowRight size={15} /></Link><p className="fine-print">Submitting this form does not create an advocate-client relationship. This website is not an emergency service.</p></aside></div></section>
  </>;
}
