-- Initial schema for Raja Mudassir Advocate.
-- Run in the Supabase SQL Editor or with `supabase db push`.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create table if not exists public.profiles (
  id text primary key default 'main' check (id = 'main'),
  full_name text not null default 'Raja Mudassir Advocate',
  professional_title text not null default 'Advocate High Court',
  experience_years integer not null default 2 check (experience_years between 0 and 100),
  bar_council text not null default 'SKB',
  biography text not null default 'Profile details are being updated. Please contact the office to confirm further information.',
  profile_image text,
  email text not null default 'mailme.rajamudassir07@gmail.com',
  phone text not null default '',
  whatsapp text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  short_description text not null,
  full_description text not null,
  image_url text,
  featured boolean not null default false,
  published boolean not null default false,
  display_order integer not null default 0,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.consultations (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null unique,
  full_name text not null,
  phone text not null,
  email text not null,
  case_category text not null,
  preferred_date date not null,
  preferred_time text not null,
  message text not null default '',
  preferred_contact_method text not null default 'Phone' check (preferred_contact_method in ('Phone', 'WhatsApp', 'Email')),
  status text not null default 'Pending' check (status in ('Pending', 'Confirmed', 'Completed', 'Cancelled')),
  internal_notes text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.consultation_documents (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  file_type text not null,
  file_size bigint not null check (file_size > 0 and file_size <= 8388608),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text not null,
  subject text not null,
  message text not null,
  read_status boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.site_settings (
  id text primary key default 'main' check (id = 'main'),
  phone text not null default '',
  whatsapp text not null default '',
  email text not null default 'mailme.rajamudassir07@gmail.com',
  address text not null default 'Near High Court',
  city text not null default 'Lahore',
  office_timings text not null default 'Please contact the office to confirm availability.',
  map_url text not null default '',
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  logo_url text,
  social_links jsonb not null default '{}'::jsonb,
  footer_text text not null default 'Legal representation and consultation in Lahore and across Pakistan.',
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at before update on public.services for each row execute function public.set_updated_at();
drop trigger if exists consultations_set_updated_at on public.consultations;
create trigger consultations_set_updated_at before update on public.consultations for each row execute function public.set_updated_at();
drop trigger if exists settings_set_updated_at on public.site_settings;
create trigger settings_set_updated_at before update on public.site_settings for each row execute function public.set_updated_at();

alter table public.admin_users enable row level security;
alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.consultations enable row level security;
alter table public.consultation_documents enable row level security;
alter table public.contact_messages enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "Admin can read own admin membership" on public.admin_users;
create policy "Admin can read own admin membership" on public.admin_users for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Public can read professional profile" on public.profiles;
create policy "Public can read professional profile" on public.profiles for select to anon, authenticated using (true);
drop policy if exists "Admins manage professional profile" on public.profiles;
create policy "Admins manage professional profile" on public.profiles for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Public can read published services" on public.services;
create policy "Public can read published services" on public.services for select to anon, authenticated using (published = true);
drop policy if exists "Admins manage services" on public.services;
create policy "Admins manage services" on public.services for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Admins read consultations" on public.consultations;
create policy "Admins read consultations" on public.consultations for select to authenticated using ((select public.is_admin()));
drop policy if exists "Admins update consultations" on public.consultations;
create policy "Admins update consultations" on public.consultations for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Admins read consultation documents" on public.consultation_documents;
create policy "Admins read consultation documents" on public.consultation_documents for select to authenticated using ((select public.is_admin()));

drop policy if exists "Admins read contact messages" on public.contact_messages;
create policy "Admins read contact messages" on public.contact_messages for select to authenticated using ((select public.is_admin()));
drop policy if exists "Admins update contact messages" on public.contact_messages;
create policy "Admins update contact messages" on public.contact_messages for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Public can read office settings" on public.site_settings;
create policy "Public can read office settings" on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "Admins manage office settings" on public.site_settings;
create policy "Admins manage office settings" on public.site_settings for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

grant select on public.profiles, public.services, public.site_settings to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.services, public.site_settings to authenticated;
grant select, update on public.consultations, public.contact_messages to authenticated;
grant select on public.consultation_documents to authenticated;
grant select on public.admin_users to authenticated;

-- Public site images. Consultation documents live in a separate private bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('public-assets', 'public-assets', true, 6291456, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('consultation-documents', 'consultation-documents', false, 8388608, array['application/pdf','image/jpeg','image/png','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view site images" on storage.objects;
create policy "Public can view site images" on storage.objects for select to anon, authenticated using (bucket_id = 'public-assets');
drop policy if exists "Admins manage site images" on storage.objects;
create policy "Admins manage site images" on storage.objects for all to authenticated using (bucket_id = 'public-assets' and (select public.is_admin())) with check (bucket_id = 'public-assets' and (select public.is_admin()));
drop policy if exists "Admins manage private consultation files" on storage.objects;
create policy "Admins manage private consultation files" on storage.objects for all to authenticated using (bucket_id = 'consultation-documents' and (select public.is_admin())) with check (bucket_id = 'consultation-documents' and (select public.is_admin()));

insert into public.profiles (id) values ('main') on conflict (id) do nothing;
insert into public.site_settings (id) values ('main') on conflict (id) do nothing;

insert into public.services (title, slug, short_description, full_description, featured, published, display_order)
values
('Criminal Law', 'criminal-law', 'Representation and guidance for criminal matters, from initial inquiries through court proceedings.', 'Representation and guidance for criminal matters, from initial inquiries through court proceedings.\n\nThe appropriate process depends on the facts and documents of each matter. A consultation can help identify relevant next steps. This information is general and is not legal advice.', true, true, 1),
('Civil Law', 'civil-law', 'Assistance with civil disputes, claims, notices, and proceedings before the relevant courts.', 'Assistance with civil disputes, claims, notices, and proceedings before the relevant courts.\n\nThe appropriate process depends on the facts and documents of each matter. A consultation can help identify relevant next steps. This information is general and is not legal advice.', true, true, 2),
('Family Law', 'family-law', 'Guidance on family matters, including proceedings that affect the rights and interests of families.', 'Guidance on family matters, including proceedings that affect the rights and interests of families.\n\nThe appropriate process depends on the facts and documents of each matter. A consultation can help identify relevant next steps. This information is general and is not legal advice.', true, true, 3),
('Property Disputes', 'property-disputes', 'Support with property-related disagreements, documentation, and dispute resolution.', 'Support with property-related disagreements, documentation, and dispute resolution.\n\nThe appropriate process depends on the facts and documents of each matter. A consultation can help identify relevant next steps. This information is general and is not legal advice.', true, true, 4),
('Bail Matters', 'bail-matters', 'Assistance with bail applications and related court proceedings.', 'Assistance with bail applications and related court proceedings.\n\nThe appropriate process depends on the facts and documents of each matter. A consultation can help identify relevant next steps. This information is general and is not legal advice.', false, true, 5),
('FIR Matters', 'fir-matters', 'Guidance on matters concerning registration, investigation, and proceedings relating to an FIR.', 'Guidance on matters concerning registration, investigation, and proceedings relating to an FIR.\n\nThe appropriate process depends on the facts and documents of each matter. A consultation can help identify relevant next steps. This information is general and is not legal advice.', false, true, 6),
('Divorce / Khula', 'divorce-khula', 'Guidance on divorce and khula proceedings, subject to the facts and applicable law.', 'Guidance on divorce and khula proceedings, subject to the facts and applicable law.\n\nThe appropriate process depends on the facts and documents of each matter. A consultation can help identify relevant next steps. This information is general and is not legal advice.', false, true, 7),
('Corporate Law', 'corporate-law', 'Legal support for business documentation, commercial arrangements, and corporate disputes.', 'Legal support for business documentation, commercial arrangements, and corporate disputes.\n\nThe appropriate process depends on the facts and documents of each matter. A consultation can help identify relevant next steps. This information is general and is not legal advice.', false, true, 8),
('Banking Law', 'banking-law', 'Assistance with banking disputes, recovery matters, and related legal proceedings.', 'Assistance with banking disputes, recovery matters, and related legal proceedings.\n\nThe appropriate process depends on the facts and documents of each matter. A consultation can help identify relevant next steps. This information is general and is not legal advice.', false, true, 9),
('Tax / FBR Matters', 'tax-fbr-matters', 'Guidance on tax notices, FBR matters, and associated representation.', 'Guidance on tax notices, FBR matters, and associated representation.\n\nThe appropriate process depends on the facts and documents of each matter. A consultation can help identify relevant next steps. This information is general and is not legal advice.', false, true, 10),
('Cybercrime', 'cybercrime', 'Assistance with legal questions and proceedings concerning cybercrime matters.', 'Assistance with legal questions and proceedings concerning cybercrime matters.\n\nThe appropriate process depends on the facts and documents of each matter. A consultation can help identify relevant next steps. This information is general and is not legal advice.', false, true, 11),
('Immigration', 'immigration', 'General legal assistance for immigration-related matters and documentation.', 'General legal assistance for immigration-related matters and documentation.\n\nThe appropriate process depends on the facts and documents of each matter. A consultation can help identify relevant next steps. This information is general and is not legal advice.', false, true, 12),
('Other Legal Services', 'other-legal-services', 'Contact the office to discuss a matter not listed here and confirm whether assistance is available.', 'Contact the office to discuss a matter not listed here and confirm whether assistance is available.\n\nThe appropriate process depends on the facts and documents of each matter. A consultation can help identify relevant next steps. This information is general and is not legal advice.', false, true, 13)
on conflict (slug) do nothing;
