export type Profile = {
  id?: string;
  full_name: string;
  professional_title: string;
  experience_years: number;
  bar_council: string;
  biography: string;
  profile_image: string | null;
  email: string;
  phone: string;
  whatsapp: string;
};

export type Service = {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  full_description: string;
  image_url: string | null;
  featured: boolean;
  published: boolean;
  display_order: number;
  seo_title: string | null;
  seo_description: string | null;
};

export type SiteSettings = {
  id?: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  office_timings: string;
  map_url: string;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
  social_links: Record<string, string>;
  footer_text: string;
};

export type Consultation = {
  id: string;
  booking_reference: string;
  full_name: string;
  phone: string;
  email: string;
  case_category: string;
  preferred_date: string;
  preferred_time: string;
  message: string;
  preferred_contact_method: string;
  status: "Pending" | "Confirmed" | "Completed" | "Cancelled";
  admin_whatsapp_status?: "pending" | "sent" | "failed" | "not_configured";
  client_whatsapp_status?: "pending" | "sent" | "failed" | "not_configured" | "not_requested";
  internal_notes: string;
  created_at: string;
  consultation_documents?: { id: string; file_name: string; file_size: number; file_type: string }[];
};

export type ContactMessage = {
  id: string;
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  read_status: boolean;
  created_at: string;
};
