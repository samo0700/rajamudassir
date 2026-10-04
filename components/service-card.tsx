import Link from "next/link";
import { ArrowUpRight, BriefcaseBusiness } from "lucide-react";
import type { Service } from "@/lib/types";

export function ServiceCard({ service, index = 0 }: { service: Service; index?: number }) {
  return <Link className="service-card" href={`/services/${service.slug}`}>
    <span className="service-card-top"><span className="service-card-icon"><BriefcaseBusiness size={19} strokeWidth={1.6} /></span><span className="service-index">{String(index + 1).padStart(2, "0")}</span></span>
    <span className="service-card-title">{service.title}</span>
    <span className="service-card-copy">{service.short_description}</span>
    <span className="service-card-link">Explore service <ArrowUpRight size={16} /></span>
  </Link>;
}
