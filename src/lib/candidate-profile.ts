import type {
  Json,
  ProfileInsert,
  ProfileRow,
  WorkArrangement,
} from "@/lib/database.types";

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

export interface CandidateProfileDocument {
  schemaVersion: 1;
  profile: CandidateProfile;
}

export const emptyCandidateProfile: CandidateProfile = {
  firstName: "",
  middleName: "",
  middleInitial: "",
  lastName: "",
  fullName: "",
  email: "",
  phone: "",
  location: "Philippines",
  portfolioUrl: "",
  linkedinUrl: "",
  githubUrl: "",
  yearsExperience: "",
  desiredSalary: "",
  currentTitle: "",
  currentEmployer: "",
  secondaryTitle: "",
  secondaryEmployer: "",
  workHistorySummary: "",
  educationSummary: "",
  credentialsSummary: "",
  languagesSummary: "",
  targetRoles: "Full-stack Developer, Frontend Developer, AI Developer, System Developer",
  aiAssistedWorkPreference: "Open to responsible AI-assisted development",
  minimumMonthlySalaryPhp: "",
  preferredMonthlySalaryPhp: "",
  minimumMonthlySalaryUsd: "",
  workMode: "Remote only",
  shiftAvailability: "Open to day or night shifts",
  startAvailability: "Immediately available",
  timezoneAvailability: "Available across time zones",
  workAuthorization: "Review for each country and role",
  sponsorship: "Review for each country and role",
  passportAvailability: "Passport available - this does not confirm work authorization",
  skillsSummary: "",
  equipmentSummary: "",
  internetSummary: "",
  backupPowerSummary: "",
  backupDeviceSummary: "",
  reusableShortAnswer: "",
  coverLetter: "",
  resumeFileName: "",
};

export const candidateProfileKeys = Object.keys(emptyCandidateProfile) as Array<keyof CandidateProfile>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isCandidateProfile(value: unknown): value is CandidateProfile {
  return (
    isRecord(value) &&
    candidateProfileKeys.every((key) => typeof value[key] === "string" && value[key].length <= 12_000)
  );
}

export function isCandidateProfileDocument(value: unknown): value is CandidateProfileDocument {
  return isRecord(value) && value.schemaVersion === 1 && isCandidateProfile(value.profile);
}

export function createCandidateProfileDocument(profile: CandidateProfile): CandidateProfileDocument {
  return { schemaVersion: 1, profile };
}

export function restoreCandidateProfile(value: unknown): CandidateProfile | null {
  if (isCandidateProfileDocument(value)) return value.profile;
  if (isCandidateProfile(value)) return value;
  if (!isRecord(value)) return null;

  const restored = { ...emptyCandidateProfile };
  let recognized = 0;
  for (const key of candidateProfileKeys) {
    if (typeof value[key] === "string" && value[key].length <= 12_000) {
      restored[key] = value[key];
      recognized += 1;
    }
  }
  return recognized > 0 ? restored : null;
}

function nullIfBlank(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function splitList(value: string) {
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter((item, index, items) => item.length > 0 && items.indexOf(item) === index);
}

function parseNonnegativeNumber(value: string, maximum = Number.POSITIVE_INFINITY) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= maximum ? parsed : null;
}

function workArrangements(value: string): WorkArrangement[] {
  const normalized = value.toLowerCase();
  if (normalized.includes("remote") && normalized.includes("hybrid")) return ["remote", "hybrid"];
  if (normalized.includes("remote")) return ["remote"];
  if (normalized.includes("hybrid")) return ["hybrid"];
  if (normalized.includes("on-site") || normalized.includes("onsite")) return ["onsite"];
  return normalized.trim() ? ["flexible"] : [];
}

function profileJson(profile: CandidateProfile): Record<string, Json> {
  return Object.fromEntries(candidateProfileKeys.map((key) => [key, profile[key]]));
}

/**
 * Converts the versioned private setup document to the queryable profile columns.
 * The complete versioned document is retained in application_preferences so a
 * future schema can migrate every setup field without losing formatting.
 */
export function candidateProfileToProfileInsert(
  profile: CandidateProfile,
  userId: string,
): ProfileInsert {
  const minimumPhp = parseNonnegativeNumber(profile.minimumMonthlySalaryPhp);
  const minimumUsd = parseNonnegativeNumber(profile.minimumMonthlySalaryUsd);
  const targetRoles = splitList(profile.targetRoles);
  const skills = splitList(profile.skillsSummary);

  return {
    user_id: userId,
    first_name: nullIfBlank(profile.firstName),
    middle_name: nullIfBlank(profile.middleName),
    last_name: nullIfBlank(profile.lastName),
    full_name: nullIfBlank(profile.fullName),
    contact_email: nullIfBlank(profile.email),
    phone: nullIfBlank(profile.phone),
    headline: nullIfBlank(profile.currentTitle),
    professional_summary: nullIfBlank(profile.reusableShortAnswer || profile.workHistorySummary),
    city: nullIfBlank(profile.location),
    portfolio_url: nullIfBlank(profile.portfolioUrl),
    linkedin_url: nullIfBlank(profile.linkedinUrl),
    github_url: nullIfBlank(profile.githubUrl),
    target_roles: targetRoles,
    preferred_locations: profile.location.trim() ? [profile.location.trim()] : [],
    work_arrangements: workArrangements(profile.workMode),
    minimum_salary: minimumPhp ?? minimumUsd,
    salary_currency: minimumPhp !== null ? "PHP" : minimumUsd !== null ? "USD" : "PHP",
    salary_period: "month",
    years_experience: parseNonnegativeNumber(profile.yearsExperience, 80),
    current_title: nullIfBlank(profile.currentTitle),
    current_employer: nullIfBlank(profile.currentEmployer),
    skills,
    availability: nullIfBlank(profile.startAvailability),
    employment_history: [
      {
        kind: "current",
        title: profile.currentTitle,
        employer: profile.currentEmployer,
        isCurrent: true,
      },
      {
        kind: "secondary",
        title: profile.secondaryTitle,
        employer: profile.secondaryEmployer,
        isCurrent: true,
      },
      { kind: "summary", summary: profile.workHistorySummary },
    ],
    education_history: [{ summary: profile.educationSummary }],
    credentials: [{ summary: profile.credentialsSummary }],
    languages: [{ summary: profile.languagesSummary }],
    salary_preferences: {
      minimumMonthlySalaryPhp: profile.minimumMonthlySalaryPhp,
      preferredMonthlySalaryPhp: profile.preferredMonthlySalaryPhp,
      minimumMonthlySalaryUsd: profile.minimumMonthlySalaryUsd,
      desiredSalary: profile.desiredSalary,
    },
    schedule_preferences: {
      workMode: profile.workMode,
      shiftAvailability: profile.shiftAvailability,
      startAvailability: profile.startAvailability,
      timezoneAvailability: profile.timezoneAvailability,
      remoteOnly: profile.workMode.toLowerCase() === "remote only",
      acceptsNightShift: profile.shiftAvailability.toLowerCase().includes("night"),
    },
    work_eligibility: {
      workAuthorization: profile.workAuthorization,
      sponsorship: profile.sponsorship,
      passportAvailability: profile.passportAvailability,
      authorizationReviewRequired: true,
    },
    equipment_profile: {
      equipmentSummary: profile.equipmentSummary,
      internetSummary: profile.internetSummary,
      backupPowerSummary: profile.backupPowerSummary,
      backupDeviceSummary: profile.backupDeviceSummary,
    },
    application_preferences: {
      applyflowProfile: {
        schemaVersion: 1,
        profile: profileJson(profile),
      },
      middleInitial: profile.middleInitial,
      targetRoles,
      aiAssistedWorkPreference: profile.aiAssistedWorkPreference,
      skillsSummary: profile.skillsSummary,
      reusableShortAnswer: profile.reusableShortAnswer,
      coverLetter: profile.coverLetter,
      resumeFileName: profile.resumeFileName,
    },
    requires_sponsorship: null,
  };
}

function asObject(value: Json): Record<string, Json | undefined> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

export function profileRowHasCandidateProfileDocument(row: ProfileRow) {
  return restoreCandidateProfile(asObject(row.application_preferences).applyflowProfile) !== null;
}

function asArray(value: Json): Json[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: Json | undefined) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}

function historyEntry(entries: Json[], kind: string) {
  return entries.map(asObject).find((entry) => entry.kind === kind) ?? {};
}

function workModeFromRow(row: ProfileRow) {
  if (row.work_arrangements.includes("remote") && row.work_arrangements.includes("hybrid")) {
    return "Remote or hybrid";
  }
  if (row.work_arrangements.includes("remote")) return "Remote only";
  if (row.work_arrangements.includes("hybrid")) return "Hybrid";
  if (row.work_arrangements.includes("onsite")) return "On-site";
  return emptyCandidateProfile.workMode;
}

/** Restores a setup form from a Supabase profiles row, including legacy rows. */
export function candidateProfileFromProfileRow(row: ProfileRow): CandidateProfile {
  const application = asObject(row.application_preferences);
  const versioned = restoreCandidateProfile(application.applyflowProfile);
  if (versioned) return versioned;

  const employment = asArray(row.employment_history);
  const current = historyEntry(employment, "current");
  const secondary = historyEntry(employment, "secondary");
  const employmentSummary = historyEntry(employment, "summary");
  const education = asObject(asArray(row.education_history)[0] ?? null);
  const credentials = asObject(asArray(row.credentials)[0] ?? null);
  const languages = asObject(asArray(row.languages)[0] ?? null);
  const salary = asObject(row.salary_preferences);
  const schedule = asObject(row.schedule_preferences);
  const eligibility = asObject(row.work_eligibility);
  const equipment = asObject(row.equipment_profile);

  return {
    ...emptyCandidateProfile,
    firstName: row.first_name ?? "",
    middleName: row.middle_name ?? "",
    middleInitial: stringValue(application.middleInitial),
    lastName: row.last_name ?? "",
    fullName: row.full_name ?? "",
    email: row.contact_email ?? "",
    phone: row.phone ?? "",
    location: row.city ?? row.preferred_locations[0] ?? emptyCandidateProfile.location,
    portfolioUrl: row.portfolio_url ?? "",
    linkedinUrl: row.linkedin_url ?? "",
    githubUrl: row.github_url ?? "",
    yearsExperience: row.years_experience === null ? "" : String(row.years_experience),
    desiredSalary: stringValue(salary.desiredSalary),
    currentTitle: row.current_title ?? stringValue(current.title),
    currentEmployer: row.current_employer ?? stringValue(current.employer),
    secondaryTitle: stringValue(secondary.title),
    secondaryEmployer: stringValue(secondary.employer),
    workHistorySummary: stringValue(employmentSummary.summary),
    educationSummary: stringValue(education.summary),
    credentialsSummary: stringValue(credentials.summary),
    languagesSummary: stringValue(languages.summary),
    targetRoles: row.target_roles.join(", "),
    aiAssistedWorkPreference: stringValue(application.aiAssistedWorkPreference),
    minimumMonthlySalaryPhp: stringValue(salary.minimumMonthlySalaryPhp),
    preferredMonthlySalaryPhp: stringValue(salary.preferredMonthlySalaryPhp),
    minimumMonthlySalaryUsd: stringValue(salary.minimumMonthlySalaryUsd),
    workMode: stringValue(schedule.workMode) || workModeFromRow(row),
    shiftAvailability: stringValue(schedule.shiftAvailability),
    startAvailability: row.availability ?? stringValue(schedule.startAvailability),
    timezoneAvailability: stringValue(schedule.timezoneAvailability),
    workAuthorization: stringValue(eligibility.workAuthorization),
    sponsorship: stringValue(eligibility.sponsorship),
    passportAvailability: stringValue(eligibility.passportAvailability),
    skillsSummary: stringValue(application.skillsSummary) || row.skills.join(", "),
    equipmentSummary: stringValue(equipment.equipmentSummary),
    internetSummary: stringValue(equipment.internetSummary),
    backupPowerSummary: stringValue(equipment.backupPowerSummary),
    backupDeviceSummary: stringValue(equipment.backupDeviceSummary),
    reusableShortAnswer: stringValue(application.reusableShortAnswer) || row.professional_summary || "",
    coverLetter: stringValue(application.coverLetter),
    resumeFileName: stringValue(application.resumeFileName),
  };
}
