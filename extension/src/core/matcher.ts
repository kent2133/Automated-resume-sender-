import type { ProfileKey } from "../shared/contracts";

export interface FieldDescriptor {
  label: string;
  name?: string;
  autocomplete?: string;
  placeholder?: string;
  type?: string;
  tagName?: string;
}

export interface FieldMatch {
  profileKey?: ProfileKey;
  confidence: number;
  reason: string;
  manualOnly?: boolean;
}

interface MatchRule {
  key: ProfileKey;
  label: string;
  patterns: RegExp[];
  autocomplete?: string[];
  preferredTypes?: string[];
}

const rules: MatchRule[] = [
  { key: "firstName", label: "First name", patterns: [/\bfirst name\b/i, /\bgiven name\b/i, /^first$/i], autocomplete: ["given-name"] },
  { key: "lastName", label: "Last name", patterns: [/\blast name\b/i, /\bsurname\b/i, /\bfamily name\b/i, /^last$/i], autocomplete: ["family-name"] },
  { key: "fullName", label: "Full name", patterns: [/\bfull name\b/i, /\byour name\b/i, /^name$/i], autocomplete: ["name"] },
  { key: "email", label: "Email", patterns: [/\be-?mail(?: address)?\b/i], autocomplete: ["email"], preferredTypes: ["email"] },
  { key: "phone", label: "Phone", patterns: [/\bphone(?: number)?\b/i, /\bmobile(?: number)?\b/i, /\bcontact number\b/i], autocomplete: ["tel", "tel-national"], preferredTypes: ["tel"] },
  { key: "location", label: "Location", patterns: [/\blocation\b/i, /\bcity(?: and country)?\b/i, /\bcurrent city\b/i, /\bcountry of residence\b/i], autocomplete: ["address-level2", "country-name"] },
  { key: "portfolioUrl", label: "Portfolio", patterns: [/\bportfolio(?: url| link)?\b/i, /\bpersonal website\b/i, /\bwebsite(?: url)?\b/i], autocomplete: ["url"], preferredTypes: ["url"] },
  { key: "linkedinUrl", label: "LinkedIn", patterns: [/linkedin/i] },
  { key: "githubUrl", label: "GitHub", patterns: [/github/i] },
  { key: "yearsExperience", label: "Years of experience", patterns: [/years?.*(?:professional )?experience/i, /experience.*years?/i] },
  { key: "desiredSalary", label: "Desired salary", patterns: [/desired salary/i, /salary expectation/i, /expected compensation/i, /expected salary/i] },
  { key: "workAuthorization", label: "Work authorization", patterns: [/authorized to work/i, /work authorization/i, /legally (?:eligible|authorized)/i] },
  { key: "coverLetter", label: "Cover letter", patterns: [/cover letter/i, /why (?:do you|are you).*(?:want|interested)/i, /message to (?:the )?hiring/i] },
];

function normalize(value: string | undefined): string {
  return (value ?? "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchField(descriptor: FieldDescriptor): FieldMatch {
  const type = descriptor.type?.toLowerCase() ?? "text";
  const tagName = descriptor.tagName?.toLowerCase() ?? "input";

  if (type === "file") {
    const text = `${descriptor.label} ${descriptor.name ?? ""}`;
    if (/resume|curriculum vitae|\bcv\b/i.test(text)) {
      return { confidence: 1, reason: "Resume uploads require you to choose the file", manualOnly: true };
    }
  }

  if (["checkbox", "radio", "submit", "button", "reset", "hidden", "password"].includes(type)) {
    return { confidence: 0, reason: "This control is not eligible for automatic filling" };
  }

  const sources = [
    { value: normalize(descriptor.label), weight: 0.94, source: "label" },
    { value: normalize(descriptor.name), weight: 0.84, source: "field name" },
    { value: normalize(descriptor.placeholder), weight: 0.78, source: "placeholder" },
  ];
  const autocomplete = normalize(descriptor.autocomplete).toLowerCase();

  let best: FieldMatch = { confidence: 0, reason: "No safe profile match was found" };

  for (const rule of rules) {
    let score = 0;
    let reason = "";

    if (autocomplete && rule.autocomplete?.includes(autocomplete)) {
      score = 0.99;
      reason = `Matched ${rule.label} from browser autocomplete metadata`;
    }

    for (const source of sources) {
      if (source.value && rule.patterns.some((pattern) => pattern.test(source.value))) {
        if (source.weight > score) {
          score = source.weight;
          reason = `Matched ${rule.label} from the ${source.source}`;
        }
      }
    }

    if (rule.preferredTypes?.includes(type)) {
      const typeScore = type === "email" || type === "tel" ? 0.97 : 0.83;
      if (typeScore > score) {
        score = typeScore;
        reason = `Matched ${rule.label} from the field type`;
      }
    }

    if (rule.key === "coverLetter" && tagName !== "textarea" && score < 0.9) {
      score = 0;
    }

    if (score > best.confidence) {
      best = { profileKey: rule.key, confidence: score, reason };
    }
  }

  return best;
}
