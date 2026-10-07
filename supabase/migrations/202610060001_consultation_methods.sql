begin;

alter table public.consultations
  drop constraint if exists consultations_preferred_contact_method_check;

alter table public.consultations
  add constraint consultations_preferred_contact_method_check
  check (preferred_contact_method in (
    'Office Visit',
    'Phone Consultation',
    'Meeting at Another Location',
    'Phone',
    'WhatsApp',
    'Email'
  )),
  alter column preferred_contact_method set default 'Office Visit';

-- Existing contact preferences and WhatsApp opt-ins are retained unchanged.
notify pgrst, 'reload schema';

commit;
