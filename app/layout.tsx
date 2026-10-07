import type { Metadata } from "next";
import { FloatingHelp } from "@/components/floating-help";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { getPublicSettings, getServices } from "@/lib/data";
import { counselTeam, firm } from "@/lib/firm";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: `${firm.websiteName} | SKB Legal Practice, Lahore`, template: `%s | ${firm.websiteName}` },
  description: firm.description,
  openGraph: { type: "website", locale: "en_PK", siteName: firm.websiteName, title: `${firm.websiteName} | SKB`, description: firm.description, images: [{ url: firm.teamImage, width: 1024, height: 765, alt: "The SKB counsel team at The Law Consulate" }] },
  robots: { index: true, follow: true },
  icons: { icon: firm.logoUrl, apple: firm.logoUrl }
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [settings, services] = await Promise.all([getPublicSettings(), getServices()]);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LegalService",
    name: firm.websiteName,
    alternateName: firm.firmName,
    description: firm.description,
    image: firm.teamImage,
    url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    ...(settings.email ? { email: settings.email } : {}),
    areaServed: { "@type": "Country", name: "Pakistan" },
    address: { "@type": "PostalAddress", addressLocality: settings.city || "Lahore", addressCountry: "PK" },
    knowsAbout: services.map((service) => service.title),
    employee: counselTeam.map((counsel) => ({ "@type": "Person", name: counsel.name, jobTitle: counsel.designation, knowsAbout: counsel.practiceArea })),
    ...(settings.phone ? { telephone: settings.phone } : {})
  };
  return <html lang="en"><body>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <SiteHeader logoUrl={settings.logo_url || firm.logoUrl} />
    <main id="main-content">{children}</main>
    <SiteFooter settings={settings} />
    <WhatsAppButton settings={settings} />
    <FloatingHelp settings={settings} services={services} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
  </body></html>;
}
