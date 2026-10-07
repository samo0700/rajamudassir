import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness } from "lucide-react";
import { CounselContact } from "@/components/counsel-contact";
import type { Service } from "@/lib/types";

export function ServiceCard({ service, index = 0, officePhone = "" }: { service: Service; index?: number; officePhone?: string }) {
  return <article className="service-card">
    <span className="service-card-top"><span className="service-card-icon"><BriefcaseBusiness size={19} strokeWidth={1.6} /></span><span className="service-index">{String(index + 1).padStart(2, "0")}</span></span>
    <h3 className="service-card-title"><Link href={`/services/${service.slug}`}>{service.title}</Link></h3>
    <p className="service-card-copy">{service.short_description}</p>
    <CounselContact service={service} officePhone={officePhone} compact />
    <Link className="service-card-link" href={`/services/${service.slug}`}>Explore service <ArrowUpRight size={16} /></Link>
  </article>;
}
