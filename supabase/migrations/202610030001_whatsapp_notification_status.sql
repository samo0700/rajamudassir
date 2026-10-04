alter table public.consultations
  add column if not exists admin_whatsapp_status text not null default 'not_configured'
    check (admin_whatsapp_status in ('pending', 'sent', 'failed', 'not_configured')),
  add column if not exists client_whatsapp_status text not null default 'not_requested'
    check (client_whatsapp_status in ('pending', 'sent', 'failed', 'not_configured', 'not_requested'));
