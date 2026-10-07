"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowUpRight, Menu, Scale, X } from "lucide-react";
import { firm } from "@/lib/firm";

const links = [
  ["Home", "/"], ["About", "/about"], ["Services", "/services"], ["Contact", "/contact"]
];

export function SiteHeader({ logoUrl = firm.logoUrl }: { logoUrl?: string | null }) {
  const [open, setOpen] = useState(false);
  return <header className="site-header">
    <div className="header-inner wrap">
      <Link className="brand" href="/" onClick={() => setOpen(false)} aria-label={`${firm.websiteName} home`}>
        {logoUrl ? <Image className="brand-logo" src={logoUrl} alt="" width={42} height={42} unoptimized /> : <span className="brand-mark"><Scale size={22} strokeWidth={1.5} /></span>}
        <span><strong>{firm.websiteName}</strong><small>{firm.tagline}</small></span>
      </Link>
      <button className="mobile-toggle" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
      <nav className={`main-nav ${open ? "is-open" : ""}`} aria-label="Main navigation">
        {links.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>)}
        <Link className="nav-cta" href="/consultation" onClick={() => setOpen(false)}>Book consultation <ArrowUpRight size={16} /></Link>
      </nav>
    </div>
  </header>;
}
