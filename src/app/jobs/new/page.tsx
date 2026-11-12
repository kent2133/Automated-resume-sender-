"use client";

import { ArrowLeft, ArrowRight, BriefcaseBusiness, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type {
  EmploymentType,
  MatchRecommendation,
  SalaryPeriod,
  WorkArrangement,
} from "@/lib/database.types";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";

import styles from "./new-job.module.css";

function optionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function commaList(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function recommendation(score: number): MatchRecommendation {
  if (score >= 90) return "strong";
  if (score >= 80) return "good";
  if (score >= 70) return "review";
  if (score >= 50) return "poor";
  return "blocked";
}

export default function NewJobPage() {
  const router = useRouter();
  const supabaseResult = useMemo(() => getBrowserSupabaseClient(), []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveJob = async (formData: FormData) => {
    if (!supabaseResult.configured) {
      setError(supabaseResult.error.message);
      return;
    }

    setSaving(true);
    setError(null);
    const { data: authData, error: authError } = await supabaseResult.client.auth.getUser();
    if (authError || !authData.user) {
      setError("Your session expired. Sign in again before saving this job.");
      setSaving(false);
      return;
    }

    const getText = (key: string) => {
      const value = formData.get(key);
      return typeof value === "string" ? value.trim() : "";
    };
    const score = Math.min(100, Math.max(0, optionalNumber(formData.get("score")) ?? 0));
    const jobUrl = getText("jobUrl");
    const title = getText("title");
    const company = getText("company");
    const description = getText("description");

    try {
      const parsedJobUrl = new URL(jobUrl);
      if (parsedJobUrl.protocol !== "http:" && parsedJobUrl.protocol !== "https:") {
        throw new Error("Unsupported protocol");
      }
    } catch {
      setError("Enter the complete job URL, including https://.");
      setSaving(false);
      return;
    }

    const { error: profileError } = await supabaseResult.client.from("profiles").upsert(
      {
        user_id: authData.user.id,
        full_name:
          typeof authData.user.user_metadata?.full_name === "string"
            ? authData.user.user_metadata.full_name
            : authData.user.email?.split("@")[0] ?? "ApplyFlow candidate",
        contact_email: authData.user.email ?? null,
      },
      { onConflict: "user_id", ignoreDuplicates: true },
    );

    if (profileError) {
      setError(profileError.message);
      setSaving(false);
      return;
    }

    const salaryMin = optionalNumber(formData.get("salaryMin"));
    const salaryMax = optionalNumber(formData.get("salaryMax"));
    if (salaryMin !== null && salaryMax !== null && salaryMin > salaryMax) {
      setError("The minimum salary cannot be greater than the maximum salary.");
      setSaving(false);
      return;
    }
    const salaryCurrency = getText("salaryCurrency").toUpperCase();
    if (salaryCurrency && !/^[A-Z]{3}$/.test(salaryCurrency)) {
      setError("Use a three-letter currency code such as PHP or USD.");
      setSaving(false);
      return;
    }

    const { data: savedJob, error: jobError } = await supabaseResult.client
      .from("jobs")
      .insert({
        user_id: authData.user.id,
        source: getText("source") || "Manual review",
        source_url: jobUrl,
        company_name: company,
        title,
        location_text: getText("location") || null,
        work_arrangement: (getText("workArrangement") || null) as WorkArrangement | null,
        employment_type: (getText("employmentType") || null) as EmploymentType | null,
        description,
        salary_min: salaryMin,
        salary_max: salaryMax,
        salary_currency: salaryCurrency || null,
        salary_period: (getText("salaryPeriod") || null) as SalaryPeriod | null,
        disposition: "new",
        raw_payload: {
          applyflow: {
            version: 1,
            sample: false,
            entryMethod: "manual",
          },
        },
      })
      .select("id")
      .single();

    if (jobError || !savedJob) {
      setError(
        jobError?.code === "23505"
          ? "This job URL is already in your workspace."
          : jobError?.message ?? "The job could not be saved.",
      );
      setSaving(false);
      return;
    }

    const matchedSkills = commaList(formData.get("matchedSkills"));
    const gaps = commaList(formData.get("gaps"));
    const rationale =
      getText("rationale") ||
      "This manually captured role is waiting for a complete requirement review.";
    const { data: savedMatch, error: matchError } = await supabaseResult.client
      .from("job_matches")
      .insert({
        user_id: authData.user.id,
        job_id: savedJob.id,
        score,
        recommendation: recommendation(score),
        rationale,
        strengths: matchedSkills,
        gaps,
        hard_blockers: [],
        requirement_analysis: [],
        model_name: "Candidate review",
        model_version: "manual-1",
      })
      .select("id")
      .single();

    if (matchError || !savedMatch) {
      await supabaseResult.client.from("jobs").delete().eq("id", savedJob.id);
      setError(matchError?.message ?? "The job match record could not be created.");
      setSaving(false);
      return;
    }

    const { data: application, error: applicationError } = await supabaseResult.client
      .from("applications")
      .insert({
        user_id: authData.user.id,
        job_id: savedJob.id,
        match_id: savedMatch.id,
        status: "review_required",
        channel: "manual",
        field_values: { capturedFrom: jobUrl },
        missing_fields: [],
        requires_review: true,
      })
      .select("id")
      .single();

    if (applicationError || !application) {
      await supabaseResult.client.from("jobs").delete().eq("id", savedJob.id);
      setError(applicationError?.message ?? "The application record could not be created.");
      setSaving(false);
      return;
    }

    const { error: eventError } = await supabaseResult.client.from("application_events").insert({
      user_id: authData.user.id,
      application_id: application.id,
      event_type: "job_added",
      actor: "user",
      from_status: null,
      to_status: "review_required",
      message: `${title} at ${company} was added for review.`,
      metadata: { sourceUrl: jobUrl },
    });

    if (eventError) {
      await supabaseResult.client
        .from("jobs")
        .delete()
        .eq("user_id", authData.user.id)
        .eq("id", savedJob.id);
      setError(`The job was not saved because its audit event failed: ${eventError.message}`);
      setSaving(false);
      return;
    }

    router.push("/?savedJob=1");
    router.refresh();
  };

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.brand}><span>AF</span> ApplyFlow</Link>
          <Link href="/" className={styles.back}><ArrowLeft size={15} /> Dashboard</Link>
        </header>

        <section className={styles.hero}>
          <div className={styles.heroIcon}><BriefcaseBusiness size={21} /></div>
          <p>Capture a real opportunity</p>
          <h1>Add a job for review.</h1>
          <span>Save the listing, record your initial fit assessment, and keep every application decision in one private audit trail.</span>
        </section>

        <form action={(formData) => void saveJob(formData)} className={styles.form}>
          <div className={styles.sectionHeading}>
            <span>01 - Listing</span>
            <h2>Where did you find it?</h2>
          </div>
          <div className={styles.grid}>
            <label className={styles.wide}><span>Job URL</span><input type="url" name="jobUrl" placeholder="https://company.com/careers/role" required /></label>
            <label><span>Company</span><input name="company" required /></label>
            <label><span>Job title</span><input name="title" required /></label>
            <label><span>Source</span><input name="source" defaultValue="Manual review" /></label>
            <label><span>Location</span><input name="location" placeholder="Remote - Philippines" /></label>
            <label><span>Work arrangement</span><select name="workArrangement" defaultValue="remote"><option value="remote">Remote</option><option value="hybrid">Hybrid</option><option value="onsite">Onsite</option><option value="flexible">Flexible</option></select></label>
            <label><span>Employment type</span><select name="employmentType" defaultValue="full_time"><option value="full_time">Full time</option><option value="part_time">Part time</option><option value="contract">Contract</option><option value="freelance">Freelance</option><option value="temporary">Temporary</option><option value="internship">Internship</option><option value="other">Other</option></select></label>
            <label className={styles.wide}><span>Job description</span><textarea name="description" rows={8} required /></label>
          </div>

          <div className={styles.sectionHeading}>
            <span>02 - Compensation</span>
            <h2>Record the advertised range.</h2>
          </div>
          <div className={styles.grid}>
            <label><span>Minimum</span><input type="number" min="0" step="0.01" name="salaryMin" /></label>
            <label><span>Maximum</span><input type="number" min="0" step="0.01" name="salaryMax" /></label>
            <label><span>Currency</span><input name="salaryCurrency" defaultValue="PHP" minLength={3} maxLength={3} /></label>
            <label><span>Period</span><select name="salaryPeriod" defaultValue="month"><option value="hour">Hour</option><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option><option value="year">Year</option></select></label>
          </div>

          <div className={styles.sectionHeading}>
            <span>03 - Your review</span>
            <h2>Keep the score transparent.</h2>
          </div>
          <div className={styles.grid}>
            <label><span>Manual fit score</span><input type="number" min="0" max="100" name="score" defaultValue="70" required /></label>
            <label><span>Matched skills, comma separated</span><input name="matchedSkills" placeholder="TypeScript, React, PostgreSQL" /></label>
            <label className={styles.wide}><span>Gaps, comma separated</span><input name="gaps" placeholder="AWS experience, schedule confirmation" /></label>
            <label className={styles.wide}><span>Why this score?</span><textarea name="rationale" rows={4} placeholder="Explain the evidence behind your initial fit score." /></label>
          </div>

          <p className={styles.notice}><ShieldCheck size={15} /> Saving a job does not apply or send anything. It creates a private review record only.</p>
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <div className={styles.footer}>
            <Link href="/">Cancel</Link>
            <button type="submit" disabled={saving}>{saving ? "Saving job" : "Save to review queue"}<ArrowRight size={16} /></button>
          </div>
        </form>
      </div>
    </main>
  );
}
