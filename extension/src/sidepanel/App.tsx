import { useEffect, useMemo, useState } from "react";
import { DEMO_PROFILE } from "../core/profile";
import { validateResumeBytes, validateResumeMetadata } from "../core/resume";
import {
  createCandidateProfileDocument,
  isCandidateProfileDocument,
  isDemoProfile,
  isFillReport,
  isRuntimeResponse,
  isScanReport,
  isResumeAttachReport,
  isSitePolicy,
  type DemoProfile,
  type FillReport,
  type PanelRequest,
  type ResumeAttachReport,
  type ScanReport,
  type ScannedField,
  type SitePolicy,
} from "../shared/contracts";

type Notice = { tone: "success" | "error" | "info"; message: string } | null;

async function sendRequest<T>(request: PanelRequest): Promise<T> {
  const response: unknown = await chrome.runtime.sendMessage(request);
  if (!isRuntimeResponse(response)) throw new Error("The extension returned an invalid response");
  if (!response.ok) throw new Error(response.error);
  return response.data as T;
}

const profileFields: Array<{ key: keyof DemoProfile; label: string; wide?: boolean; multiline?: boolean }> = [
  { key: "firstName", label: "First name" },
  { key: "middleName", label: "Middle name" },
  { key: "middleInitial", label: "Middle initial" },
  { key: "lastName", label: "Last name" },
  { key: "fullName", label: "Full name", wide: true },
  { key: "email", label: "Email", wide: true },
  { key: "phone", label: "Phone", wide: true },
  { key: "location", label: "Location", wide: true },
  { key: "portfolioUrl", label: "Portfolio URL", wide: true },
  { key: "linkedinUrl", label: "LinkedIn URL", wide: true },
  { key: "githubUrl", label: "GitHub URL", wide: true },
  { key: "yearsExperience", label: "Years of experience" },
  { key: "currentTitle", label: "Current title" },
  { key: "currentEmployer", label: "Current employer", wide: true },
  { key: "secondaryTitle", label: "Project title" },
  { key: "secondaryEmployer", label: "Project employer", wide: true },
  { key: "workHistorySummary", label: "Work history summary", wide: true, multiline: true },
  { key: "educationSummary", label: "Education summary", wide: true, multiline: true },
  { key: "credentialsSummary", label: "Credentials summary", wide: true },
  { key: "languagesSummary", label: "Languages", wide: true },
  { key: "targetRoles", label: "Target roles", wide: true },
  { key: "skillsSummary", label: "Skills summary", wide: true, multiline: true },
  { key: "aiAssistedWorkPreference", label: "AI-assisted work preference", wide: true },
  { key: "minimumMonthlySalaryPhp", label: "PHP hard monthly minimum" },
  { key: "preferredMonthlySalaryPhp", label: "PHP preferred monthly salary" },
  { key: "minimumMonthlySalaryUsd", label: "USD hard monthly minimum" },
  { key: "desiredSalary", label: "Salary answer for manual review", wide: true },
  { key: "workMode", label: "Work mode" },
  { key: "shiftAvailability", label: "Shift availability" },
  { key: "startAvailability", label: "Start availability" },
  { key: "timezoneAvailability", label: "Timezone availability" },
  { key: "workAuthorization", label: "Work authorization", wide: true },
  { key: "sponsorship", label: "Sponsorship", wide: true },
  { key: "passportAvailability", label: "Passport availability", wide: true },
  { key: "equipmentSummary", label: "Primary equipment", wide: true, multiline: true },
  { key: "internetSummary", label: "Internet" },
  { key: "backupPowerSummary", label: "Backup power", wide: true },
  { key: "backupDeviceSummary", label: "Backup device", wide: true },
  { key: "reusableShortAnswer", label: "Reusable short answer", wide: true, multiline: true },
  { key: "coverLetter", label: "Cover letter starter", wide: true, multiline: true },
  { key: "resumeFileName", label: "Resume file for manual upload", wide: true },
];

function buildManualCompanionSnippets(profile: DemoProfile): string {
  return [
    "Prepared profile",
    `First name: ${profile.firstName}`,
    `Middle name: ${profile.middleName}`,
    `Middle initial: ${profile.middleInitial}`,
    `Last name: ${profile.lastName}`,
    `Full name: ${profile.fullName}`,
    `Email: ${profile.email}`,
    `Phone: ${profile.phone}`,
    `Location: ${profile.location}`,
    `Portfolio: ${profile.portfolioUrl}`,
    `LinkedIn: ${profile.linkedinUrl}`,
    `GitHub: ${profile.githubUrl}`,
    `Years of experience: ${profile.yearsExperience}`,
    `Current role: ${profile.currentTitle} at ${profile.currentEmployer}`,
    `Project role: ${profile.secondaryTitle} at ${profile.secondaryEmployer}`,
    `Work history: ${profile.workHistorySummary}`,
    `Education: ${profile.educationSummary}`,
    `Credentials: ${profile.credentialsSummary}`,
    `Languages: ${profile.languagesSummary}`,
    `Target roles: ${profile.targetRoles}`,
    `Skills: ${profile.skillsSummary}`,
    `Work mode: ${profile.workMode}`,
    `Shift availability: ${profile.shiftAvailability}`,
    `Start availability: ${profile.startAvailability}`,
    `Timezone availability: ${profile.timezoneAvailability}`,
    `PHP hard monthly minimum: ${profile.minimumMonthlySalaryPhp}`,
    `PHP preferred monthly salary: ${profile.preferredMonthlySalaryPhp}`,
    `USD hard monthly minimum: ${profile.minimumMonthlySalaryUsd}`,
    `Desired salary answer: ${profile.desiredSalary}`,
    `Work authorization: ${profile.workAuthorization}`,
    `Sponsorship: ${profile.sponsorship}`,
    `Passport: ${profile.passportAvailability}`,
    `Equipment: ${profile.equipmentSummary}`,
    `Internet: ${profile.internetSummary}`,
    `Backup power: ${profile.backupPowerSummary}`,
    `Backup device: ${profile.backupDeviceSummary}`,
    `Resume file: ${profile.resumeFileName}`,
    "",
    "Reusable short answer",
    profile.reusableShortAnswer,
    "",
    "Cover letter starter",
    profile.coverLetter,
  ].join("\n");
}

async function requestSitePolicy(): Promise<SitePolicy> {
  const result = await sendRequest<unknown>({ type: "GET_SITE_POLICY" });
  if (!isSitePolicy(result)) throw new Error("The current page policy was incomplete");
  return result;
}

function FieldRow({ field, onHighlight }: { field: ScannedField; onHighlight: (id: string) => void }) {
  const confidence = Math.round(field.confidence * 100);
  return (
    <button className={`field-row field-row-${field.status}`} onClick={() => onHighlight(field.id)} type="button">
      <span className="field-state" aria-hidden="true" />
      <span className="field-copy">
        <strong>{field.label}</strong>
        <small>{field.sensitiveReason ?? field.reason}</small>
      </span>
      <span className="field-score">{field.status === "blocked" ? "Blocked" : field.status === "manual" ? "Manual" : `${confidence}%`}</span>
    </button>
  );
}

export function App() {
  const [profile, setProfile] = useState<DemoProfile>(DEMO_PROFILE);
  const [scan, setScan] = useState<ScanReport | null>(null);
  const [fillReport, setFillReport] = useState<FillReport | null>(null);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [selectedResume, setSelectedResume] = useState<File | null>(null);
  const [resumeResult, setResumeResult] = useState<ResumeAttachReport | null>(null);
  const [resumePickerKey, setResumePickerKey] = useState(0);
  const [profilePickerKey, setProfilePickerKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [sitePolicy, setSitePolicy] = useState<SitePolicy | null>(null);

  const fields = useMemo(() => fillReport?.fields ?? scan?.fields ?? [], [fillReport?.fields, scan?.fields]);
  const manualCompanionMode = sitePolicy?.mode === "manual-companion";
  const manualCompanionSnippets = useMemo(() => buildManualCompanionSnippets(profile), [profile]);
  const groupedFields = useMemo(
    () => ({
      ready: fields.filter((field) => field.status === "ready" || field.status === "filled"),
      manual: fields.filter((field) => field.status === "manual" || field.status === "unmatched"),
      blocked: fields.filter((field) => field.status === "blocked"),
    }),
    [fields],
  );

  useEffect(() => {
    void sendRequest<unknown>({ type: "GET_PROFILE" })
      .then((stored) => {
        if (isDemoProfile(stored)) setProfile(stored);
      })
      .catch(() => setNotice({ tone: "info", message: "Using the safe local demo profile" }));
  }, []);

  useEffect(() => {
    void requestSitePolicy()
      .then(setSitePolicy)
      .catch((error: unknown) =>
        setNotice({
          tone: "info",
          message: error instanceof Error ? error.message : "The current page is unavailable",
        }),
      );
  }, []);

  async function runAction(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    setNotice(null);
    try {
      await action();
    } catch (error: unknown) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Something went wrong" });
    } finally {
      setBusy(false);
    }
  }

  async function refreshSitePolicy(): Promise<SitePolicy> {
    const currentPolicy = await requestSitePolicy();
    setSitePolicy(currentPolicy);
    if (!currentPolicy.automationAllowed) {
      setScan(null);
      setFillReport(null);
      setReviewConfirmed(false);
      setSelectedResume(null);
      setResumeResult(null);
      setResumePickerKey((current) => current + 1);
    }
    return currentPolicy;
  }

  function handleScan(): void {
    void runAction(async () => {
      const currentPolicy = await refreshSitePolicy();
      if (!currentPolicy.automationAllowed) {
        setNotice({ tone: "info", message: currentPolicy.message });
        return;
      }
      const result = await sendRequest<unknown>({ type: "SCAN_PAGE" });
      if (!isScanReport(result)) throw new Error("The page scan returned incomplete data");
      setScan(result);
      setFillReport(null);
      setReviewConfirmed(false);
      setNotice({ tone: "success", message: `Found ${result.fields.length} application fields` });
    });
  }

  function handleFill(): void {
    if (!reviewConfirmed) return;
    void runAction(async () => {
      const currentPolicy = await refreshSitePolicy();
      if (!currentPolicy.automationAllowed) {
        setNotice({ tone: "info", message: currentPolicy.message });
        return;
      }
      const result = await sendRequest<unknown>({ type: "FILL_FIELDS", profile, reviewConfirmed: true });
      if (!isFillReport(result)) throw new Error("The fill report returned incomplete data");
      setFillReport(result);
      setNotice({ tone: "success", message: result.message });
    });
  }

  function handleSaveProfile(): void {
    void runAction(async () => {
      await sendRequest({ type: "SAVE_PROFILE", profile });
      setNotice({ tone: "success", message: "Profile saved in this browser only" });
    });
  }

  function handleImportProfile(file: File | null): void {
    if (!file) return;
    void runAction(async () => {
      try {
        const parsed: unknown = JSON.parse(await file.text());
        if (!isCandidateProfileDocument(parsed)) {
          throw new Error("Choose a version 1 ApplyFlow private profile JSON file");
        }
        await sendRequest({ type: "SAVE_PROFILE", profile: parsed.profile });
        setProfile(parsed.profile);
        setNotice({ tone: "success", message: `${file.name} was imported and saved locally` });
      } finally {
        setProfilePickerKey((current) => current + 1);
      }
    });
  }

  function handleExportProfile(): void {
    const payload = JSON.stringify(createCandidateProfileDocument(profile), null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "applyflow-private-profile.json";
    link.click();
    URL.revokeObjectURL(url);
    setNotice({ tone: "success", message: "Private profile exported to this device" });
  }

  function handleResumeSelection(file: File | null): void {
    setResumeResult(null);
    if (!file) {
      setSelectedResume(null);
      return;
    }
    const error = validateResumeMetadata(file);
    if (error) {
      setSelectedResume(null);
      setResumePickerKey((current) => current + 1);
      setNotice({ tone: "error", message: error });
      return;
    }
    setSelectedResume(file);
    setNotice({ tone: "info", message: `${file.name} is ready to attach to this page` });
  }

  function handleAttachResume(): void {
    if (!selectedResume) return;
    const file = selectedResume;
    void runAction(async () => {
      let bytes: number[] = [];
      try {
        const currentPolicy = await refreshSitePolicy();
        if (!currentPolicy.automationAllowed) {
          setNotice({ tone: "info", message: currentPolicy.message });
          return;
        }
        const buffer = await file.arrayBuffer();
        bytes = Array.from(new Uint8Array(buffer));
        const validationError = validateResumeBytes(bytes);
        if (validationError) throw new Error(validationError);
        const result = await sendRequest<unknown>({
          type: "ATTACH_RESUME",
          fileName: file.name,
          mimeType: "application/pdf",
          bytes,
        });
        if (!isResumeAttachReport(result)) throw new Error("The resume attachment report was incomplete");
        setResumeResult(result);
        setNotice({ tone: result.attached ? "success" : "info", message: result.message });
      } finally {
        bytes.fill(0);
        setSelectedResume(null);
        setResumePickerKey((current) => current + 1);
      }
    });
  }

  function handleHighlight(fieldId: string): void {
    void refreshSitePolicy()
      .then((currentPolicy) => {
        if (!currentPolicy.automationAllowed) {
          setNotice({ tone: "info", message: currentPolicy.message });
          return;
        }
        return sendRequest({ type: "HIGHLIGHT_FIELD", fieldId });
      })
      .catch((error: unknown) =>
        setNotice({ tone: "error", message: error instanceof Error ? error.message : "Field not found" }),
      );
  }

  function handleClearHighlights(): void {
    void refreshSitePolicy()
      .then((currentPolicy) => {
        if (!currentPolicy.automationAllowed) {
          setNotice({ tone: "info", message: currentPolicy.message });
          return;
        }
        return sendRequest({ type: "CLEAR_HIGHLIGHTS" });
      })
      .catch((error: unknown) =>
        setNotice({ tone: "error", message: error instanceof Error ? error.message : "Marks could not be cleared" }),
      );
  }

  function handleCopyManualSnippets(): void {
    void runAction(async () => {
      await navigator.clipboard.writeText(manualCompanionSnippets);
      setNotice({ tone: "success", message: "Prepared profile and answer snippets copied" });
    });
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-mark">AF</div>
        <div>
          <p className="eyebrow">APPLICATION COPILOT</p>
          <h1>ApplyFlow</h1>
        </div>
        <span className="demo-badge">{manualCompanionMode ? "Manual mode" : "Local only"}</span>
      </header>

      <section className="hero-card">
        <div className="hero-grid" aria-hidden="true" />
        {manualCompanionMode ? (
          <>
            <p className="eyebrow accent">MANUAL COMPANION MODE</p>
            <h2>Prepare here. Enter everything yourself.</h2>
            <p>ApplyFlow keeps page automation off on OnlineJobs.ph while your local profile remains available.</p>
          </>
        ) : (
          <>
        <p className="eyebrow accent">REVIEW-FIRST AUTOFILL</p>
        <h2>Match the form. Keep the final decision yours.</h2>
        <p>ApplyFlow maps safe profile data, flags sensitive questions, and leaves every final Submit button untouched.</p>
        <button className="primary-button" disabled={busy} onClick={handleScan} type="button">
          <span>{sitePolicy === null ? "Check current page" : busy ? "Working..." : scan ? "Scan again" : "Scan this page"}</span>
          <span aria-hidden="true">↗</span>
        </button>
          </>
        )}
      </section>

      {notice && <div className={`notice notice-${notice.tone}`} role="status">{notice.message}</div>}

      <section className="safety-strip">
        <span className="safety-icon" aria-hidden="true">✓</span>
        <div>
          <strong>Review gate is always on</strong>
          <p>No final submissions, consent boxes, passwords, IDs, or payment fields are automated.</p>
        </div>
      </section>

      {manualCompanionMode && sitePolicy && (
        <section className="manual-companion-card">
          <p className="eyebrow accent">ONLINEJOBS.PH SAFETY POLICY</p>
          <h3>Page automation is off</h3>
          <p>{sitePolicy.message}</p>
          <label className="snippet-box">
            <span>Prepared profile and answer snippets</span>
            <textarea
              aria-label="Prepared profile and answer snippets"
              onFocus={(event) => event.currentTarget.select()}
              readOnly
              spellCheck={false}
              value={manualCompanionSnippets}
            />
          </label>
          <button className="copy-button" disabled={busy} onClick={handleCopyManualSnippets} type="button">
            Copy prepared snippets
          </button>
          <p className="manual-reminder">Enter answers, upload your resume, review the application, and press Submit manually.</p>
        </section>
      )}

      {scan && !manualCompanionMode && (
        <>
          <section className="site-summary">
            <div>
              <p className="eyebrow">CURRENT PAGE</p>
              <h3>{scan.title}</h3>
              <p className="site-url">{new URL(scan.url).hostname}</p>
            </div>
            <div className="radar" aria-label={`${scan.readyCount} safe matches`}>
              <span>{scan.readyCount}</span>
              <small>ready</small>
            </div>
          </section>

          <section className="metric-grid" aria-label="Scan summary">
            <div><strong>{scan.readyCount}</strong><span>Safe matches</span></div>
            <div><strong>{scan.manualCount}</strong><span>Manual review</span></div>
            <div><strong>{scan.blockedCount}</strong><span>Protected</span></div>
          </section>

          <section className="field-section">
            <div className="section-heading">
              <div><p className="eyebrow">FIELD MAP</p><h3>What ApplyFlow found</h3></div>
              <button className="text-button" type="button" onClick={handleClearHighlights}>Clear marks</button>
            </div>
            {groupedFields.ready.map((field) => <FieldRow key={field.id} field={field} onHighlight={handleHighlight} />)}
            {groupedFields.manual.map((field) => <FieldRow key={field.id} field={field} onHighlight={handleHighlight} />)}
            {groupedFields.blocked.map((field) => <FieldRow key={field.id} field={field} onHighlight={handleHighlight} />)}
          </section>

          <section className="review-card">
            <p className="eyebrow accent">HUMAN REVIEW REQUIRED</p>
            <h3>Ready to fill {scan.readyCount} safe fields?</h3>
            <div className="resume-uploader">
              <div className="resume-heading">
                <div>
                  <strong>Attach your resume</strong>
                  <span>PDF only - 5 MB maximum</span>
                </div>
                {resumeResult?.attached && <span className="attached-badge">Attached</span>}
              </div>
              <label className="file-picker">
                <input
                  accept=".pdf,application/pdf"
                  key={resumePickerKey}
                  onChange={(event) => handleResumeSelection(event.target.files?.item(0) ?? null)}
                  type="file"
                />
                <span>{selectedResume?.name ?? resumeResult?.fileName ?? "Choose PDF from this device"}</span>
                <b>Browse</b>
              </label>
              <button
                className="resume-button"
                disabled={busy || !selectedResume}
                onClick={handleAttachResume}
                type="button"
              >
                Attach to this page
              </button>
              <p>ApplyFlow uses only the file you choose. Custom or inaccessible uploaders stay manual.</p>
            </div>
            <label className="review-check">
              <input checked={reviewConfirmed} onChange={(event) => setReviewConfirmed(event.target.checked)} type="checkbox" />
              <span>I will review every answer and press Submit myself.</span>
            </label>
            <button className="primary-button fill-button" disabled={busy || !reviewConfirmed || scan.readyCount === 0} onClick={handleFill} type="button">
              Fill safe fields for review
            </button>
            <p className="submit-lock">FINAL SUBMIT LOCKED BY DESIGN</p>
          </section>
        </>
      )}

      <details className="profile-card" open={manualCompanionMode ? true : undefined}>
        <summary>
          <div><p className="eyebrow">LOCAL PROFILE</p><h3>Private candidate data</h3></div>
          <span>Manage</span>
        </summary>
        <p className="profile-note">Import the private JSON from ApplyFlow setup or edit the fields here. Data stays in Chrome local storage.</p>
        <div className="profile-actions">
          <label>
            Import private JSON
            <input
              accept="application/json,.json"
              key={profilePickerKey}
              onChange={(event) => handleImportProfile(event.target.files?.item(0) ?? null)}
              type="file"
            />
          </label>
          <button onClick={handleExportProfile} type="button">Export private JSON</button>
        </div>
        <div className="profile-grid">
          {profileFields.map(({ key, label, wide, multiline }) => (
            <label className={wide ? "wide" : ""} key={key}>
              <span>{label}</span>
              {multiline ? (
                <textarea value={profile[key]} onChange={(event) => setProfile((current) => ({ ...current, [key]: event.target.value }))} />
              ) : (
                <input value={profile[key]} onChange={(event) => setProfile((current) => ({ ...current, [key]: event.target.value }))} />
              )}
            </label>
          ))}
        </div>
        <button className="secondary-button" disabled={busy} onClick={handleSaveProfile} type="button">Save locally</button>
      </details>

      <footer>
        <span className="status-dot" />
        {manualCompanionMode ? "Manual companion - no page changes" : "Active tab access only - no background browsing"}
      </footer>
    </main>
  );
}
