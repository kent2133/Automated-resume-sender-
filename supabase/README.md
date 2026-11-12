# ApplyFlow Supabase setup

Supabase provides the hosted Postgres database, authentication, and private resume storage for ApplyFlow. The free plan is suitable for the portfolio deployment and can be upgraded without changing the application data model.

## Create the project

1. Create a Supabase project in the region closest to the expected users.
2. Open Project Settings, then API.
3. Copy the project URL and publishable key into a local `.env.local` file based on `.env.example`.
4. Add the same public values to the Vercel project environment variables for Production, Preview, and Development.
5. Never expose the secret key or service role key with a `NEXT_PUBLIC_` prefix.

Apply migrations with the Supabase CLI after linking the local repository:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

The migration creates the private `resumes` bucket, so it does not need to be created manually in the dashboard.

## Data model

- `profiles` stores application-ready contact details and job preferences for one authenticated user.
- `profile_answers` stores reusable answers for common required application questions.
- `resumes` stores private file metadata, parsed text, skills, versions, and the default resume selection.
- `jobs` stores normalized job listings plus the original source payload.
- `job_matches` stores resume-specific fit analysis, blockers, strengths, and model provenance.
- `applications` stores prepared form values, consent, submission state, and confirmation data.
- `application_events` is an append-only user-visible audit trail.
- `extension_handoffs` stores short-lived, hashed handoff tokens used by the browser extension and web app.

Every user-owned table includes `user_id`. Composite foreign keys prevent records belonging to different users from being linked together.

## Security model

Row Level Security is enabled on every application table. Authenticated users can only read and change rows whose `user_id` matches their Supabase Auth identity. Anonymous access is revoked.

Resume files are private. Store every object under this path convention:

```text
USER_ID/RESUME_ID/original-file-name.pdf
```

Storage policies verify both the authenticated object owner and the first folder in the path. The bucket accepts PDF, DOC, and DOCX files up to 10 MB.

Application event rows can be selected and inserted by their owner, but they cannot be updated or deleted through the authenticated API. Trusted server operations can use a secret key when a task genuinely needs to bypass RLS. Keep that key server-only.

## Client behavior

Use `getBrowserSupabaseClient` in Client Components and `getServerSupabaseClient` in Server Components, Server Actions, and Route Handlers. Both helpers return a structured configuration error instead of throwing when environment variables are absent. This keeps local builds and portfolio previews usable before a Supabase project is connected.

The server client uses the asynchronous Next.js cookies API. Authentication routes should also use a Next.js proxy to refresh sessions before protected rendering is added.

## Type generation

`src/lib/database.types.ts` mirrors the initial migration so development can start immediately. After any schema migration, regenerate the types from the linked project and review the diff before replacing the checked-in file:

```powershell
npx supabase gen types typescript --linked
```
