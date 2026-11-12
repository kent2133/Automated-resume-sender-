export interface SensitiveDescriptor {
  label?: string;
  name?: string;
  autocomplete?: string;
  placeholder?: string;
  type?: string;
}

export interface SensitiveResult {
  blocked: boolean;
  reason?: string;
}

const rules: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /password|passcode|pin\b/i, reason: "Passwords and access codes are never filled" },
  { pattern: /credit card|card number|cvv|cvc|security code|expiry date/i, reason: "Payment details are never filled" },
  { pattern: /bank account|routing number|iban|swift code/i, reason: "Banking details are never filled" },
  { pattern: /social security|\bssn\b|tax id|tin number|national id|passport|driver.?s license/i, reason: "Government identifiers are never filled" },
  { pattern: /date of birth|birth date|birthday/i, reason: "Birth dates require manual review" },
  { pattern: /race|ethnicity|gender identity|sexual orientation|religion|disability|veteran status/i, reason: "Voluntary demographic answers require manual review" },
  { pattern: /criminal record|background check|medical condition|health information/i, reason: "Sensitive personal disclosures require manual review" },
  { pattern: /signature|certify|attest|legal name.*signature/i, reason: "Legal attestations require manual review" },
  { pattern: /salary history|previous salary|current salary/i, reason: "Salary history requires manual review" },
  { pattern: /desired salary|salary expectation|expected compensation|expected salary/i, reason: "Salary and currency must be reviewed for this role" },
  { pattern: /authorized to work|work authorization|legally (?:eligible|authorized)|visa sponsorship|require sponsorship/i, reason: "Work eligibility must be reviewed for this country and role" },
];

export function detectSensitiveField(descriptor: SensitiveDescriptor): SensitiveResult {
  if (descriptor.type?.toLowerCase() === "password") {
    return { blocked: true, reason: "Passwords and access codes are never filled" };
  }

  const searchable = [
    descriptor.label,
    descriptor.name,
    descriptor.autocomplete,
    descriptor.placeholder,
  ]
    .filter(Boolean)
    .join(" ");

  const match = rules.find((rule) => rule.pattern.test(searchable));
  return match ? { blocked: true, reason: match.reason } : { blocked: false };
}
