import { MessageCircle } from "lucide-react";
import type { SiteSettings } from "@/lib/types";
import { firm } from "@/lib/firm";

export function WhatsAppButton({ settings }: { settings: SiteSettings }) {
  const phone = settings.whatsapp.replace(/\D/g, "");
  if (!phone) return null;
  const message = encodeURIComponent(`Hello ${firm.websiteName}, I would like to inquire about a consultation with SKB.`);
  return <a className="whatsapp-float" href={`https://wa.me/${phone}?text=${message}`} target="_blank" rel="noopener noreferrer" aria-label="Start a WhatsApp conversation"><MessageCircle size={21} /><span>WhatsApp</span></a>;
}
