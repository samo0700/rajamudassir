# The Law Consulate | SKB

A responsive firm website for The Law Consulate, representing SKB in Lahore. The supplied five-member team photograph appears in the homepage hero, with counsel profiles and confirmed practice-area assignments. The public site includes editable practice information, dynamic legal services, consultation requests, contact inquiries, a general information assistant, and an optional WhatsApp contact shortcut. The private admin area manages profile details, services, consultations, office information, and inquiries.

The project is built with Next.js 16, React, TypeScript, Tailwind CSS, and Supabase. There is no client account or registration area.

## Local setup

Requirements: Node.js 20.9 or newer and npm.

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Public pages can render using careful placeholders before Supabase is configured. Form submissions and admin features require a configured Supabase project.

## Supabase configuration

1. Create a Supabase project.
2. Copy the project URL and publishable key into `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.
3. Copy the service role key into `SUPABASE_SERVICE_ROLE_KEY`. This is a server-only secret and must never use a `NEXT_PUBLIC_` prefix.
4. Apply all SQL files in `supabase/migrations/` in timestamp order in the Supabase SQL Editor or with the Supabase CLI. The initial migration creates the tables, policies, starter services, and storage buckets; the WhatsApp migration adds notification status fields, and the consultation-method migration enables the three current booking options. Apply the consultation-method migration before serving the updated form.
5. In Supabase Authentication settings, disable public sign-ups. Create the administrator account from the Supabase Dashboard (Authentication → Users → Add user), with a secure password.
6. Copy that user's UUID and add it to `public.admin_users` in the SQL Editor:

   ```sql
   insert into public.admin_users (user_id)
   values ('PASTE-THE-AUTH-USER-UUID-HERE');
   ```

7. Visit `/admin/login` and sign in. Admin authorization is checked against `public.admin_users`; knowing an account password alone does not grant dashboard access.

The migration creates two buckets:

- `public-assets`: public read access for published site imagery; only admins can upload or change files.
- `consultation-documents`: private storage. The public website uploads through a validated server route. Admins receive a 60-second signed link after the request is authorized.

The service role key bypasses Supabase RLS by design. It is used only in server route handlers after validation, or after an authenticated admin check. Browser code uses only the public key. Public clients cannot select consultations, inquiries, or private document records.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | For live data | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | For live data | Browser-safe Supabase publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | For forms and secure uploads | Server-only database/storage access |
| `NEXT_PUBLIC_SITE_URL` | For deployment | Canonical site URL used by sitemap and metadata |
| `RESEND_API_KEY` | Optional | Resend API key for new-request email notifications |
| `ADMIN_NOTIFICATION_EMAIL` | Optional | Destination for admin email alerts |
| `NOTIFICATION_FROM_EMAIL` | Optional | Verified sender address used by Resend |
| `WHATSAPP_ACCESS_TOKEN` | Optional | WhatsApp Business Cloud API access token |
| `WHATSAPP_PHONE_NUMBER_ID` | Optional | WhatsApp Business sender phone number ID |
| `WHATSAPP_GRAPH_API_VERSION` | Required for WhatsApp | Version string from Meta's Graph API, such as `v26.0` |
| `ADMIN_WHATSAPP` | Required for admin WhatsApp alerts | Admin's WhatsApp number; Pakistani local and `+92` formats are normalized |
| `WHATSAPP_TEMPLATE_LANGUAGE` | Optional | Approved template language code (defaults to `en_US`) |
| `WHATSAPP_TEMPLATE_ADMIN_BOOKING` | Required for booking WhatsApp alerts | Approved template name for new-booking alerts |
| `WHATSAPP_TEMPLATE_CLIENT_CONFIRMATION` | Required for client confirmations | Approved template name for client confirmations |
| `WHATSAPP_TEMPLATE_CLIENT_CANCELLATION` | Required for client cancellations | Approved template name for client cancellations |
| `WHATSAPP_TEMPLATE_CONTACT_NOTIFICATION` | Optional | Approved template name for contact form alerts |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Optional | Reserved for future Cloudflare Turnstile verification |
| `TURNSTILE_SECRET_KEY` | Optional | Reserved for future Cloudflare Turnstile verification |

WhatsApp credentials and template names are server-only. New consultation requests offer Office Visit (default), Phone Consultation, and Meeting at Another Location. The office confirms any proposed external venue. These choices do not opt the client in to WhatsApp updates. Existing requests that explicitly selected WhatsApp retain their original consent; only those requests are eligible for automated client WhatsApp updates. Legacy Phone, WhatsApp, and Email values remain accepted for older requests and cached forms. Consultation booking and client status notifications use approved templates; if a required template or Meta credential is missing, the notification is marked not configured while the booking/status update remains saved. Contact alerts also use a template when configured. The admin dashboard records whether each notification was accepted, failed, not configured, or not requested. “Sent” means Meta accepted the API request; delivery/read receipts require a configured webhook.

Create and approve templates in WhatsApp Manager before enabling automated notifications. Suggested body text and variables:

- Admin booking: `New consultation booking. Reference: {{1}}. Client: {{2}}. Phone: {{3}}. Email: {{4}}. Case category: {{5}}. Preferred date: {{6}}. Preferred time: {{7}}. Preferred contact: {{8}}. Summary: {{9}}.` Variables: reference, client name, client phone, email, case category, date, time, preferred contact method, case summary.
- Client confirmation: `Your consultation is confirmed. Reference: {{1}}. Status: {{2}}. Date: {{3}}. Time: {{4}}. {{5}}.` Variables: reference, status, date, time, firm name.
- Client cancellation: `We’re sorry, but your consultation request has been cancelled. Reference: {{1}}. Status: {{2}}. Requested date: {{3}}. Requested time: {{4}}. {{5}}.` Variables: reference, status, date, time, firm name.
- Contact alert (optional): `New website inquiry: {{1}}.` Variable: the inquiry details text.

Match template names, language code, and placeholder count exactly to the approved templates in Meta WhatsApp Manager.

## Running and deployment

```bash
npm run dev
npm run build
npm run start
```

For Vercel, import the repository, set the environment variables in Project Settings, deploy, and add the production URL as `NEXT_PUBLIC_SITE_URL`. Apply the Supabase migration before enabling public forms. Check `/admin/login`, public forms, image uploads, and signed document access after the production environment is configured.

## Admin tasks

- **Counsel profile**: edit the legacy individual counsel's name, title, experience, biography, association, photo, email, and phone.
- **Services**: create, edit, publish, feature, order, and remove dynamic service pages. Service images accept JPG, PNG, and WebP up to 4 MB.
- **Consultations**: view the selected consultation method, booking details and uploaded documents, edit internal notes, and change Pending, Confirmed, Completed, or Cancelled status. Confirmation and cancellation trigger WhatsApp notifications when configured.
- **Office & settings**: update the phone, WhatsApp, exact address, office hours, Google Maps URL/coordinates, social links, and footer text.
- **Messages**: view contact form submissions and mark them read or unread.

Firm identity, the five counsel records, and confirmed category assignments are centralized in lib/firm.ts. The SKB logo and supplied team photo are bundled in public/. Only the main office contact is used publicly; add its phone and WhatsApp separately in Office & settings when supplied. Phone links remain hidden while the office number is blank. Exact chamber address, map coordinates, office hours, and social accounts remain subject to office confirmation. Domain, hosting, and professional email purchasing are outside this update.

## Security and operations

- Admin APIs verify the Supabase user session and `is_admin()` membership on every request.
- Public forms use server-side Zod validation, file type/size checks, a honeypot, and a basic per-process IP rate limit. For deployments with multiple server instances, add a shared rate-limit store and enable a managed challenge such as Cloudflare Turnstile.
- Consultation uploads are limited to PDF, JPEG, PNG, DOC, and DOCX, up to 4 MB. They are stored in a private bucket and are not exposed as public URLs.
- Public profile, office settings, and published services are readable by visitors. Admin writes and private record reads are protected with RLS policies.
- Notification keys and the Supabase service role key are never sent to the browser.
- All user-supplied text is rendered as text; HTML is not injected into the page.
- The FAQ assistant only uses site information and does not provide legal advice.

## Project layout

```text
app/                  Public pages and route handlers
components/            Public UI, forms, and admin dashboard
lib/                   Supabase clients, data access, validation, notifications
supabase/migrations/   Database schema, RLS, storage, and initial services
.env.example           Environment variable reference
```

## Approved public identity and office contacts

Public pages use `getPublicSettings()` to display the approved bundled SKB logo and to hold legacy telephone and WhatsApp numbers from public display. Admin settings retain the saved values. When the main office numbers are supplied and confirmed, update the shared office settings and set `firm.officeContactsConfirmed` to `true` in `lib/firm.ts`.
