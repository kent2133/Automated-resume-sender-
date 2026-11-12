"use client";

import type { SupabaseClient, User } from "@supabase/supabase-js";

import type {
  ApplicationStatus,
  Database,
  JobDisposition,
  Json,
  MatchRecommendation,
  WorkArrangement,
} from "@/lib/database.types";
import {
  initialJobs,
  type JobMatch,
  type QueueStatus,
} from "@/lib/demo-data";

export type WorkspaceActivity = {
  id: string;
  title: string;
  detail: string;
  time: string;
  tone: "green" | "amber" | "blue" | "muted";
};

export type CloudWorkspace = {
  jobs: JobMatch[];
  activity: WorkspaceActivity[];
  answeredFields: Record<string, string>;
  profileName: string | null;
  profileCoverage: Array<{ label: string; value: number }>;
};

type ApplyFlowPayload = {
  version: 1;
  sample: boolean;
  dashboardJob: JobMatch;
};

const SAMPLE_SOURCE = "ApplyFlow sample workspace";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function completion(values: unknown[]) {
  const complete = values.filter((value) => {
    if (typeof value === "string") return value.trim().length > 0;
    if (typeof value === "number") return Number.isFinite(value);
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined && value !== false;
  }).length;
  return Math.round((complete / Math.max(values.length, 1)) * 100);
}

function isJobMatch(value: unknown): value is JobMatch {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.company === "string" &&
    typeof value.location === "string" &&
    typeof value.score === "number" &&
    typeof value.status === "string" &&
    Array.isArray(value.skills) &&
    Array.isArray(value.screening)
  );
}

function readApplyFlowPayload(value: Json): ApplyFlowPayload | null {
  if (!isRecord(value)) {
    return null;
  }

  const applyFlow = value.applyflow;
  if (!isRecord(applyFlow) || !isJobMatch(applyFlow.dashboardJob)) {
    return null;
  }

  return {
    version: 1,
    sample: Boolean(applyFlow.sample),
    dashboardJob: applyFlow.dashboardJob,
  };
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function queueToApplicationStatus(status: QueueStatus): ApplicationStatus {
  switch (status) {
    case "ready":
      return "ready";
    case "sent":
      return "submitted";
    case "skipped":
      return "withdrawn";
    default:
      return "review_required";
  }
}

function applicationToQueueStatus(
  status: ApplicationStatus | undefined,
  disposition: JobDisposition,
): QueueStatus {
  if (status === "submitted" || status === "interview" || status === "offer" || status === "rejected") {
    return "sent";
  }
  if (status === "ready" || status === "queued" || status === "submitting") {
    return "ready";
  }
  if (status === "withdrawn" || disposition === "skipped") {
    return "skipped";
  }
  return "review";
}

function queueToDisposition(status: QueueStatus): JobDisposition {
  if (status === "ready" || status === "sent") {
    return "shortlisted";
  }
  if (status === "skipped") {
    return "skipped";
  }
  return "new";
}

function recommendationForScore(score: number): MatchRecommendation {
  if (score >= 90) {
    return "strong";
  }
  if (score >= 80) {
    return "good";
  }
  if (score >= 70) {
    return "review";
  }
  return "poor";
}

function workArrangement(value: string): WorkArrangement | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === "remote" || normalized === "hybrid" || normalized === "onsite" || normalized === "flexible") {
    return normalized;
  }
  return null;
}

function relativeEventTime(value: string) {
  const timestamp = new Date(value).getTime();
  const elapsed = Date.now() - timestamp;
  if (!Number.isFinite(elapsed) || elapsed < 60_000) {
    return "Just now";
  }
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function eventTone(status: ApplicationStatus | null): WorkspaceActivity["tone"] {
  if (status === "submitted" || status === "ready") {
    return "green";
  }
  if (status === "review_required") {
    return "amber";
  }
  if (status === "withdrawn" || status === "failed") {
    return "muted";
  }
  return "blue";
}

function getAnsweredFields(value: Json): Record<string, string> {
  if (!isRecord(value) || !isRecord(value.answeredFields)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value.answeredFields).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === "string" && entry[1].trim().length > 0,
    ),
  );
}

function formatSalary(
  minimum: number | null,
  maximum: number | null,
  currency: string | null,
  period: string | null,
) {
  if (minimum === null && maximum === null) {
    return "Not listed";
  }

  const formatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  const range = minimum !== null && maximum !== null
    ? `${formatter.format(minimum)} - ${formatter.format(maximum)}`
    : formatter.format(minimum ?? maximum ?? 0);
  const periodLabel = period ? ` / ${period}` : "";
  return `${currency ?? ""} ${range}${periodLabel}`.trim();
}

async function findSavedJob(
  client: SupabaseClient<Database>,
  userId: string,
  publicJobId: string,
) {
  const bySource = await client
    .from("jobs")
    .select("id,disposition")
    .eq("user_id", userId)
    .eq("source_job_id", publicJobId)
    .maybeSingle();

  if (bySource.error) {
    throw new Error(`Could not find the saved job: ${bySource.error.message}`);
  }
  if (bySource.data) {
    return bySource.data;
  }

  if (!UUID_PATTERN.test(publicJobId)) {
    return null;
  }

  const byId = await client
    .from("jobs")
    .select("id,disposition")
    .eq("user_id", userId)
    .eq("id", publicJobId)
    .maybeSingle();
  if (byId.error) {
    throw new Error(`Could not find the saved job: ${byId.error.message}`);
  }
  return byId.data;
}

async function ensureProfile(
  client: SupabaseClient<Database>,
  user: User,
) {
  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "";
  const fallbackName = user.email?.split("@")[0] || "ApplyFlow candidate";
  const { error } = await client.from("profiles").upsert(
    {
      user_id: user.id,
      full_name: metadataName || fallbackName,
      contact_email: user.email ?? null,
      country_code: "PH",
      timezone: "Asia/Manila",
    },
    { onConflict: "user_id", ignoreDuplicates: true },
  );

  if (error) {
    throw new Error(`Could not prepare the cloud profile: ${error.message}`);
  }
}

async function upsertSampleJob(
  client: SupabaseClient<Database>,
  userId: string,
  job: JobMatch,
) {
  const now = new Date().toISOString();
  const rawPayload = toJson({
    applyflow: {
      version: 1,
      sample: true,
      dashboardJob: job,
    },
  });

  const jobValues = {
    user_id: userId,
    source: SAMPLE_SOURCE,
    source_job_id: job.id,
    company_name: job.company,
    title: job.title,
    location_text: job.location,
    work_arrangement: workArrangement(job.workMode),
    description: job.summary,
    disposition: queueToDisposition(job.status),
    raw_payload: rawPayload,
    last_seen_at: now,
  };
  const { data: existingJob, error: existingJobError } = await client
    .from("jobs")
    .select("id")
    .eq("user_id", userId)
    .eq("source", SAMPLE_SOURCE)
    .eq("source_job_id", job.id)
    .maybeSingle();

  if (existingJobError) {
    throw new Error(`Could not check ${job.title}: ${existingJobError.message}`);
  }

  const jobResult = existingJob
    ? await client
        .from("jobs")
        .update(jobValues)
        .eq("user_id", userId)
        .eq("id", existingJob.id)
        .select("id")
        .single()
    : await client.from("jobs").insert(jobValues).select("id").single();
  const { data: savedJob, error: jobError } = jobResult;

  if (jobError || !savedJob) {
    throw new Error(`Could not save ${job.title}: ${jobError?.message ?? "No job record returned."}`);
  }

  const { data: savedMatch, error: matchError } = await client
    .from("job_matches")
    .upsert(
      {
        user_id: userId,
        job_id: savedJob.id,
        resume_id: null,
        score: job.score,
        recommendation: recommendationForScore(job.score),
        rationale: job.matchReason,
        strengths: job.matchedSkills,
        gaps: job.gaps,
        hard_blockers: [],
        requirement_analysis: toJson(job.screening),
        model_name: "ApplyFlow sample matcher",
        model_version: "1",
      },
      { onConflict: "user_id,job_id,resume_id" },
    )
    .select("id")
    .single();

  if (matchError || !savedMatch) {
    throw new Error(`Could not save the match for ${job.title}: ${matchError?.message ?? "No match returned."}`);
  }

  const missingFields = job.screening
    .filter((item) => !item.complete)
    .map((item) => item.label);
  const status = job.status === "ready" && missingFields.length > 0
    ? "review_required"
    : queueToApplicationStatus(job.status);
  const wasSubmitted = status === "submitted";
  const { error: applicationError } = await client.from("applications").upsert(
    {
      user_id: userId,
      job_id: savedJob.id,
      match_id: savedMatch.id,
      status,
      channel: "manual",
      cover_letter: job.coverLetter,
      field_values: toJson({
        dashboardJobId: job.id,
        answeredFields: {},
        screening: job.screening,
      }),
      missing_fields: missingFields,
      requires_review:
        status === "review_required" || job.screening.some((item) => !item.complete),
      consented_at: wasSubmitted ? now : null,
      submitted_at: wasSubmitted ? now : null,
    },
    { onConflict: "user_id,job_id" },
  );

  if (applicationError) {
    throw new Error(`Could not save the application for ${job.title}: ${applicationError.message}`);
  }
}

export async function seedCloudWorkspace(
  client: SupabaseClient<Database>,
  user: User,
) {
  await ensureProfile(client, user);
  for (const job of initialJobs) {
    await upsertSampleJob(client, user.id, job);
  }
}

async function ensureSampleWorkspace(
  client: SupabaseClient<Database>,
  user: User,
) {
  await ensureProfile(client, user);
  const { data, error } = await client
    .from("jobs")
    .select("source_job_id")
    .eq("user_id", user.id)
    .eq("source", SAMPLE_SOURCE);

  if (error) {
    throw new Error(`Could not inspect the sample workspace: ${error.message}`);
  }

  const savedIds = new Set(
    (data ?? []).map((row) => row.source_job_id).filter(Boolean),
  );
  for (const job of initialJobs) {
    if (!savedIds.has(job.id)) {
      await upsertSampleJob(client, user.id, job);
    }
  }
}

export async function loadCloudWorkspace(
  client: SupabaseClient<Database>,
  user: User,
): Promise<CloudWorkspace> {
  await ensureSampleWorkspace(client, user);

  const [
    { data: profile, error: profileError },
    { data: jobRows, error: jobError },
    { data: resumes, error: resumeError },
  ] =
    await Promise.all([
      client
        .from("profiles")
        .select("full_name,contact_email,phone,city,current_title,current_employer,professional_summary,target_roles,skills,work_arrangements,minimum_salary,availability,application_preferences")
        .eq("user_id", user.id)
        .maybeSingle(),
      client
        .from("jobs")
        .select("*")
        .eq("user_id", user.id)
        .order("discovered_at", { ascending: false }),
      client
        .from("resumes")
        .select("id,label,is_default,skills")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false }),
    ]);

  if (profileError) {
    throw new Error(`Could not load the profile: ${profileError.message}`);
  }
  if (jobError) {
    throw new Error(`Could not load the job queue: ${jobError.message}`);
  }
  if (resumeError) {
    throw new Error(`Could not load the resume library: ${resumeError.message}`);
  }

  const jobIds = jobRows.map((row) => row.id);
  const [{ data: matches, error: matchError }, { data: applications, error: applicationError }] =
    await Promise.all([
      client.from("job_matches").select("*").eq("user_id", user.id).in("job_id", jobIds),
      client.from("applications").select("*").eq("user_id", user.id).in("job_id", jobIds),
    ]);

  if (matchError) {
    throw new Error(`Could not load match results: ${matchError.message}`);
  }
  if (applicationError) {
    throw new Error(`Could not load applications: ${applicationError.message}`);
  }

  const matchByJob = new Map((matches ?? []).map((row) => [row.job_id, row]));
  const applicationByJob = new Map((applications ?? []).map((row) => [row.job_id, row]));
  const answeredFields: Record<string, string> = {};
  const resumeById = new Map((resumes ?? []).map((resume) => [resume.id, resume]));
  const defaultResume = (resumes ?? []).find((resume) => resume.is_default) ?? null;

  const jobs = jobRows.map<JobMatch>((row) => {
    const payload = readApplyFlowPayload(row.raw_payload);
    const match = matchByJob.get(row.id);
    const application = applicationByJob.get(row.id);
    const base = payload?.dashboardJob;
    const publicId = base?.id ?? row.source_job_id ?? row.id;
    const savedAnsweredFields = getAnsweredFields(application?.field_values ?? {});
    const selectedResume =
      resumeById.get(application?.resume_id ?? "") ??
      resumeById.get(match?.resume_id ?? "") ??
      defaultResume;

    Object.entries(savedAnsweredFields).forEach(([label, value]) => {
      answeredFields[`${publicId}:${label}`] = value;
    });

    return {
      id: publicId,
      title: base?.title ?? row.title,
      company: base?.company ?? row.company_name,
      location: base?.location ?? row.location_text ?? "Location not provided",
      workMode: base?.workMode ?? row.work_arrangement ?? "Flexible",
      salary: base?.salary ?? formatSalary(
        row.salary_min,
        row.salary_max,
        row.salary_currency,
        row.salary_period,
      ),
      source: base?.source ?? row.source,
      posted: base?.posted ?? "Recently discovered",
      score: Number(match?.score ?? base?.score ?? 0),
      status: applicationToQueueStatus(application?.status, row.disposition),
      skills: base?.skills ?? Array.from(new Set([
        ...(match?.strengths ?? []),
        ...(selectedResume?.skills ?? []),
      ])),
      matchedSkills: match?.strengths ?? base?.matchedSkills ?? [],
      gaps: match?.gaps ?? base?.gaps ?? [],
      summary: base?.summary ?? row.description,
      matchReason: match?.rationale ?? base?.matchReason ?? "This role is ready for your review.",
      resume: base?.resume ?? selectedResume?.label ?? "Choose a resume",
      coverLetter: application?.cover_letter ?? base?.coverLetter ?? "Not generated",
      screening: base?.screening ?? [],
    };
  });

  const applicationIds = (applications ?? []).map((row) => row.id);
  let activity: WorkspaceActivity[] = [];
  if (applicationIds.length) {
    const { data: events, error: eventsError } = await client
      .from("application_events")
      .select("*")
      .eq("user_id", user.id)
      .in("application_id", applicationIds)
      .order("created_at", { ascending: false })
      .limit(8);

    if (eventsError) {
      throw new Error(`Could not load application activity: ${eventsError.message}`);
    }

    activity = (events ?? []).map((event) => ({
      id: String(event.id),
      title: event.event_type
        .split("_")
        .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
        .join(" "),
      detail: event.message ?? "Application record updated",
      time: relativeEventTime(event.created_at),
      tone: eventTone(event.to_status),
    }));
  }

  return {
    jobs,
    activity,
    answeredFields,
    profileName: profile?.full_name ?? null,
    profileCoverage: [
      {
        label: "Identity and contact",
        value: completion([profile?.full_name, profile?.contact_email, profile?.phone, profile?.city]),
      },
      {
        label: "Work preferences",
        value: completion([
          profile?.target_roles,
          profile?.work_arrangements,
          profile?.minimum_salary,
          profile?.availability,
        ]),
      },
      {
        label: "Professional history",
        value: completion([
          profile?.current_title,
          profile?.current_employer,
          profile?.professional_summary,
          profile?.skills,
        ]),
      },
      {
        label: "Reusable answers",
        value: completion([
          isRecord(profile?.application_preferences)
            ? profile.application_preferences.reusableShortAnswer
            : null,
          isRecord(profile?.application_preferences)
            ? profile.application_preferences.coverLetter
            : null,
        ]),
      },
      {
        label: "Resume readiness",
        value: resumes?.length ? 100 : 0,
      },
    ],
  };
}

export async function persistJobStatus(
  client: SupabaseClient<Database>,
  userId: string,
  publicJobId: string,
  queueStatus: QueueStatus,
  message: string,
) {
  const job = await findSavedJob(client, userId, publicJobId);
  if (!job) {
    throw new Error("Could not find the saved job: Record missing.");
  }

  const { data: currentApplication, error: currentError } = await client
    .from("applications")
    .select("id,status,requires_review,consented_at,submitted_at,missing_fields")
    .eq("user_id", userId)
    .eq("job_id", job.id)
    .maybeSingle();

  if (currentError || !currentApplication) {
    throw new Error(`Could not find the application record: ${currentError?.message ?? "Record missing."}`);
  }

  const nextStatus = queueToApplicationStatus(queueStatus);
  if (nextStatus === "ready" && currentApplication.missing_fields.length > 0) {
    throw new Error("Complete every required screening answer before approving this application.");
  }
  const now = new Date().toISOString();
  const { error: jobUpdateError } = await client
    .from("jobs")
    .update({ disposition: queueToDisposition(queueStatus) })
    .eq("user_id", userId)
    .eq("id", job.id);

  if (jobUpdateError) {
    throw new Error(`Could not update the job: ${jobUpdateError.message}`);
  }

  const { error: applicationUpdateError } = await client
    .from("applications")
    .update({
      status: nextStatus,
      requires_review: nextStatus === "review_required",
      consented_at: nextStatus === "submitted" ? now : null,
      submitted_at: nextStatus === "submitted" ? now : null,
    })
    .eq("user_id", userId)
    .eq("id", currentApplication.id);

  if (applicationUpdateError) {
    await client
      .from("jobs")
      .update({ disposition: job.disposition })
      .eq("user_id", userId)
      .eq("id", job.id);
    throw new Error(`Could not update the application: ${applicationUpdateError.message}`);
  }

  if (currentApplication.status !== nextStatus) {
    const { error: eventError } = await client.from("application_events").insert({
      user_id: userId,
      application_id: currentApplication.id,
      event_type: queueStatus === "sent" ? "application_submitted" : `application_${queueStatus}`,
      actor: "user",
      from_status: currentApplication.status,
      to_status: nextStatus,
      message,
      metadata: toJson({ dashboardJobId: publicJobId }),
    });

    if (eventError) {
      await Promise.all([
        client
          .from("jobs")
          .update({ disposition: job.disposition })
          .eq("user_id", userId)
          .eq("id", job.id),
        client
          .from("applications")
          .update({
            status: currentApplication.status,
            requires_review: currentApplication.requires_review,
            consented_at: currentApplication.consented_at,
            submitted_at: currentApplication.submitted_at,
          })
          .eq("user_id", userId)
          .eq("id", currentApplication.id),
      ]);
      throw new Error(`The status changed, but the audit event failed: ${eventError.message}`);
    }
  }
}

export async function persistAnsweredField(
  client: SupabaseClient<Database>,
  userId: string,
  publicJobId: string,
  label: string,
  value: string,
) {
  const job = await findSavedJob(client, userId, publicJobId);
  if (!job) {
    throw new Error("Could not find the saved job: Record missing.");
  }

  const { data: application, error: applicationError } = await client
    .from("applications")
    .select("id,field_values,missing_fields")
    .eq("user_id", userId)
    .eq("job_id", job.id)
    .maybeSingle();

  if (applicationError || !application) {
    throw new Error(`Could not find the application record: ${applicationError?.message ?? "Record missing."}`);
  }

  const current = isRecord(application.field_values)
    ? application.field_values
    : {};
  const answeredFields = getAnsweredFields(application.field_values);
  const answer = value.trim();
  if (answer) {
    answeredFields[label] = answer;
  } else {
    delete answeredFields[label];
  }
  const missingFields = answer
    ? application.missing_fields.filter((field) => field !== label)
    : Array.from(new Set([...application.missing_fields, label]));
  const { error: updateError } = await client
    .from("applications")
    .update({
      field_values: toJson({ ...current, answeredFields }),
      missing_fields: missingFields,
      requires_review: missingFields.length > 0,
    })
    .eq("user_id", userId)
    .eq("id", application.id);

  if (updateError) {
    throw new Error(`Could not save the reviewed answer: ${updateError.message}`);
  }
}

export async function resetCloudWorkspace(
  client: SupabaseClient<Database>,
  user: User,
) {
  for (const job of initialJobs) {
    await upsertSampleJob(client, user.id, job);
  }
}
