alter table public.profiles
  add column first_name text,
  add column middle_name text,
  add column last_name text,
  add column current_title text,
  add column current_employer text,
  add column skills text[] not null default '{}',
  add column availability text,
  add column employment_history jsonb not null default '[]'::jsonb,
  add column education_history jsonb not null default '[]'::jsonb,
  add column credentials jsonb not null default '[]'::jsonb,
  add column languages jsonb not null default '[]'::jsonb,
  add column salary_preferences jsonb not null default '{}'::jsonb,
  add column schedule_preferences jsonb not null default '{}'::jsonb,
  add column work_eligibility jsonb not null default '{}'::jsonb,
  add column equipment_profile jsonb not null default '{}'::jsonb,
  add column application_preferences jsonb not null default '{}'::jsonb,
  add constraint profiles_first_name_present check (
    first_name is null or length(btrim(first_name)) > 0
  ),
  add constraint profiles_middle_name_present check (
    middle_name is null or length(btrim(middle_name)) > 0
  ),
  add constraint profiles_last_name_present check (
    last_name is null or length(btrim(last_name)) > 0
  ),
  add constraint profiles_current_title_present check (
    current_title is null or length(btrim(current_title)) > 0
  ),
  add constraint profiles_current_employer_present check (
    current_employer is null or length(btrim(current_employer)) > 0
  ),
  add constraint profiles_availability_present check (
    availability is null or length(btrim(availability)) > 0
  ),
  add constraint profiles_employment_history_array check (
    jsonb_typeof(employment_history) = 'array'
  ),
  add constraint profiles_education_history_array check (
    jsonb_typeof(education_history) = 'array'
  ),
  add constraint profiles_credentials_array check (
    jsonb_typeof(credentials) = 'array'
  ),
  add constraint profiles_languages_array check (
    jsonb_typeof(languages) = 'array'
  ),
  add constraint profiles_salary_preferences_object check (
    jsonb_typeof(salary_preferences) = 'object'
  ),
  add constraint profiles_schedule_preferences_object check (
    jsonb_typeof(schedule_preferences) = 'object'
  ),
  add constraint profiles_work_eligibility_object check (
    jsonb_typeof(work_eligibility) = 'object'
  ),
  add constraint profiles_equipment_profile_object check (
    jsonb_typeof(equipment_profile) = 'object'
  ),
  add constraint profiles_application_preferences_object check (
    jsonb_typeof(application_preferences) = 'object'
  );

comment on column public.profiles.employment_history is
  'Private candidate employment records. Each entry may describe an employer, title, dates, and current-role status.';

comment on column public.profiles.education_history is
  'Private education records with degree, institution, focus, dates, and completion status.';

comment on column public.profiles.credentials is
  'Private certifications, examinations, and professional credentials.';

comment on column public.profiles.languages is
  'Private language records. Proficiency should be left unknown until the candidate verifies it.';

comment on column public.profiles.salary_preferences is
  'Private multi-currency salary floors and preferred compensation values.';

comment on column public.profiles.schedule_preferences is
  'Private remote-work, shift, availability, and timezone preferences.';

comment on column public.profiles.work_eligibility is
  'Private work-authorization review data. Applications must not infer authorization from passport availability.';

comment on column public.profiles.equipment_profile is
  'Private workstation, connectivity, backup power, and backup device details.';

comment on column public.profiles.application_preferences is
  'Private matching preferences such as role keywords and AI-assisted development acceptance.';
