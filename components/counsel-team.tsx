import Link from "next/link";
import { ArrowUpRight, Phone } from "lucide-react";
import { counselTeam } from "@/lib/firm";

export function CounselTeam({ officePhone = "" }: { officePhone?: string }) {
  return <div className="counsel-grid">{counselTeam.map((counsel) => <article className="counsel-card" id={counsel.id} key={counsel.id}>
    <span className="counsel-role">{counsel.designation}</span>
    <h3>{counsel.name}</h3>
    <p className="counsel-practice">{counsel.practiceArea}</p>
    <Link className="text-link" href={`/consultation?service=${encodeURIComponent(counsel.practiceArea)}`}>Request consultation <ArrowUpRight size={14} /></Link>
    {officePhone && <a className="counsel-phone" href={`tel:${officePhone.replace(/[^\d+]/g, "")}`}><Phone size={13} />Main office: {officePhone}</a>}
  </article>)}</div>;
}
