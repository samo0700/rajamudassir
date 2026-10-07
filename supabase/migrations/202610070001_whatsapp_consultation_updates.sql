begin;

do $migration$
declare
  consent_column_existed boolean;
begin
  lock table public.consultations in access exclusive mode;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'consultations'
      and column_name = 'whatsapp_opt_in'
  ) into consent_column_existed;

  alter table public.consultations
    add column if not exists whatsapp_opt_in boolean not null default false,
    add column if not exists whatsapp_opt_in_at timestamptz,
    add column if not exists appointment_date date,
    add column if not exists appointment_time time without time zone,
    add column if not exists appointment_location text;

  -- Preserve older WhatsApp choices once; reruns must respect later opt-outs.
  if not consent_column_existed then
    update public.consultations
    set whatsapp_opt_in = true,
        whatsapp_opt_in_at = coalesce(whatsapp_opt_in_at, created_at)
    where preferred_contact_method = 'WhatsApp';
  end if;
end;
$migration$;

-- Authenticated lawyers can create bookings; public inserts remain server-only.
grant insert on public.consultations to authenticated;
drop policy if exists "Admins insert consultations" on public.consultations;
create policy "Admins insert consultations" on public.consultations
  for insert to authenticated with check ((select public.is_admin()));

notify pgrst, 'reload schema';
commit;
