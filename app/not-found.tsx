import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return <div className="wrap not-found"><span className="eyebrow">Page not found</span><h1>This page isn’t available.</h1><p>The address may have changed, or the page may no longer be published.</p><Link href="/" className="button button-dark"><ArrowLeft size={16} /> Return home</Link></div>;
}
