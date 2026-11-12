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
- Email and password accounts with protected workspace routes
- Database-backed profiles, jobs, decisions, answers, and audit events
- Manual real-job capture with salary and fit review

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

The dashboard includes a complete portfolio demo for signed-out visitors. Signed-in users get a private Supabase workspace whose decisions persist across sessions.

## Supabase setup

1. Create a free Supabase project.
2. Open the SQL editor.
3. Run every migration in `supabase/migrations` in filename order.
4. Copy the project URL and publishable key into `.env.local`.
5. In Supabase Authentication URL Configuration, set the Site URL to the deployed Vercel domain.
6. Add `https://automated-resume-sender.vercel.app/auth/callback` as an allowed redirect URL.

Required environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

No service role key is required by the current application. If a later server task needs one, keep it server-only and never expose it through a `NEXT_PUBLIC_` variable.

The migration creates user-owned tables, row level security policies, indexes, timestamp triggers, and a private `resumes` storage bucket.

Never commit a resume PDF or `.env.local`.

## Private workspace flow

1. Create an account at `/auth/sign-up` and confirm the email if Supabase email confirmation is enabled.
2. Complete `/setup` to save the account-scoped candidate profile.
3. Upload one or more files in `/resumes` and choose a default resume.
4. Add a real opportunity in `/jobs/new`.
5. Review missing screening answers and save the exact answer before approving a job.
6. Use the Chrome extension on a supported application page to fill safe fields for review.
7. Submit on the employer site yourself, then use Record as sent to add the manual submission to the audit trail.

ApplyFlow never treats a queue action as an external submission. The sent status is recorded only after the user confirms that the application was already submitted.

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

The extension side panel includes a direct link to the production dashboard at `https://automated-resume-sender.vercel.app/`. The dashboard and extension do not currently synchronize profiles automatically. Use the private JSON export and import flow below to move candidate data deliberately.

The assistant scans the current page only after the user invokes it. The generic adapter never clicks the final employer Submit button.

### Private candidate profile

The setup page and Chrome extension share a versioned JSON profile format. This keeps personal contact details, salary floors, employment details, availability, equipment, and reusable answers out of the public source code.

1. Open `/setup` in the dashboard.
2. Import a private ApplyFlow JSON profile or complete the four setup steps.
3. Save the setup and export the private JSON.
4. Open the extension, expand Private candidate data, and import the same JSON.
5. Select the resume PDF from the device when an eligible application uploader is present.

The `private` and `resumes` directories are ignored by Git. Never commit an exported candidate profile because it contains application-only personal data.

### Where it works

The generic assistant is designed for standard HTML application forms on employer career pages and common applicant tracking pages. It only accesses the active tab after the user opens it, fills high-confidence professional fields for review, and leaves salary, work eligibility, sensitive disclosures, consent, CAPTCHA, and final submission manual.

A site-specific adapter should be reviewed against that site's current terms before enabling deeper automation. Unsupported custom controls remain manual.

### OnlineJobs.ph

OnlineJobs.ph is intentionally manual-only. Its terms prohibit automated means without express permission, so ApplyFlow does not scan, highlight, fill, attach files, spend Apply Points, or submit on that origin. The side panel remains available as a companion for preparing and copying reviewed profile details and answer snippets.

Direct page assistance can be enabled only after written permission from OnlineJobs.ph and a dedicated adapter review.

## Vercel deployment

1. Import this GitHub repository into Vercel.
2. Keep the root directory at the repository root.
3. Use the Next.js preset.
4. Add the Supabase environment variables.
5. Deploy and configure the Supabase Site URL and callback URL shown above.
6. Redeploy after adding or changing environment variables.

The extension is packaged separately and is configured for `https://automated-resume-sender.vercel.app/`. Rebuild `extension/dist` after any extension source or manifest change.

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
