import type { Metadata } from "next";
import { FloatingHelp } from "@/components/floating-help";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { getProfile, getServices, getSettings } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Raja Mudassir Advocate | Advocate High Court, Lahore", template: "%s | Raja Mudassir Advocate" },
  description: "Legal representation and consultation in Lahore and across Pakistan. Contact Raja Mudassir Advocate to discuss your matter.",
  openGraph: { type: "website", locale: "en_PK", siteName: "Raja Mudassir Advocate", title: "Raja Mudassir Advocate | Advocate High Court", description: "Legal representation and consultation in Lahore and across Pakistan." },
  robots: { index: true, follow: true }
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [profile, settings, services] = await Promise.all([getProfile(), getSettings(), getServices()]);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LegalService",
    name: profile.full_name,
    description: "Legal representation and consultation in Lahore and across Pakistan.",
    url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    email: settings.email || profile.email,
    areaServed: { "@type": "Country", name: "Pakistan" },
    address: { "@type": "PostalAddress", addressLocality: settings.city || "Lahore", addressCountry: "PK" },
    knowsAbout: services.map((service) => service.title),
    ...(settings.phone || profile.phone ? { telephone: settings.phone || profile.phone } : {})
  };
  return <html lang="en"><body>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <SiteHeader profile={profile} logoUrl={settings.logo_url} />
    <main id="main-content">{children}</main>
    <SiteFooter profile={profile} settings={settings} />
    <WhatsAppButton settings={settings} />
    <FloatingHelp profile={profile} settings={settings} services={services} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
  </body></html>;
}
