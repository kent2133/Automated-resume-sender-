export type ProfileKey =
  | "firstName"
  | "middleName"
  | "middleInitial"
  | "lastName"
  | "fullName"
  | "email"
  | "phone"
  | "location"
  | "portfolioUrl"
  | "linkedinUrl"
  | "githubUrl"
  | "yearsExperience"
  | "currentTitle"
  | "currentEmployer"
  | "targetRoles"
  | "workMode"
  | "shiftAvailability"
  | "startAvailability"
  | "timezoneAvailability"
  | "skillsSummary"
  | "coverLetter";

export interface CandidateProfile {
  firstName: string;
  middleName: string;
  middleInitial: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  portfolioUrl: string;
  linkedinUrl: string;
  githubUrl: string;
  yearsExperience: string;
  desiredSalary: string;
  currentTitle: string;
  currentEmployer: string;
  secondaryTitle: string;
  secondaryEmployer: string;
  workHistorySummary: string;
  educationSummary: string;
  credentialsSummary: string;
  languagesSummary: string;
  targetRoles: string;
  aiAssistedWorkPreference: string;
  minimumMonthlySalaryPhp: string;
  preferredMonthlySalaryPhp: string;
  minimumMonthlySalaryUsd: string;
  workMode: string;
  shiftAvailability: string;
  startAvailability: string;
  timezoneAvailability: string;
  workAuthorization: string;
  sponsorship: string;
  passportAvailability: string;
  skillsSummary: string;
  equipmentSummary: string;
  internetSummary: string;
  backupPowerSummary: string;
  backupDeviceSummary: string;
  reusableShortAnswer: string;
  coverLetter: string;
  resumeFileName: string;
}

export type DemoProfile = CandidateProfile;

export interface CandidateProfileDocument {
  schemaVersion: 1;
  profile: CandidateProfile;
}

export type FieldStatus = "ready" | "manual" | "blocked" | "unmatched" | "filled";

export interface ScannedField {
  id: string;
  label: string;
  tagName: "input" | "textarea" | "select";
  inputType: string;
  required: boolean;
  status: FieldStatus;
  profileKey?: ProfileKey;
  confidence: number;
  reason: string;
  sensitiveReason?: string;
}

export interface ScanReport {
  url: string;
  title: string;
  fields: ScannedField[];
  readyCount: number;
  manualCount: number;
  blockedCount: number;
}

export interface FillReport {
  fields: ScannedField[];
  filledCount: number;
  skippedCount: number;
  message: string;
}

export interface ResumeAttachReport {
  attached: boolean;
  fileName: string;
  fieldId?: string;
  message: string;
}

export interface SitePolicy {
  url: string;
  hostname: string;
  mode: "review-first" | "manual-companion";
  automationAllowed: boolean;
  message: string;
}

export const MAX_RESUME_FILE_BYTES = 5 * 1024 * 1024;

export type PanelRequest =
  | { type: "GET_PROFILE" }
  | { type: "GET_SITE_POLICY" }
  | { type: "SAVE_PROFILE"; profile: CandidateProfile }
  | { type: "SCAN_PAGE" }
  | { type: "FILL_FIELDS"; profile: CandidateProfile; reviewConfirmed: true }
  | { type: "ATTACH_RESUME"; fileName: string; mimeType: "application/pdf"; bytes: number[] }
  | { type: "HIGHLIGHT_FIELD"; fieldId: string }
  | { type: "CLEAR_HIGHLIGHTS" };

export type ContentRequest =
  | { type: "PING" }
  | { type: "SCAN_PAGE" }
  | { type: "FILL_FIELDS"; profile: CandidateProfile; reviewConfirmed: true }
  | { type: "ATTACH_RESUME"; fileName: string; mimeType: "application/pdf"; bytes: number[] }
  | { type: "HIGHLIGHT_FIELD"; fieldId: string }
  | { type: "CLEAR_HIGHLIGHTS" };

export type RuntimeResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export const candidateProfileKeys: Array<keyof CandidateProfile> = [
  "firstName",
  "middleName",
  "middleInitial",
  "lastName",
  "fullName",
  "email",
  "phone",
  "location",
  "portfolioUrl",
  "linkedinUrl",
  "githubUrl",
  "yearsExperience",
  "desiredSalary",
  "currentTitle",
  "currentEmployer",
  "secondaryTitle",
  "secondaryEmployer",
  "workHistorySummary",
  "educationSummary",
  "credentialsSummary",
  "languagesSummary",
  "targetRoles",
  "aiAssistedWorkPreference",
  "minimumMonthlySalaryPhp",
  "preferredMonthlySalaryPhp",
  "minimumMonthlySalaryUsd",
  "workMode",
  "shiftAvailability",
  "startAvailability",
  "timezoneAvailability",
  "workAuthorization",
  "sponsorship",
  "passportAvailability",
  "skillsSummary",
  "equipmentSummary",
  "internetSummary",
  "backupPowerSummary",
  "backupDeviceSummary",
  "reusableShortAnswer",
  "coverLetter",
  "resumeFileName",
];

const legacyProfileKeys: Array<keyof CandidateProfile> = [
  "firstName",
  "lastName",
  "fullName",
  "email",
  "phone",
  "location",
  "portfolioUrl",
  "linkedinUrl",
  "githubUrl",
  "yearsExperience",
  "desiredSalary",
  "workAuthorization",
  "coverLetter",
  "resumeFileName",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isResumeByteArray(value: unknown): value is number[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_RESUME_FILE_BYTES) return false;
  for (const byte of value) {
    if (!Number.isInteger(byte) || byte < 0 || byte > 255) return false;
  }
  return true;
}

function isResumePayload(value: Record<string, unknown>): boolean {
  return (
    typeof value.fileName === "string" &&
    value.fileName.length > 4 &&
    value.fileName.length <= 180 &&
    value.fileName.toLowerCase().endsWith(".pdf") &&
    !/[\\/]/.test(value.fileName) &&
    value.mimeType === "application/pdf" &&
    isResumeByteArray(value.bytes)
  );
}

export function isCandidateProfile(value: unknown): value is CandidateProfile {
  return (
    isRecord(value) &&
    candidateProfileKeys.every((key) => typeof value[key] === "string" && value[key].length <= 12_000)
  );
}

export const isDemoProfile = isCandidateProfile;

export function isCandidateProfileDocument(value: unknown): value is CandidateProfileDocument {
  return isRecord(value) && value.schemaVersion === 1 && isCandidateProfile(value.profile);
}

export function createCandidateProfileDocument(profile: CandidateProfile): CandidateProfileDocument {
  return { schemaVersion: 1, profile };
}

export function migrateCandidateProfile(value: unknown, defaults: CandidateProfile): CandidateProfile | null {
  if (isCandidateProfile(value)) return value;
  if (!isRecord(value)) return null;
  if (!legacyProfileKeys.every((key) => typeof value[key] === "string" && value[key].length <= 12_000)) return null;

  const migrated = { ...defaults };
  for (const key of candidateProfileKeys) {
    if (typeof value[key] === "string" && value[key].length <= 12_000) migrated[key] = value[key];
  }
  return migrated;
}

export function isPanelRequest(value: unknown): value is PanelRequest {
  if (!isRecord(value) || typeof value.type !== "string") return false;

  switch (value.type) {
    case "GET_PROFILE":
    case "GET_SITE_POLICY":
    case "SCAN_PAGE":
    case "CLEAR_HIGHLIGHTS":
      return true;
    case "SAVE_PROFILE":
      return isDemoProfile(value.profile);
    case "FILL_FIELDS":
      return isDemoProfile(value.profile) && value.reviewConfirmed === true;
    case "ATTACH_RESUME":
      return isResumePayload(value);
    case "HIGHLIGHT_FIELD":
      return typeof value.fieldId === "string" && value.fieldId.length > 0 && value.fieldId.length < 160;
    default:
      return false;
  }
}

export function isContentRequest(value: unknown): value is ContentRequest {
  if (!isRecord(value) || typeof value.type !== "string") return false;

  switch (value.type) {
    case "PING":
    case "SCAN_PAGE":
    case "CLEAR_HIGHLIGHTS":
      return true;
    case "FILL_FIELDS":
      return isDemoProfile(value.profile) && value.reviewConfirmed === true;
    case "ATTACH_RESUME":
      return isResumePayload(value);
    case "HIGHLIGHT_FIELD":
      return typeof value.fieldId === "string" && value.fieldId.length > 0 && value.fieldId.length < 160;
    default:
      return false;
  }
}

export function isRuntimeResponse(value: unknown): value is RuntimeResponse {
  if (!isRecord(value) || typeof value.ok !== "boolean") return false;
  return value.ok ? "data" in value : typeof value.error === "string";
}

function isScannedField(value: unknown): value is ScannedField {
  if (!isRecord(value)) return false;
  const validStatus = ["ready", "manual", "blocked", "unmatched", "filled"].includes(String(value.status));
  const validTag = ["input", "textarea", "select"].includes(String(value.tagName));
  return (
    typeof value.id === "string" &&
    typeof value.label === "string" &&
    validTag &&
    typeof value.inputType === "string" &&
    typeof value.required === "boolean" &&
    validStatus &&
    typeof value.confidence === "number" &&
    value.confidence >= 0 &&
    value.confidence <= 1 &&
    typeof value.reason === "string"
  );
}

export function isScanReport(value: unknown): value is ScanReport {
  return (
    isRecord(value) &&
    typeof value.url === "string" &&
    typeof value.title === "string" &&
    Array.isArray(value.fields) &&
    value.fields.every(isScannedField) &&
    typeof value.readyCount === "number" &&
    typeof value.manualCount === "number" &&
    typeof value.blockedCount === "number"
  );
}

export function isFillReport(value: unknown): value is FillReport {
  return (
    isRecord(value) &&
    Array.isArray(value.fields) &&
    value.fields.every(isScannedField) &&
    typeof value.filledCount === "number" &&
    typeof value.skippedCount === "number" &&
    typeof value.message === "string"
  );
}

export function isResumeAttachReport(value: unknown): value is ResumeAttachReport {
  return (
    isRecord(value) &&
    typeof value.attached === "boolean" &&
    typeof value.fileName === "string" &&
    typeof value.message === "string" &&
    (value.fieldId === undefined || typeof value.fieldId === "string")
  );
}

export function isSitePolicy(value: unknown): value is SitePolicy {
  if (!isRecord(value)) return false;
  const validMode = value.mode === "review-first" || value.mode === "manual-companion";
  const validPair =
    (value.mode === "review-first" && value.automationAllowed === true) ||
    (value.mode === "manual-companion" && value.automationAllowed === false);
  return (
    typeof value.url === "string" &&
    typeof value.hostname === "string" &&
    validMode &&
    validPair &&
    typeof value.message === "string"
  );
}
