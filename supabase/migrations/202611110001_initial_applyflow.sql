create extension if not exists pgcrypto with schema extensions;

create type public.work_arrangement as enum (
  'remote',
  'hybrid',
  'onsite',
  'flexible'
);

create type public.employment_type as enum (
  'full_time',
  'part_time',
  'contract',
  'temporary',
  'internship',
  'freelance',
  'other'
);

create type public.salary_period as enum (
  'hour',
  'day',
  'week',
  'month',
  'year'
);

create type public.job_disposition as enum (
  'new',
  'shortlisted',
  'skipped',
  'archived'
);

create type public.match_recommendation as enum (
  'strong',
  'good',
  'review',
  'poor',
  'blocked'
);

create type public.application_status as enum (
  'draft',
  'review_required',
  'ready',
  'queued',
  'submitting',
  'submitted',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
  'failed'
);

create type public.application_channel as enum (
  'browser_extension',
  'email',
  'company_site',
  'job_board',
  'manual'
);

create type public.application_actor as enum (
  'user',
  'extension',
  'system'
);

create type public.handoff_status as enum (
  'pending',
  'claimed',
  'completed',
  'expired',
  'cancelled',
  'failed'
);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  contact_email text,
  phone text,
  headline text,
  professional_summary text,
  city text,
  country_code text not null default 'PH',
  timezone text not null default 'Asia/Manila',
  portfolio_url text,
  linkedin_url text,
  github_url text,
  target_roles text[] not null default '{}',
  preferred_locations text[] not null default '{}',
  work_arrangements public.work_arrangement[] not null default '{}',
  minimum_salary numeric(14, 2),
  salary_currency text not null default 'PHP',
  salary_period public.salary_period not null default 'month',
  years_experience numeric(4, 1),
  requires_sponsorship boolean,
  willing_to_relocate boolean,
  notice_period_days integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_country_code_format check (country_code ~ '^[A-Z]{2}$'),
  constraint profiles_currency_format check (salary_currency ~ '^[A-Z]{3}$'),
  constraint profiles_minimum_salary_nonnegative check (minimum_salary is null or minimum_salary >= 0),
  constraint profiles_years_experience_range check (
    years_experience is null or years_experience between 0 and 80
  ),
  constraint profiles_notice_period_nonnegative check (
    notice_period_days is null or notice_period_days >= 0
  )
);

create table public.profile_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  question_key text not null,
  question_text text not null,
  answer_text text not null,
  category text not null default 'general',
  is_sensitive boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_answers_question_key_format check (
    question_key ~ '^[a-z0-9][a-z0-9_.-]{1,119}$'
  ),
  constraint profile_answers_question_present check (length(btrim(question_text)) > 0),
  constraint profile_answers_answer_present check (length(btrim(answer_text)) > 0),
  constraint profile_answers_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint profile_answers_user_question_unique unique (user_id, question_key),
  constraint profile_answers_user_id_id_unique unique (user_id, id)
);

create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  label text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  checksum_sha256 text,
  parsed_text text,
  skills text[] not null default '{}',
  is_default boolean not null default false,
  version integer not null default 1,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resumes_label_present check (length(btrim(label)) > 0),
  constraint resumes_storage_path_owned check (
    split_part(storage_path, '/', 1) = user_id::text
  ),
  constraint resumes_file_name_present check (length(btrim(file_name)) > 0),
  constraint resumes_mime_type_allowed check (
    mime_type in (
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
  ),
  constraint resumes_size_range check (size_bytes > 0 and size_bytes <= 10485760),
  constraint resumes_checksum_format check (
    checksum_sha256 is null or checksum_sha256 ~ '^[a-f0-9]{64}$'
  ),
  constraint resumes_version_positive check (version > 0),
  constraint resumes_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint resumes_storage_path_unique unique (storage_path),
  constraint resumes_user_id_id_unique unique (user_id, id)
);

create unique index resumes_one_default_per_user_idx
  on public.resumes (user_id)
  where is_default;

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  source text not null,
  source_job_id text,
  source_url text,
  company_name text not null,
  title text not null,
  location_text text,
  work_arrangement public.work_arrangement,
  employment_type public.employment_type,
  description text not null,
  salary_min numeric(14, 2),
  salary_max numeric(14, 2),
  salary_currency text,
  salary_period public.salary_period,
  disposition public.job_disposition not null default 'new',
  posted_at timestamptz,
  expires_at timestamptz,
  discovered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_source_present check (length(btrim(source)) > 0),
  constraint jobs_source_reference_present check (
    source_job_id is not null or source_url is not null
  ),
  constraint jobs_company_present check (length(btrim(company_name)) > 0),
  constraint jobs_title_present check (length(btrim(title)) > 0),
  constraint jobs_description_present check (length(btrim(description)) > 0),
  constraint jobs_salary_nonnegative check (
    (salary_min is null or salary_min >= 0)
    and (salary_max is null or salary_max >= 0)
  ),
  constraint jobs_salary_range check (
    salary_min is null or salary_max is null or salary_min <= salary_max
  ),
  constraint jobs_salary_currency_format check (
    salary_currency is null or salary_currency ~ '^[A-Z]{3}$'
  ),
  constraint jobs_expiration_after_posting check (
    expires_at is null or posted_at is null or expires_at > posted_at
  ),
  constraint jobs_raw_payload_object check (jsonb_typeof(raw_payload) = 'object'),
  constraint jobs_user_id_id_unique unique (user_id, id)
);

create unique index jobs_source_identity_idx
  on public.jobs (user_id, source, source_job_id)
  where source_job_id is not null;

create unique index jobs_source_url_idx
  on public.jobs (user_id, source, source_url)
  where source_job_id is null and source_url is not null;

create table public.job_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  job_id uuid not null,
  resume_id uuid,
  score numeric(5, 2) not null,
  recommendation public.match_recommendation not null,
  rationale text not null,
  strengths text[] not null default '{}',
  gaps text[] not null default '{}',
  hard_blockers text[] not null default '{}',
  requirement_analysis jsonb not null default '[]'::jsonb,
  model_name text,
  model_version text,
  matched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_matches_score_range check (score between 0 and 100),
  constraint job_matches_rationale_present check (length(btrim(rationale)) > 0),
  constraint job_matches_requirement_analysis_array check (
    jsonb_typeof(requirement_analysis) = 'array'
  ),
  constraint job_matches_user_job_fk foreign key (user_id, job_id)
    references public.jobs (user_id, id) on delete cascade,
  constraint job_matches_user_resume_fk foreign key (user_id, resume_id)
    references public.resumes (user_id, id) on delete cascade,
  constraint job_matches_user_id_job_id_id_unique unique (user_id, job_id, id),
  constraint job_matches_user_id_id_unique unique (user_id, id)
);

create unique index job_matches_user_job_resume_idx
  on public.job_matches (user_id, job_id, resume_id) nulls not distinct;

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  job_id uuid not null,
  match_id uuid,
  resume_id uuid,
  status public.application_status not null default 'draft',
  channel public.application_channel not null default 'browser_extension',
  cover_letter text,
  field_values jsonb not null default '{}'::jsonb,
  missing_fields text[] not null default '{}',
  requires_review boolean not null default true,
  consented_at timestamptz,
  queued_at timestamptz,
  submitted_at timestamptz,
  external_confirmation_id text,
  external_confirmation_url text,
  failure_code text,
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_field_values_object check (jsonb_typeof(field_values) = 'object'),
  constraint applications_consent_before_submission check (
    submitted_at is null or consented_at is not null
  ),
  constraint applications_consent_before_automation check (
    status not in ('queued', 'submitting', 'submitted', 'interview', 'offer', 'rejected')
    or consented_at is not null
  ),
  constraint applications_submission_timestamp_present check (
    status not in ('submitted', 'interview', 'offer', 'rejected')
    or submitted_at is not null
  ),
  constraint applications_user_job_fk foreign key (user_id, job_id)
    references public.jobs (user_id, id) on delete cascade,
  constraint applications_user_match_fk foreign key (user_id, job_id, match_id)
    references public.job_matches (user_id, job_id, id) on delete set null (match_id),
  constraint applications_user_resume_fk foreign key (user_id, resume_id)
    references public.resumes (user_id, id) on delete set null (resume_id),
  constraint applications_user_job_unique unique (user_id, job_id),
  constraint applications_user_id_id_unique unique (user_id, id)
);

create table public.application_events (
  id bigint generated by default as identity primary key,
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  application_id uuid not null,
  event_type text not null,
  actor public.application_actor not null,
  from_status public.application_status,
  to_status public.application_status,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint application_events_event_type_present check (length(btrim(event_type)) > 0),
  constraint application_events_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint application_events_status_changed check (
    from_status is null or to_status is null or from_status <> to_status
  ),
  constraint application_events_user_application_fk foreign key (user_id, application_id)
    references public.applications (user_id, id) on delete cascade
);

create table public.extension_handoffs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  application_id uuid,
  job_id uuid,
  token_hash text not null,
  status public.handoff_status not null default 'pending',
  target_url text not null,
  payload jsonb not null default '{}'::jsonb,
  claimed_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint extension_handoffs_token_hash_length check (length(token_hash) >= 32),
  constraint extension_handoffs_target_url_present check (length(btrim(target_url)) > 0),
  constraint extension_handoffs_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint extension_handoffs_expiration_valid check (expires_at > created_at),
  constraint extension_handoffs_completion_valid check (
    completed_at is null or claimed_at is not null
  ),
  constraint extension_handoffs_claim_status_valid check (
    status not in ('claimed', 'completed') or claimed_at is not null
  ),
  constraint extension_handoffs_complete_status_valid check (
    status <> 'completed' or completed_at is not null
  ),
  constraint extension_handoffs_token_hash_unique unique (token_hash),
  constraint extension_handoffs_user_application_fk foreign key (user_id, application_id)
    references public.applications (user_id, id) on delete cascade,
  constraint extension_handoffs_user_job_fk foreign key (user_id, job_id)
    references public.jobs (user_id, id) on delete cascade,
  constraint extension_handoffs_application_or_job check (
    application_id is not null or job_id is not null
  ),
  constraint extension_handoffs_user_id_id_unique unique (user_id, id)
);

create index profile_answers_user_category_idx
  on public.profile_answers (user_id, category, updated_at desc);
create index resumes_user_updated_idx
  on public.resumes (user_id, updated_at desc);
create index jobs_user_disposition_discovered_idx
  on public.jobs (user_id, disposition, discovered_at desc);
create index jobs_user_posted_idx
  on public.jobs (user_id, posted_at desc nulls last);
create index job_matches_user_recommendation_score_idx
  on public.job_matches (user_id, recommendation, score desc);
create index job_matches_user_resume_idx
  on public.job_matches (user_id, resume_id)
  where resume_id is not null;
create index applications_user_status_updated_idx
  on public.applications (user_id, status, updated_at desc);
create index applications_user_match_idx
  on public.applications (user_id, match_id)
  where match_id is not null;
create index applications_user_resume_idx
  on public.applications (user_id, resume_id)
  where resume_id is not null;
create index application_events_application_created_idx
  on public.application_events (application_id, created_at desc);
create index application_events_user_created_idx
  on public.application_events (user_id, created_at desc);
create index extension_handoffs_user_status_expires_idx
  on public.extension_handoffs (user_id, status, expires_at);
create index extension_handoffs_user_application_idx
  on public.extension_handoffs (user_id, application_id)
  where application_id is not null;
create index extension_handoffs_user_job_idx
  on public.extension_handoffs (user_id, job_id)
  where job_id is not null;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, full_name, contact_email)
  values (
    new.id,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    new.email
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger profile_answers_set_updated_at
before update on public.profile_answers
for each row execute function public.set_updated_at();

create trigger resumes_set_updated_at
before update on public.resumes
for each row execute function public.set_updated_at();

create trigger jobs_set_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

create trigger job_matches_set_updated_at
before update on public.job_matches
for each row execute function public.set_updated_at();

create trigger applications_set_updated_at
before update on public.applications
for each row execute function public.set_updated_at();

create trigger extension_handoffs_set_updated_at
before update on public.extension_handoffs
for each row execute function public.set_updated_at();

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

insert into public.profiles (user_id, full_name, contact_email)
select
  users.id,
  nullif(btrim(coalesce(users.raw_user_meta_data ->> 'full_name', '')), ''),
  users.email
from auth.users
on conflict (user_id) do nothing;

alter table public.profiles enable row level security;
alter table public.profile_answers enable row level security;
alter table public.resumes enable row level security;
alter table public.jobs enable row level security;
alter table public.job_matches enable row level security;
alter table public.applications enable row level security;
alter table public.application_events enable row level security;
alter table public.extension_handoffs enable row level security;

create policy profiles_select_own
on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);

create policy profiles_insert_own
on public.profiles for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy profiles_update_own
on public.profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy profiles_delete_own
on public.profiles for delete to authenticated
using ((select auth.uid()) = user_id);

create policy profile_answers_select_own
on public.profile_answers for select to authenticated
using ((select auth.uid()) = user_id);

create policy profile_answers_insert_own
on public.profile_answers for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy profile_answers_update_own
on public.profile_answers for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy profile_answers_delete_own
on public.profile_answers for delete to authenticated
using ((select auth.uid()) = user_id);

create policy resumes_select_own
on public.resumes for select to authenticated
using ((select auth.uid()) = user_id);

create policy resumes_insert_own
on public.resumes for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy resumes_update_own
on public.resumes for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy resumes_delete_own
on public.resumes for delete to authenticated
using ((select auth.uid()) = user_id);

create policy jobs_select_own
on public.jobs for select to authenticated
using ((select auth.uid()) = user_id);

create policy jobs_insert_own
on public.jobs for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy jobs_update_own
on public.jobs for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy jobs_delete_own
on public.jobs for delete to authenticated
using ((select auth.uid()) = user_id);

create policy job_matches_select_own
on public.job_matches for select to authenticated
using ((select auth.uid()) = user_id);

create policy job_matches_insert_own
on public.job_matches for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy job_matches_update_own
on public.job_matches for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy job_matches_delete_own
on public.job_matches for delete to authenticated
using ((select auth.uid()) = user_id);

create policy applications_select_own
on public.applications for select to authenticated
using ((select auth.uid()) = user_id);

create policy applications_insert_own
on public.applications for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy applications_update_own
on public.applications for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy applications_delete_own
on public.applications for delete to authenticated
using ((select auth.uid()) = user_id);

create policy application_events_select_own
on public.application_events for select to authenticated
using ((select auth.uid()) = user_id);

create policy application_events_insert_own
on public.application_events for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy extension_handoffs_select_own
on public.extension_handoffs for select to authenticated
using ((select auth.uid()) = user_id);

create policy extension_handoffs_insert_own
on public.extension_handoffs for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy extension_handoffs_update_own
on public.extension_handoffs for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy extension_handoffs_delete_own
on public.extension_handoffs for delete to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.profiles from anon;
revoke all on table public.profile_answers from anon;
revoke all on table public.resumes from anon;
revoke all on table public.jobs from anon;
revoke all on table public.job_matches from anon;
revoke all on table public.applications from anon;
revoke all on table public.application_events from anon;
revoke all on table public.extension_handoffs from anon;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.profile_answers to authenticated;
grant select, insert, update, delete on table public.resumes to authenticated;
grant select, insert, update, delete on table public.jobs to authenticated;
grant select, insert, update, delete on table public.job_matches to authenticated;
grant select, insert, update, delete on table public.applications to authenticated;
grant select, insert on table public.application_events to authenticated;
grant usage, select on sequence public.application_events_id_seq to authenticated;
grant select, insert, update, delete on table public.extension_handoffs to authenticated;

grant usage on type public.work_arrangement to authenticated;
grant usage on type public.employment_type to authenticated;
grant usage on type public.salary_period to authenticated;
grant usage on type public.job_disposition to authenticated;
grant usage on type public.match_recommendation to authenticated;
grant usage on type public.application_status to authenticated;
grant usage on type public.application_channel to authenticated;
grant usage on type public.application_actor to authenticated;
grant usage on type public.handoff_status to authenticated;

revoke execute on function public.create_profile_for_new_user() from public;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'resumes',
  'resumes',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy resume_objects_select_own
on storage.objects for select to authenticated
using (
  bucket_id = 'resumes'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy resume_objects_insert_own
on storage.objects for insert to authenticated
with check (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy resume_objects_update_own
on storage.objects for update to authenticated
using (
  bucket_id = 'resumes'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'resumes'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy resume_objects_delete_own
on storage.objects for delete to authenticated
using (
  bucket_id = 'resumes'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
