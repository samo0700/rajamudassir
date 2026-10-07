import type { Profile, Service, SiteSettings } from "@/lib/types";
import { firm } from "@/lib/firm";

export const defaultProfile: Profile = {
  full_name: "Raja Mudassir Advocate",
  professional_title: "Advocate High Court",
  experience_years: 2,
  bar_council: "",
  biography: "Profile details are being updated. Please contact the office to confirm further information.",
  profile_image: null,
  email: "mailme.rajamudassir07@gmail.com",
  phone: "",
  whatsapp: ""
};

export const defaultSettings: SiteSettings = {
  phone: "",
  whatsapp: "",
  email: "mailme.rajamudassir07@gmail.com",
  address: firm.address,
  city: "Lahore",
  office_timings: "Please contact the office to confirm availability.",
  map_url: "",
  latitude: null,
  longitude: null,
  logo_url: null,
  social_links: {},
  footer_text: "The counsel of SKB, supporting individuals, families, and businesses from our office adjacent to Lahore High Court."
};

const starterServices: Array<[string, string]> = [
  ["Criminal Law", "Representation and guidance for criminal matters, from initial inquiries through court proceedings."],
  ["Civil Law", "Assistance with civil disputes, claims, notices, and proceedings before the relevant courts."],
  ["Family Law", "Guidance on family matters, including proceedings that affect the rights and interests of families."],
  ["Property Disputes", "Support with property-related disagreements, documentation, and dispute resolution."],
  ["Bail Matters", "Assistance with bail applications and related court proceedings."],
  ["FIR Matters", "Guidance on matters concerning registration, investigation, and proceedings relating to an FIR."],
  ["Divorce / Khula", "Guidance on divorce and khula proceedings, subject to the facts and applicable law."],
  ["Corporate Law", "Legal support for business documentation, commercial arrangements, and corporate disputes."],
  ["Banking Law", "Assistance with banking disputes, recovery matters, and related legal proceedings."],
  ["Tax / FBR Matters", "Guidance on tax notices, FBR matters, and associated representation."],
  ["Cybercrime", "Assistance with legal questions and proceedings concerning cybercrime matters."],
  ["Immigration", "General legal assistance for immigration-related matters and documentation."],
  ["Other Legal Services", "Contact the office to discuss a matter not listed here and confirm whether assistance is available."]
];

export const defaultServices: Service[] = starterServices.map(([title, short_description], index) => ({
  id: `local-${index}`,
  title,
  slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
  short_description,
  full_description: `${short_description}\n\nThe appropriate legal process depends on the facts and documents of each matter. A consultation can help identify the relevant next steps. This information is general and is not legal advice.`,
  image_url: null,
  featured: index < 4,
  published: true,
  display_order: index + 1,
  seo_title: null,
  seo_description: null
}));
