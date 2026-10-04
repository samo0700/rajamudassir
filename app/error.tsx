"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return <div className="wrap not-found"><span className="eyebrow">Something went wrong</span><h1>The page could not be loaded.</h1><p>Please try again. If the issue continues, contact the office directly.</p><button className="button button-dark" onClick={() => reset()}><RefreshCw size={16} /> Try again</button></div>;
}
