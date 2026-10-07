import { Phone } from "lucide-react";
import { firm, getCounselForService } from "@/lib/firm";

type Props = {
  service: { slug: string; title: string };
  officePhone?: string;
  compact?: boolean;
};

export function CounselContact({ service, officePhone = "", compact = false }: Props) {
  const counsel = getCounselForService(service);
  const telephone = officePhone.trim().replace(/[^\d+]/g, "");

  if (!counsel && !telephone) return null;

  return <div className={`counsel-contact${compact ? " counsel-contact-compact" : ""}`}>
    {counsel && <>
      <span className="counsel-contact-label">Counsel for this practice area</span>
      <span className="counsel-contact-name">{counsel.name}</span>
      <span className="counsel-contact-designation">{counsel.designation} · {firm.firmName}</span>
    </>}
    {telephone && <a className="counsel-office-phone" href={`tel:${telephone}`} aria-label={`Call the ${firm.websiteName} main office at ${officePhone}`}><Phone size={14} aria-hidden="true" /><span>Main office: {officePhone}</span></a>}
  </div>;
}
