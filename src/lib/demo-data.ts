export type QueueStatus = "review" | "ready" | "skipped" | "sent";

export type JobMatch = {
  id: string;
  title: string;
  company: string;
  location: string;
  workMode: string;
  salary: string;
  source: string;
  posted: string;
  score: number;
  status: QueueStatus;
  skills: string[];
  matchedSkills: string[];
  gaps: string[];
  summary: string;
  matchReason: string;
  resume: string;
  coverLetter: string;
  screening: Array<{ label: string; value: string; complete: boolean }>;
};

export const initialJobs: JobMatch[] = [
  {
    id: "AF-2048",
    title: "Frontend Engineer",
    company: "Northstar Product Studio",
    location: "Remote - Philippines",
    workMode: "Remote",
    salary: "PHP 75,000 - 105,000",
    source: "Direct careers",
    posted: "2 hours ago",
    score: 92,
    status: "review",
    skills: ["TypeScript", "React", "Next.js", "Design systems"],
    matchedSkills: ["TypeScript", "React", "Next.js"],
    gaps: ["No salary currency stated"],
    summary:
      "Build customer-facing workflows and reusable interface systems for a remote product team.",
    matchReason:
      "Strong overlap with your TypeScript portfolio, interface work, and experience shipping responsive systems.",
    resume: "Aljon Mariano - Frontend.pdf",
    coverLetter: "Personalized draft ready",
    screening: [
      { label: "Work authorization", value: "Philippines based", complete: true },
      { label: "Years with React", value: "3 years", complete: true },
      { label: "Expected monthly pay", value: "PHP 90,000", complete: true },
    ],
  },
  {
    id: "AF-2051",
    title: "Full-stack TypeScript Developer",
    company: "Relay Commerce Lab",
    location: "Makati City, Philippines",
    workMode: "Hybrid",
    salary: "PHP 80,000 - 120,000",
    source: "Job board",
    posted: "5 hours ago",
    score: 88,
    status: "review",
    skills: ["TypeScript", "Node.js", "PostgreSQL", "React"],
    matchedSkills: ["TypeScript", "Node.js", "React"],
    gaps: ["PostgreSQL depth needs review"],
    summary:
      "Own web features from data modeling through polished client experiences for a commerce platform.",
    matchReason:
      "Your full-stack system demos cover the core workflow, API, and responsive UI requirements.",
    resume: "Aljon Mariano - Full-stack.pdf",
    coverLetter: "Personalized draft ready",
    screening: [
      { label: "Hybrid availability", value: "Needs confirmation", complete: false },
      { label: "Node.js experience", value: "2 years", complete: true },
      { label: "Expected monthly pay", value: "PHP 100,000", complete: true },
    ],
  },
  {
    id: "AF-2054",
    title: "Junior AI Product Engineer",
    company: "Signal Foundry",
    location: "Remote - Asia Pacific",
    workMode: "Remote",
    salary: "USD 1,600 - 2,200",
    source: "Talent network",
    posted: "Today",
    score: 84,
    status: "review",
    skills: ["Python", "TypeScript", "LLM APIs", "Product thinking"],
    matchedSkills: ["TypeScript", "LLM APIs", "Product thinking"],
    gaps: ["Python work is not prominent in current resume"],
    summary:
      "Prototype AI-assisted internal tools, validate workflows, and turn successful experiments into products.",
    matchReason:
      "Your automation projects and product-focused portfolio align with the role's rapid prototyping scope.",
    resume: "Aljon Mariano - Product Engineer.pdf",
    coverLetter: "Draft needs one answer",
    screening: [
      { label: "AI project example", value: "ApplyFlow", complete: true },
      { label: "Python experience", value: "Needs your input", complete: false },
      { label: "Expected monthly pay", value: "USD 1,900", complete: true },
    ],
  },
  {
    id: "AF-2042",
    title: "React Developer",
    company: "Harbor Digital Works",
    location: "Cebu City, Philippines",
    workMode: "Remote",
    salary: "PHP 65,000 - 85,000",
    source: "Direct careers",
    posted: "Yesterday",
    score: 81,
    status: "ready",
    skills: ["React", "REST APIs", "CSS", "Testing"],
    matchedSkills: ["React", "REST APIs", "CSS"],
    gaps: [],
    summary:
      "Deliver accessible customer portals and improve an established component library.",
    matchReason:
      "Portfolio projects demonstrate the requested interface craft and API integration experience.",
    resume: "Aljon Mariano - Frontend.pdf",
    coverLetter: "Approved",
    screening: [
      { label: "Remote availability", value: "Available", complete: true },
      { label: "Expected monthly pay", value: "PHP 78,000", complete: true },
    ],
  },
  {
    id: "AF-2037",
    title: "Web Application Developer",
    company: "Lattice Operations",
    location: "Taguig City, Philippines",
    workMode: "Hybrid",
    salary: "PHP 70,000 - 95,000",
    source: "Job board",
    posted: "2 days ago",
    score: 78,
    status: "ready",
    skills: ["Next.js", "TypeScript", "SQL", "Git"],
    matchedSkills: ["Next.js", "TypeScript", "Git"],
    gaps: ["Hybrid schedule not confirmed"],
    summary:
      "Build operational dashboards and maintain integrations used by regional service teams.",
    matchReason:
      "Your business system demos closely mirror the dashboard and workflow responsibilities.",
    resume: "Aljon Mariano - Full-stack.pdf",
    coverLetter: "Approved",
    screening: [
      { label: "Office schedule", value: "Needs confirmation", complete: false },
      { label: "Expected monthly pay", value: "PHP 88,000", complete: true },
    ],
  },
  {
    id: "AF-2029",
    title: "UI Engineer",
    company: "Common Thread Systems",
    location: "Remote - Philippines",
    workMode: "Remote",
    salary: "PHP 85,000 - 115,000",
    source: "Referral",
    posted: "3 days ago",
    score: 75,
    status: "sent",
    skills: ["React", "Accessibility", "Animation", "Figma"],
    matchedSkills: ["React", "Accessibility", "Animation"],
    gaps: [],
    summary:
      "Create motion-rich interface patterns and help teams ship consistent, accessible product experiences.",
    matchReason:
      "Your Three.js presentations and system interfaces demonstrate the requested visual and technical range.",
    resume: "Aljon Mariano - Frontend.pdf",
    coverLetter: "Sent with application",
    screening: [
      { label: "Portfolio", value: "Included", complete: true },
      { label: "Expected monthly pay", value: "PHP 100,000", complete: true },
    ],
  },
  {
    id: "AF-2018",
    title: "Backend Developer",
    company: "Ledger Spring",
    location: "Remote - Southeast Asia",
    workMode: "Remote",
    salary: "Not listed",
    source: "Talent network",
    posted: "4 days ago",
    score: 63,
    status: "skipped",
    skills: ["Java", "Spring Boot", "Kafka", "PostgreSQL"],
    matchedSkills: ["PostgreSQL"],
    gaps: ["Java required", "Kafka required", "Pay not listed"],
    summary:
      "Maintain financial services and event-driven integrations across a distributed backend platform.",
    matchReason:
      "The core stack does not match the current resume, so ApplyFlow recommended skipping this listing.",
    resume: "Aljon Mariano - Full-stack.pdf",
    coverLetter: "Not generated",
    screening: [],
  },
];

export const weeklyTrend = [
  { day: "Mon", discovered: 11, matched: 4, sent: 1 },
  { day: "Tue", discovered: 17, matched: 6, sent: 2 },
  { day: "Wed", discovered: 13, matched: 5, sent: 1 },
  { day: "Thu", discovered: 21, matched: 8, sent: 3 },
  { day: "Fri", discovered: 15, matched: 7, sent: 2 },
  { day: "Sat", discovered: 7, matched: 3, sent: 0 },
  { day: "Sun", discovered: 9, matched: 4, sent: 1 },
];

export const pipelineStages = [
  { label: "Discovered", value: 84, detail: "100% of listings" },
  { label: "Passed rules", value: 39, detail: "46% of listings" },
  { label: "Fit checked", value: 24, detail: "29% of listings" },
  { label: "Strong matches", value: 18, detail: "21% of listings" },
  { label: "Applications sent", value: 9, detail: "11% of listings" },
];

export const applicationActivity = [
  {
    id: "AC-501",
    title: "Application prepared",
    detail: "UI Engineer at Common Thread Systems",
    time: "18 minutes ago",
    tone: "green" as const,
  },
  {
    id: "AC-502",
    title: "Answer needs review",
    detail: "Hybrid availability for Relay Commerce Lab",
    time: "42 minutes ago",
    tone: "amber" as const,
  },
  {
    id: "AC-503",
    title: "High-fit listing found",
    detail: "Frontend Engineer at Northstar Product Studio",
    time: "2 hours ago",
    tone: "blue" as const,
  },
  {
    id: "AC-504",
    title: "Listing skipped",
    detail: "Required stack was outside your saved profile",
    time: "4 hours ago",
    tone: "muted" as const,
  },
];

export const sourcePerformance = [
  { name: "Direct careers", discovered: 25, matched: 9, rate: 36 },
  { name: "Job board", discovered: 34, matched: 7, rate: 21 },
  { name: "Talent network", discovered: 17, matched: 4, rate: 24 },
  { name: "Referral", discovered: 8, matched: 3, rate: 38 },
];

export const profileCoverage = [
  { label: "Identity and contact", value: 100 },
  { label: "Work preferences", value: 92 },
  { label: "Reusable answers", value: 78 },
  { label: "Resume variants", value: 86 },
];
