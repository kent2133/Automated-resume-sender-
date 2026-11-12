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
