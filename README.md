# ApplyFlow

ApplyFlow is a job application command center for reviewing matches, selecting the right resume, preparing accurate form answers, and tracking every outcome.

The project has two connected parts:

- A Next.js dashboard hosted on Vercel
- A Chrome Manifest V3 assistant that scans and fills the application page the user opened

ApplyFlow is review-first. It prepares safe fields and resume attachments, but it does not bypass CAPTCHA, invent answers, collect employer passwords, or silently submit unknown forms.

## What makes it different

- Actionable review queue instead of analytics alone
- Transparent fit score with matched skills, gaps, and hard blockers
- Resume version selection for each application
- Reusable answer vault with sensitivity and review policies
- Duplicate application prevention
- Application timeline and audit events
- Generic form scanner with confidence scores
- Sensitive question detection and blocking
- Field highlighting and post-fill verification
- Private resume storage through Supabase

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Supabase Auth, PostgreSQL, and Storage
- Vercel hosting
- Chrome Manifest V3 extension
- Vite for the extension build

## Local dashboard setup

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

The dashboard includes a complete portfolio demo when Supabase is not configured. Connect Supabase to persist real user data.

## Supabase setup

1. Create a free Supabase project.
2. Open the SQL editor.
3. Run the migration in `supabase/migrations`.
4. Copy the project URL and publishable key into `.env.local`.
5. Keep the service role key server-only if a later server task requires it.

Required environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

The migration creates user-owned tables, row level security policies, indexes, timestamp triggers, and a private `resumes` storage bucket.

Never commit a resume PDF or `.env.local`.

## Chrome extension setup

```bash
cd extension
npm install
npm run build
```

Then:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose Load unpacked.
4. Select `extension/dist`.
5. Open a job application page and choose the ApplyFlow extension icon.

The assistant scans the current page only after the user invokes it. The generic adapter never clicks the final employer Submit button.

### OnlineJobs.ph

OnlineJobs.ph is intentionally manual-only. Its terms prohibit automated means without express permission, so ApplyFlow does not scan, highlight, fill, attach files, spend Apply Points, or submit on that origin. The side panel remains available as a companion for preparing and copying reviewed profile details and answer snippets.

Direct page assistance can be enabled only after written permission from OnlineJobs.ph and a dedicated adapter review.

## Vercel deployment

1. Import this GitHub repository into Vercel.
2. Keep the root directory at the repository root.
3. Use the Next.js preset.
4. Add the Supabase environment variables.
5. Deploy.

The extension is packaged separately. Update its production app origin after the Vercel URL is known, then rebuild it.

## Validation

```bash
npm run typecheck
npm run lint
npm run build
```

Extension validation:

```bash
npm --prefix extension run test
npm --prefix extension run build
```

## Safety model

ApplyFlow pauses when it sees:

- CAPTCHA or human verification
- Authentication and multi-factor prompts
- Unknown required fields
- Sensitive questions without explicit saved instructions
- Legal declarations or unchecked consent
- A changed application origin
- An inaccessible custom resume uploader

The product is designed to help a real candidate submit accurate applications, not to operate as an unattended mass-application bot.
