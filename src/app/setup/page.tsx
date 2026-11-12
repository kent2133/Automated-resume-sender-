"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Cloud,
  CloudOff,
  Download,
  FileJson,
  FileUp,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  candidateProfileFromProfileRow,
  candidateProfileToProfileInsert,
  createCandidateProfileDocument,
  emptyCandidateProfile,
  profileRowHasCandidateProfileDocument,
  restoreCandidateProfile,
  type CandidateProfile,
} from "@/lib/candidate-profile";
import type { Json } from "@/lib/database.types";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";
import styles from "./setup.module.css";

const steps = ["Identity", "Experience", "Preferences", "Answers and resume"] as const;

type ImportNotice = { tone: "success" | "error"; message: string } | null;
type SyncNotice = {
  state: "checking" | "local" | "synced" | "saving" | "error";
  message: string;
};

const localProfileKeyPrefix = "applyflow-setup";

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<CandidateProfile>(emptyCandidateProfile);
  const dataRef = useRef<CandidateProfile>(emptyCandidateProfile);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileReady, setProfileReady] = useState(false);
  const [importNotice, setImportNotice] = useState<ImportNotice>(null);
  const [syncNotice, setSyncNotice] = useState<SyncNotice>({
    state: "checking",
    message: "Checking for a signed-in Supabase profile.",
  });

  useEffect(() => {
    let active = true;
    let authTimer = 0;

    const supabase = getBrowserSupabaseClient();
    if (!supabase.configured) {
      return () => { active = false; };
    }

    const client = supabase.client;

    async function loadCloudProfile() {
      if (!active) return;

      try {
        const { data: userData, error: userError } = await client.auth.getUser();
        if (userError) throw userError;
        if (!userData.user) throw new Error("The signed-in account could not be verified");
        const localProfile = readLocalProfile(userData.user.id);

        const { data: row, error: profileError } = await client
          .from("profiles")
          .select("*")
          .eq("user_id", userData.user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!active) return;

        if (row) {
          const cloudProfile = candidateProfileFromProfileRow(row);
          const resolvedProfile = profileRowHasCandidateProfileDocument(row)
            ? cloudProfile
            : mergeLegacyCloudProfile(localProfile ?? emptyCandidateProfile, cloudProfile);
          dataRef.current = resolvedProfile;
          setData(resolvedProfile);
          persistLocalProfile(userData.user.id, resolvedProfile);
          setSyncNotice({
            state: "synced",
            message: profileRowHasCandidateProfileDocument(row)
              ? "Your secure Supabase profile is loaded and ready."
              : "Your account details were combined with this browser's local profile.",
          });
          return;
        }

        const initialProfile = localProfile ?? {
          ...emptyCandidateProfile,
          fullName:
            typeof userData.user.user_metadata?.full_name === "string"
              ? userData.user.user_metadata.full_name
              : "",
          email: userData.user.email ?? "",
        };
        dataRef.current = initialProfile;
        setData(initialProfile);

        setSyncNotice({
          state: "synced",
          message: "You are signed in. Save this setup to create your secure cloud profile.",
        });
      } catch (error: unknown) {
        if (!active) return;
        setSyncNotice({
          state: "error",
          message: `Cloud profile could not be loaded. Your account-scoped browser copy was not changed. ${errorMessage(error)}`,
        });
      } finally {
        if (active) setProfileReady(true);
      }
    }

    void loadCloudProfile();
    const { data: authListener } = client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        dataRef.current = emptyCandidateProfile;
        setData(emptyCandidateProfile);
        setProfileReady(false);
        router.replace("/auth/sign-in?next=/setup");
        router.refresh();
        return;
      }
      if (event !== "SIGNED_IN" && event !== "USER_UPDATED") return;
      dataRef.current = emptyCandidateProfile;
      setData(emptyCandidateProfile);
      setProfileReady(false);
      window.clearTimeout(authTimer);
      authTimer = window.setTimeout(() => void loadCloudProfile(), 0);
    });

    return () => {
      active = false;
      window.clearTimeout(authTimer);
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const readiness = useMemo(() => {
    const required = [
      data.firstName,
      data.lastName,
      data.fullName,
      data.email,
      data.location,
      data.currentTitle,
      data.currentEmployer,
      data.targetRoles,
      data.workMode,
      data.startAvailability,
      data.skillsSummary,
      data.resumeFileName,
    ];
    return Math.round((required.filter((value) => value.trim()).length / required.length) * 100);
  }, [data]);

  function update(key: keyof CandidateProfile, value: string) {
    setData((current) => {
      const nextData = { ...current, [key]: value };
      dataRef.current = nextData;
      return nextData;
    });
    setSaved(false);
  }

  async function next(event: FormEvent) {
    event.preventDefault();
    if (step < steps.length - 1) {
      setStep((current) => current + 1);
      return;
    }

    setIsSaving(true);
    setSaved(false);
    const supabase = getBrowserSupabaseClient();

    if (!supabase.configured) {
      setSyncNotice({
        state: "error",
        message: "Cloud sync is unavailable in this environment.",
      });
      setIsSaving(false);
      return;
    }

    setSyncNotice({ state: "saving", message: "Saving your browser backup and secure cloud profile." });

    try {
      const { data: userData, error: userError } = await supabase.client.auth.getUser();
      if (userError) throw userError;

      if (!userData.user) {
        throw new Error("The signed-in account could not be verified");
      }

      const localSaved = persistLocalProfile(userData.user.id, data);
      const { data: currentRow, error: currentError } = await supabase.client
        .from("profiles")
        .select("application_preferences,salary_preferences,schedule_preferences,work_eligibility,equipment_profile")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (currentError) throw currentError;

      const payload = candidateProfileToProfileInsert(data, userData.user.id);
      payload.application_preferences = mergeJsonObjects(
        currentRow?.application_preferences,
        payload.application_preferences,
      );
      payload.salary_preferences = mergeJsonObjects(
        currentRow?.salary_preferences,
        payload.salary_preferences,
      );
      payload.schedule_preferences = mergeJsonObjects(
        currentRow?.schedule_preferences,
        payload.schedule_preferences,
      );
      payload.work_eligibility = mergeJsonObjects(
        currentRow?.work_eligibility,
        payload.work_eligibility,
      );
      payload.equipment_profile = mergeJsonObjects(
        currentRow?.equipment_profile,
        payload.equipment_profile,
      );
      const { error: saveError } = await supabase.client
        .from("profiles")
        .upsert(payload, { onConflict: "user_id" });
      if (saveError) throw saveError;

      setSyncNotice({
        state: "synced",
        message: localSaved
          ? "Saved to Supabase and backed up in this browser."
          : "Saved to Supabase. This browser blocked the optional local backup.",
      });
      setSaved(true);
    } catch (error: unknown) {
      setSyncNotice({
        state: "error",
        message: `The profile could not be synced. ${errorMessage(error)}`,
      });
      setSaved(false);
    } finally {
      setIsSaving(false);
    }
  }

  async function importProfile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.item(0);
    if (!file) return;

    try {
      const restored = restoreCandidateProfile(JSON.parse(await file.text()));
      if (!restored) throw new Error("This JSON file is not an ApplyFlow candidate profile");
      dataRef.current = restored;
      setData(restored);
      setStep(0);
      setSaved(false);
      setImportNotice({ tone: "success", message: `${file.name} was imported. Save the setup to sync it.` });
    } catch (error: unknown) {
      setImportNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "The profile could not be imported",
      });
    } finally {
      input.value = "";
    }
  }

  function exportProfile() {
    const payload = JSON.stringify(createCandidateProfileDocument(data), null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "applyflow-private-profile.json";
    link.click();
    URL.revokeObjectURL(url);
    setImportNotice({ tone: "success", message: "A private profile copy was downloaded to this device." });
  }

  return (
    <main className={styles.page}>
      <aside className={styles.sidebar}>
        <Link href="/" className={styles.brand}><span>AF</span>ApplyFlow</Link>
        <div className={styles.progressIntro}>
          <p>Private setup</p>
          <strong>{readiness}% ready</strong>
          <div><span style={{ width: `${readiness}%` }} /></div>
        </div>
        <ol className={styles.steps}>
          {steps.map((label, index) => (
            <li key={label} className={index === step ? styles.stepActive : index < step ? styles.stepDone : undefined}>
              <button type="button" onClick={() => setStep(index)}>
                <span>{index < step ? <Check size={14} /> : String(index + 1).padStart(2, "0")}</span>
                <div><strong>{label}</strong><small>{stepDescription(index)}</small></div>
              </button>
            </li>
          ))}
        </ol>
        <p className={styles.sidebarNote}><ShieldCheck size={15} /> Profile data is backed up locally. Signed-in users also get private Supabase sync. Resume bytes are not uploaded from this setup form.</p>
      </aside>

      <section className={styles.content}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.back}><ArrowLeft size={16} /> Dashboard</Link>
          <span>Step {step + 1} of {steps.length}</span>
        </header>

        {!profileReady ? (
          <div className={styles.loadingProfile} role="status">
            <LoaderCircle className={styles.syncSpinner} size={22} />
            <div><strong>Loading your private profile</strong><span>Checking your account and secure cloud copy.</span></div>
          </div>
        ) : <form className={styles.form} onSubmit={next}>
          <div className={styles.formHeading}>
            <p>{steps[step]}</p>
            <h1>{stepTitle(step)}</h1>
            <span>{stepLead(step)}</span>
          </div>

          <div className={styles.profileTools}>
            <label className={styles.importButton}>
              <FileJson size={17} /> Import private JSON
              <input type="file" accept="application/json,.json" onChange={importProfile} />
            </label>
            <button className={styles.exportButton} type="button" onClick={exportProfile}>
              <Download size={17} /> Export private JSON
            </button>
            <p><ShieldCheck size={15} /> Use the same JSON file in the Chrome extension. It contains personal data, so keep it private.</p>
            <SyncStatus notice={syncNotice} />
          </div>

          {importNotice ? (
            <div className={importNotice.tone === "success" ? styles.importSuccess : styles.importError} role="status">
              {importNotice.message}
            </div>
          ) : null}

          {step === 0 ? (
            <div className={styles.fieldGrid}>
              <Field label="First name" value={data.firstName} onChange={(value) => update("firstName", value)} required />
              <Field label="Middle name" value={data.middleName} onChange={(value) => update("middleName", value)} />
              <Field label="Middle initial" value={data.middleInitial} onChange={(value) => update("middleInitial", value)} />
              <Field label="Last name" value={data.lastName} onChange={(value) => update("lastName", value)} required />
              <Field label="Full legal name" value={data.fullName} onChange={(value) => update("fullName", value)} required wide />
              <Field label="Email" type="email" value={data.email} onChange={(value) => update("email", value)} required />
              <Field label="Phone" type="tel" value={data.phone} onChange={(value) => update("phone", value)} />
              <Field label="Location" value={data.location} onChange={(value) => update("location", value)} required />
              <Field label="Portfolio URL" type="url" value={data.portfolioUrl} onChange={(value) => update("portfolioUrl", value)} />
              <Field label="LinkedIn URL" type="url" value={data.linkedinUrl} onChange={(value) => update("linkedinUrl", value)} />
              <Field label="GitHub URL" type="url" value={data.githubUrl} onChange={(value) => update("githubUrl", value)} wide />
            </div>
          ) : null}

          {step === 1 ? (
            <div className={styles.fieldGrid}>
              <Field label="Current title" value={data.currentTitle} onChange={(value) => update("currentTitle", value)} required />
              <Field label="Current employer" value={data.currentEmployer} onChange={(value) => update("currentEmployer", value)} required />
              <Field label="Concurrent or project title" value={data.secondaryTitle} onChange={(value) => update("secondaryTitle", value)} />
              <Field label="Concurrent or project employer" value={data.secondaryEmployer} onChange={(value) => update("secondaryEmployer", value)} />
              <Field label="Work history summary" value={data.workHistorySummary} onChange={(value) => update("workHistorySummary", value)} wide multiline />
              <Field label="Education summary" value={data.educationSummary} onChange={(value) => update("educationSummary", value)} wide multiline />
              <Field label="Credentials summary" value={data.credentialsSummary} onChange={(value) => update("credentialsSummary", value)} wide />
              <Field label="Languages" value={data.languagesSummary} onChange={(value) => update("languagesSummary", value)} wide />
              <Field label="Years of experience" value={data.yearsExperience} onChange={(value) => update("yearsExperience", value)} />
              <Field label="Target roles" value={data.targetRoles} onChange={(value) => update("targetRoles", value)} required wide />
              <Field label="Skills summary" value={data.skillsSummary} onChange={(value) => update("skillsSummary", value)} required wide multiline />
              <Field label="AI-assisted development preference" value={data.aiAssistedWorkPreference} onChange={(value) => update("aiAssistedWorkPreference", value)} wide />
            </div>
          ) : null}

          {step === 2 ? (
            <div className={styles.fieldGrid}>
              <Field label="PHP hard monthly minimum" type="number" value={data.minimumMonthlySalaryPhp} onChange={(value) => update("minimumMonthlySalaryPhp", value)} />
              <Field label="PHP preferred monthly salary" type="number" value={data.preferredMonthlySalaryPhp} onChange={(value) => update("preferredMonthlySalaryPhp", value)} />
              <Field label="USD hard monthly minimum" type="number" value={data.minimumMonthlySalaryUsd} onChange={(value) => update("minimumMonthlySalaryUsd", value)} />
              <Field label="Salary answer shown for review" value={data.desiredSalary} onChange={(value) => update("desiredSalary", value)} />
              <SelectField label="Work mode" value={data.workMode} onChange={(value) => update("workMode", value)} options={["Remote only", "Remote or hybrid", "Hybrid", "On-site"]} />
              <Field label="Shift availability" value={data.shiftAvailability} onChange={(value) => update("shiftAvailability", value)} />
              <Field label="Start availability" value={data.startAvailability} onChange={(value) => update("startAvailability", value)} required />
              <Field label="Timezone availability" value={data.timezoneAvailability} onChange={(value) => update("timezoneAvailability", value)} />
              <Field label="Primary equipment" value={data.equipmentSummary} onChange={(value) => update("equipmentSummary", value)} wide multiline />
              <Field label="Internet connection" value={data.internetSummary} onChange={(value) => update("internetSummary", value)} />
              <Field label="Backup power" value={data.backupPowerSummary} onChange={(value) => update("backupPowerSummary", value)} />
              <Field label="Backup device" value={data.backupDeviceSummary} onChange={(value) => update("backupDeviceSummary", value)} wide />
            </div>
          ) : null}

          {step === 3 ? (
            <div className={styles.answerList}>
              <Field label="Work authorization" value={data.workAuthorization} onChange={(value) => update("workAuthorization", value)} wide />
              <Field label="Sponsorship" value={data.sponsorship} onChange={(value) => update("sponsorship", value)} wide />
              <Field label="Passport availability" value={data.passportAvailability} onChange={(value) => update("passportAvailability", value)} wide />
              <Field label="Reusable short answer" value={data.reusableShortAnswer} onChange={(value) => update("reusableShortAnswer", value)} wide multiline />
              <Field label="Cover letter starter" value={data.coverLetter} onChange={(value) => update("coverLetter", value)} wide multiline />
              <div className={styles.policyCard}>
                <Sparkles size={18} />
                <div><strong>Legal answers stay manual</strong><p>Passport availability does not prove work authorization. ApplyFlow leaves authorization and sponsorship questions for review on each job.</p></div>
              </div>
              <div className={styles.resumeArea}>
                <label className={styles.uploadBox}>
                  <FileUp size={25} />
                  <strong>{data.resumeFileName || "Choose your master resume"}</strong>
                  <span>PDF only. Maximum recommended size is 5 MB.</span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    required={!data.resumeFileName}
                    onChange={(event) => update("resumeFileName", event.target.files?.[0]?.name ?? "")}
                  />
                </label>
                <p className={styles.resumeNote}>The browser demo remembers only the filename. Select the real PDF again inside the extension when attaching it to a supported application.</p>
                {saved ? (
                  <div className={styles.savedMessage}><Check size={18} /><span><strong>Setup saved.</strong> {syncNotice.message}</span></div>
                ) : null}
              </div>
            </div>
          ) : null}

          <footer className={styles.formFooter}>
            <button type="button" className={styles.secondary} onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>
              Back
            </button>
            <button type="submit" className={styles.primary} disabled={isSaving}>
              {isSaving ? "Saving..." : step === steps.length - 1 ? "Save private setup" : "Continue"} <ArrowRight size={16} />
            </button>
          </footer>
        </form>}
      </section>
    </main>
  );
}

function SyncStatus({ notice }: { notice: SyncNotice }) {
  const icon = notice.state === "checking" || notice.state === "saving"
    ? <LoaderCircle className={styles.syncSpinner} size={17} />
    : notice.state === "synced"
      ? <Cloud size={17} />
      : notice.state === "error"
        ? <AlertTriangle size={17} />
        : <CloudOff size={17} />;
  const title = notice.state === "checking"
    ? "Checking sync"
    : notice.state === "saving"
      ? "Syncing securely"
      : notice.state === "synced"
        ? "Cloud sync ready"
        : notice.state === "error"
          ? "Sync needs attention"
          : "Local backup mode";

  return (
    <div className={`${styles.syncStatus} ${styles[`sync${notice.state}`]}`} role="status" aria-live="polite">
      {icon}
      <span><strong>{title}</strong>{notice.message}</span>
    </div>
  );
}

function accountLocalProfileKey(userId: string) {
  return `${localProfileKeyPrefix}:${userId}`;
}

function readLocalProfile(userId: string) {
  try {
    const stored = window.localStorage.getItem(accountLocalProfileKey(userId));
    return stored ? restoreCandidateProfile(JSON.parse(stored)) : null;
  } catch {
    return null;
  }
}

function persistLocalProfile(userId: string, profile: CandidateProfile) {
  try {
    window.localStorage.setItem(accountLocalProfileKey(userId), JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

function jsonObject(value: Json | undefined): Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value
    : {};
}

function mergeJsonObjects(existing: Json | undefined, next: Json | undefined): Json {
  return { ...jsonObject(existing), ...jsonObject(next) };
}

function mergeLegacyCloudProfile(local: CandidateProfile, cloud: CandidateProfile) {
  const merged = { ...local };
  for (const key of Object.keys(emptyCandidateProfile) as Array<keyof CandidateProfile>) {
    if (cloud[key].trim() && (cloud[key] !== emptyCandidateProfile[key] || !local[key].trim())) {
      merged[key] = cloud[key];
    }
  }
  return merged;
}

function errorMessage(error: unknown) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : "Please try again after checking your connection.";
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  wide = false,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  wide?: boolean;
  multiline?: boolean;
}) {
  return (
    <label className={wide ? styles.fieldWide : styles.field}>
      <span>{label}</span>
      {multiline ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} required={required} />
      ) : (
        <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
      )}
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function stepDescription(index: number) {
  return ["Legal name and contact", "Current work and skills", "Filters and remote readiness", "Reviewed text and private PDF"][index];
}

function stepTitle(index: number) {
  return [
    "Start with verified identity details.",
    "Describe the work you can prove.",
    "Set hard filters before searching.",
    "Prepare answers without guessing.",
  ][index];
}

function stepLead(index: number) {
  return [
    "These values become the source for safe contact fields in supported applications.",
    "Current and project-based roles can exist together without hiding either one.",
    "Separate PHP and USD floors prevent a currency conversion from weakening your minimum.",
    "Sensitive legal answers remain manual while reusable professional answers stay ready to copy.",
  ][index];
}
