"use client";

import { useMemo, useState } from "react";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import type { Service, SiteSettings } from "@/lib/types";
import { firm } from "@/lib/firm";

type Message = { from: "assistant" | "visitor"; text: string };

export function FloatingHelp({ settings, services }: { settings: SiteSettings; services: Service[] }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ from: "assistant", text: `Welcome to ${firm.websiteName}, the website of ${firm.firmName}. We can help you find information about our services, consultation requests, and office.` }]);
  const serviceNames = useMemo(() => services.map((service) => service.title), [services]);

  function reply(value: string) {
    const query = value.toLowerCase();
    let answer = "For guidance about your matter, please request a consultation with our office. This assistant shares general website information and cannot provide legal advice.";
    if (query.includes("book") || query.includes("consult")) answer = "Use the Book consultation page to share your name, contact details, preferred time, and a short case summary. Our office will review the request and confirm availability with the relevant counsel. You do not need an account.";
    else if (query.includes("service") || query.includes("case") || query.includes("category")) answer = `Our listed services include ${serviceNames.slice(0, 6).join(", ")}${serviceNames.length > 6 ? ", and more" : ""}. Choose the closest category in the consultation form; our office can help direct your request to the relevant counsel.`;
    else if (query.includes("office") || query.includes("where") || query.includes("address") || query.includes("map")) answer = `Our office is at ${[settings.address || firm.address, settings.city || firm.city].filter(Boolean).join(", ")}. ${settings.map_url ? "See the Contact page for the map and directions." : "Please contact our office to confirm directions before visiting."}`;
    else if (query.includes("contact") || query.includes("email") || query.includes("phone")) answer = `${settings.email ? `You can email our office at ${settings.email}, or ` : "You can "}send us a message through the Contact page.${settings.phone ? ` Office phone: ${settings.phone}.` : ""}`;
    else if (query.includes("upload") || query.includes("document") || query.includes("file")) answer = "You may attach one PDF, JPG, PNG, DOC, or DOCX file to a consultation request. Files are restricted to 4 MB and are handled as private documents.";
    else if (query.includes("hello") || query.includes("hi")) answer = `Welcome to ${firm.websiteName}. How can we help you find a service or request a consultation?`;
    setMessages((items) => [...items, { from: "visitor", text: value }, { from: "assistant", text: answer }]);
    setInput("");
  }

  return <div className="help-widget">
    {open && <section className="help-panel" aria-label="Website help assistant">
      <div className="help-heading"><span className="help-avatar"><Bot size={18} /></span><div><strong>{firm.websiteName}</strong><small>Website assistant · {firm.firmName}</small></div><button className="icon-button" onClick={() => setOpen(false)} aria-label="Close help assistant"><X size={18} /></button></div>
      <div className="help-messages" aria-live="polite">{messages.map((message, index) => <p className={`chat-bubble ${message.from}`} key={`${index}-${message.text}`}>{message.text}</p>)}</div>
      <p className="help-disclaimer">Information provided through this assistant is for general informational purposes and does not constitute legal advice.</p>
      <form className="help-compose" onSubmit={(event) => { event.preventDefault(); if (input.trim()) reply(input.trim()); }}><label className="sr-only" htmlFor="help-query">Ask a question</label><input id="help-query" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask a question…" maxLength={300} /><button aria-label="Send question"><Send size={17} /></button></form>
    </section>}
    <button className="help-launcher" aria-expanded={open} onClick={() => setOpen(!open)}><MessageCircle size={19} /> <span>{open ? "Close" : "How can we help?"}</span></button>
  </div>;
}
