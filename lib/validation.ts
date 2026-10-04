import { z } from "zod";

const publicImageUrl = z.string().trim().url().max(2048).refine((value) => /^https?:\/\//i.test(value), "Use an http or https image URL.");

export const consultationSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(32),
  email: z.string().trim().email().max(254),
  case_category: z.string().trim().min(2).max(120),
  preferred_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  preferred_time: z.enum(["Morning (9 am–12 pm)", "Afternoon (12 pm–4 pm)", "Evening (4 pm–7 pm)", "Flexible"]),
  message: z.string().trim().max(3000).optional().default(""),
  preferred_contact_method: z.enum(["Phone", "WhatsApp", "Email"]).default("Phone")
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(32),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().min(2).max(160),
  message: z.string().trim().min(5).max(3000)
});

export const serviceSchema = z.object({
  title: z.string().trim().min(2).max(120),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(140),
  short_description: z.string().trim().min(2).max(280),
  full_description: z.string().trim().min(2).max(10000),
  image_url: publicImageUrl.nullable().optional(),
  featured: z.boolean().default(false),
  published: z.boolean().default(false),
  display_order: z.number().int().min(0).max(10000).default(0),
  seo_title: z.string().trim().max(160).nullable().optional(),
  seo_description: z.string().trim().max(320).nullable().optional()
});
