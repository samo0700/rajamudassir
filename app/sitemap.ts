import type { MetadataRoute } from "next";
import { getServices } from "@/lib/data";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const fixed = ["", "/about", "/services", "/consultation", "/contact"].map((path) => ({ url: `${base}${path}`, lastModified: new Date() }));
  const services = await getServices();
  return [...fixed, ...services.map((service) => ({ url: `${base}/services/${service.slug}`, lastModified: new Date() }))];
}
