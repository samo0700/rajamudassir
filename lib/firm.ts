export const firm = {
  websiteName: "The Law Consulate",
  firmName: "SKB",
  tagline: "Legal counsel by SKB",
  monogram: "TLC",
  logoUrl: "/skb-logo.png",
  officeContactsConfirmed: false,
  address: "Adjacent to Lahore High Court",
  city: "Lahore",
  teamImage: "/team-skb.jpg",
  description: "The Law Consulate represents SKB, a legal practice in Lahore offering counsel in civil, criminal, family, corporate, and tax / FBR matters.",
  introduction: "The Law Consulate brings together the counsel of SKB. Our team handles civil, criminal, family, corporate, and tax / FBR matters from an office adjacent to Lahore High Court. Contact our office to discuss your circumstances and arrange a consultation with the relevant counsel."
} as const;

export type Counsel = {
  id: string;
  name: string;
  designation: string;
  practiceArea: string;
  photoPosition: string;
  serviceSlugs: readonly string[];
  serviceTitles: readonly string[];
};

export const counselTeam: readonly Counsel[] = [
  { id: "athar-touqeer", name: "Athar Touqeer", designation: "Counsel", practiceArea: "Civil Law", photoPosition: "Far left", serviceSlugs: ["civil-law"], serviceTitles: ["Civil Law"] },
  { id: "noman-attique-gujjar", name: "Noman Attique Gujjar", designation: "Counsel", practiceArea: "Criminal Law", photoPosition: "Second from left", serviceSlugs: ["criminal-law"], serviceTitles: ["Criminal Law"] },
  { id: "raja-mahmood-subhani", name: "Raja Mahmood Subhani", designation: "Senior Counsel", practiceArea: "Corporate Law", photoPosition: "Seated, centre", serviceSlugs: ["corporate-law"], serviceTitles: ["Corporate Law"] },
  { id: "usman-touqeer", name: "Usman Touqeer", designation: "Counsel", practiceArea: "Family Law", photoPosition: "Second from right", serviceSlugs: ["family-law"], serviceTitles: ["Family Law"] },
  { id: "raja-mudassir", name: "Raja Mudassir", designation: "Counsel", practiceArea: "Tax / FBR Matters", photoPosition: "Far right", serviceSlugs: ["tax-fbr-matters"], serviceTitles: ["Tax / FBR Matters", "Tax / FBR", "Tax Law", "FBR Matters"] }
];

export function getCounselForService(service: { slug: string; title: string }): Counsel | undefined {
  const title = service.title.trim().toLowerCase();
  return counselTeam.find((counsel) => counsel.serviceSlugs.includes(service.slug) || counsel.serviceTitles.some((item) => item.toLowerCase() === title));
}

export function firmCopy(value: string): string {
  return value.replace(/Raja Mudassir Advocate/gi, firm.websiteName);
}
