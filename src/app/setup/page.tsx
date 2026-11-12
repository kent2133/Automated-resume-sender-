"use client";

import { ArrowLeft, ArrowRight, Check, FileUp, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import styles from "./setup.module.css";

type SetupState = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  portfolioUrl: string;
  linkedInUrl: string;
  githubUrl: string;
  targetRoles: string;
  minimumSalary: string;
  workMode: string;
  authorization: string;
  sponsorship: string;
  noticePeriod: string;
  resumeName: string;
};

const emptySetup: SetupState = {
  fullName: "",
  email: "",
  phone: "",
  location: "Philippines",
  portfolioUrl: "",
  linkedInUrl: "",
  githubUrl: "",
  targetRoles: "Full-stack developer, frontend developer",
  minimumSalary: "",
  workMode: "Remote or hybrid",
  authorization: "Review each time",
  sponsorship: "Review each time",
  noticePeriod: "Immediately available",
  resumeName: "",
};

const steps = ["Profile", "Preferences", "Answer vault", "Resume"] as const;

export default function SetupPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<SetupState>(emptySetup);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let frame = 0;
    try {
      const stored = window.localStorage.getItem("applyflow-setup");
      if (stored) {
        const restored = { ...emptySetup, ...JSON.parse(stored) as Partial<SetupState> };
        frame = window.requestAnimationFrame(() => setData(restored));
      }
    } catch {
      // The setup remains usable without browser storage.
    }
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const readiness = useMemo(() => {
    const required = [data.fullName, data.email, data.location, data.targetRoles, data.workMode, data.resumeName];
    return Math.round(required.filter((value) => value.trim()).length / required.length * 100);
  }, [data]);

  function update(key: keyof SetupState, value: string) {
    setData((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function next(event: FormEvent) {
    event.preventDefault();
    if (step < steps.length - 1) {
      setStep((current) => current + 1);
      return;
    }

    try {
      window.localStorage.setItem("applyflow-setup", JSON.stringify(data));
    } catch {
      // A success state is still shown if storage is unavailable.
    }
    setSaved(true);
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
        <p className={styles.sidebarNote}><ShieldCheck size={15} /> Resume bytes are not stored in this browser demo.</p>
      </aside>

      <section className={styles.content}>
        <header className={styles.topbar}>
          <Link href="/" className={styles.back}><ArrowLeft size={16} /> Dashboard</Link>
          <span>Step {step + 1} of {steps.length}</span>
        </header>

        <form className={styles.form} onSubmit={next}>
          <div className={styles.formHeading}>
            <p>{steps[step]}</p>
            <h1>{stepTitle(step)}</h1>
            <span>{stepLead(step)}</span>
          </div>

          {step === 0 ? (
            <div className={styles.fieldGrid}>
              <Field label="Full name" value={data.fullName} onChange={(value) => update("fullName", value)} required />
              <Field label="Email" type="email" value={data.email} onChange={(value) => update("email", value)} required />
              <Field label="Phone" type="tel" value={data.phone} onChange={(value) => update("phone", value)} />
              <Field label="Location" value={data.location} onChange={(value) => update("location", value)} required />
              <Field label="Portfolio URL" type="url" value={data.portfolioUrl} onChange={(value) => update("portfolioUrl", value)} />
              <Field label="LinkedIn URL" type="url" value={data.linkedInUrl} onChange={(value) => update("linkedInUrl", value)} />
              <Field label="GitHub URL" type="url" value={data.githubUrl} onChange={(value) => update("githubUrl", value)} wide />
            </div>
          ) : null}

          {step === 1 ? (
            <div className={styles.fieldGrid}>
              <Field label="Target roles" value={data.targetRoles} onChange={(value) => update("targetRoles", value)} required wide />
              <Field label="Minimum monthly salary" type="number" value={data.minimumSalary} onChange={(value) => update("minimumSalary", value)} />
              <SelectField label="Preferred work mode" value={data.workMode} onChange={(value) => update("workMode", value)} options={["Remote", "Hybrid", "On-site", "Remote or hybrid"]} />
              <Field label="Availability" value={data.noticePeriod} onChange={(value) => update("noticePeriod", value)} wide />
            </div>
          ) : null}

          {step === 2 ? (
            <div className={styles.answerList}>
              <SelectField
                label="Work authorization"
                value={data.authorization}
                onChange={(value) => update("authorization", value)}
                options={["Review each time", "Authorized to work", "Not authorized"]}
              />
              <SelectField
                label="Sponsorship requirement"
                value={data.sponsorship}
                onChange={(value) => update("sponsorship", value)}
                options={["Review each time", "No sponsorship required", "Sponsorship required"]}
              />
              <div className={styles.policyCard}>
                <Sparkles size={18} />
                <div><strong>No guessed answers</strong><p>Questions without a verified answer will be highlighted and left empty for review.</p></div>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className={styles.resumeArea}>
              <label className={styles.uploadBox}>
                <FileUp size={25} />
                <strong>{data.resumeName || "Choose your master resume"}</strong>
                <span>PDF only. Maximum recommended size is 5 MB.</span>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  required={!data.resumeName}
                  onChange={(event) => update("resumeName", event.target.files?.[0]?.name ?? "")}
                />
              </label>
              <p className={styles.resumeNote}>The browser demo remembers only the filename. The configured app uploads the PDF directly to your private Supabase Storage bucket.</p>
              {saved ? (
                <div className={styles.savedMessage}><Check size={18} /><span><strong>Setup saved.</strong> Your browser demo profile is ready for the review queue.</span></div>
              ) : null}
            </div>
          ) : null}

          <footer className={styles.formFooter}>
            <button type="button" className={styles.secondary} onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>
              Back
            </button>
            <button type="submit" className={styles.primary}>
              {step === steps.length - 1 ? "Save private setup" : "Continue"} <ArrowRight size={16} />
            </button>
          </footer>
        </form>
      </section>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  wide = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  wide?: boolean;
}) {
  return (
    <label className={wide ? styles.fieldWide : styles.field}>
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
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
  return ["Contact and links", "Roles and filters", "Verified reusable facts", "Private PDF version"][index];
}

function stepTitle(index: number) {
  return ["Start with the facts only you can verify.", "Define what a good opportunity looks like.", "Decide what ApplyFlow may reuse.", "Add the resume you want employers to receive."][index];
}

function stepLead(index: number) {
  return [
    "These values become the source for safe contact fields in supported applications.",
    "Hard filters keep low-quality or irrelevant jobs out of your review queue.",
    "Sensitive decisions stay reviewable even when a field match is certain.",
    "Resume versions stay traceable so every application records the exact PDF sent.",
  ][index];
}
