"use client";

import { useMemo, useState } from "react";
import { Bot, MessageCircle, Send, X } from "lucide-react";
import type { Profile, Service, SiteSettings } from "@/lib/types";

type Message = { from: "assistant" | "visitor"; text: string };

export function FloatingHelp({ profile, settings, services }: { profile: Profile; settings: SiteSettings; services: Service[] }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ from: "assistant", text: "Hello. I can help you find information about consultations, services, and getting in touch." }]);
  const serviceNames = useMemo(() => services.map((service) => service.title), [services]);

  function reply(value: string) {
    const query = value.toLowerCase();
    let answer = "For guidance about a particular matter, please arrange a consultation. I can share general website information, but I cannot provide legal advice.";
    if (query.includes("book") || query.includes("consult")) answer = "Use the Book consultation page to send your name, contact details, preferred time, and a short case summary. You do not need an account.";
    else if (query.includes("service") || query.includes("case") || query.includes("category")) answer = `Services currently listed include ${serviceNames.slice(0, 6).join(", ")}${serviceNames.length > 6 ? ", and more" : ""}. Choose the closest category in the booking form; you can explain further in your message.`;
    else if (query.includes("office") || query.includes("where") || query.includes("address") || query.includes("map")) answer = `The office is in ${[settings.address, settings.city].filter(Boolean).join(", ") || "Lahore, near the High Court"}. ${settings.map_url ? "See the Contact page for the map and directions." : "The exact address and map location will be added when confirmed."}`;
    else if (query.includes("contact") || query.includes("email") || query.includes("phone")) answer = `You can email ${settings.email || profile.email}, or send a message through the Contact page.${settings.phone || profile.phone ? ` Phone: ${settings.phone || profile.phone}.` : " A phone number has not been added yet."}`;
    else if (query.includes("upload") || query.includes("document") || query.includes("file")) answer = "You may attach one PDF, JPG, PNG, DOC, or DOCX file to a consultation request. Files are restricted to 8 MB and are handled as private documents.";
    else if (query.includes("hello") || query.includes("hi")) answer = "Hello. What would you like to know about the services or booking a consultation?";
    setMessages((items) => [...items, { from: "visitor", text: value }, { from: "assistant", text: answer }]);
    setInput("");
  }

  return <div className="help-widget">
    {open && <section className="help-panel" aria-label="Website help assistant">
      <div className="help-heading"><span className="help-avatar"><Bot size={18} /></span><div><strong>Website assistant</strong><small>General information</small></div><button className="icon-button" onClick={() => setOpen(false)} aria-label="Close help assistant"><X size={18} /></button></div>
      <div className="help-messages" aria-live="polite">{messages.map((message, index) => <p className={`chat-bubble ${message.from}`} key={`${index}-${message.text}`}>{message.text}</p>)}</div>
      <p className="help-disclaimer">Information provided through this assistant is for general informational purposes and does not constitute legal advice.</p>
      <form className="help-compose" onSubmit={(event) => { event.preventDefault(); if (input.trim()) reply(input.trim()); }}><label className="sr-only" htmlFor="help-query">Ask a question</label><input id="help-query" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask a question…" maxLength={300} /><button aria-label="Send question"><Send size={17} /></button></form>
    </section>}
    <button className="help-launcher" aria-expanded={open} onClick={() => setOpen(!open)}><MessageCircle size={19} /> <span>{open ? "Close" : "How can we help?"}</span></button>
  </div>;
}
