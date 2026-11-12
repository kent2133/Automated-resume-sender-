export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type WorkArrangement = "remote" | "hybrid" | "onsite" | "flexible";
export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contract"
  | "temporary"
  | "internship"
  | "freelance"
  | "other";
export type SalaryPeriod = "hour" | "day" | "week" | "month" | "year";
export type JobDisposition = "new" | "shortlisted" | "skipped" | "archived";
export type MatchRecommendation = "strong" | "good" | "review" | "poor" | "blocked";
export type ApplicationStatus =
  | "draft"
  | "review_required"
  | "ready"
  | "queued"
  | "submitting"
  | "submitted"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn"
  | "failed";
export type ApplicationChannel =
  | "browser_extension"
  | "email"
  | "company_site"
  | "job_board"
  | "manual";
export type ApplicationActor = "user" | "extension" | "system";
export type HandoffStatus =
  | "pending"
  | "claimed"
  | "completed"
  | "expired"
  | "cancelled"
  | "failed";

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type TableDefinition<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationship[];
};

export type ProfileRow = {
  user_id: string;
  full_name: string | null;
  contact_email: string | null;
  phone: string | null;
  headline: string | null;
  professional_summary: string | null;
  city: string | null;
  country_code: string;
  timezone: string;
  portfolio_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  target_roles: string[];
  preferred_locations: string[];
  work_arrangements: WorkArrangement[];
  minimum_salary: number | null;
  salary_currency: string;
  salary_period: SalaryPeriod;
  years_experience: number | null;
  requires_sponsorship: boolean | null;
  willing_to_relocate: boolean | null;
  notice_period_days: number | null;
  created_at: string;
  updated_at: string;
};

export type ProfileInsert = {
  user_id: string;
  full_name?: string | null;
  contact_email?: string | null;
  phone?: string | null;
  headline?: string | null;
  professional_summary?: string | null;
  city?: string | null;
  country_code?: string;
  timezone?: string;
  portfolio_url?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  target_roles?: string[];
  preferred_locations?: string[];
  work_arrangements?: WorkArrangement[];
  minimum_salary?: number | null;
  salary_currency?: string;
  salary_period?: SalaryPeriod;
  years_experience?: number | null;
  requires_sponsorship?: boolean | null;
  willing_to_relocate?: boolean | null;
  notice_period_days?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type ProfileAnswerRow = {
  id: string;
  user_id: string;
  question_key: string;
  question_text: string;
  answer_text: string;
  category: string;
  is_sensitive: boolean;
  metadata: Json;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileAnswerInsert = {
  id?: string;
  user_id: string;
  question_key: string;
  question_text: string;
  answer_text: string;
  category?: string;
  is_sensitive?: boolean;
  metadata?: Json;
  last_used_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ResumeRow = {
  id: string;
  user_id: string;
  label: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  checksum_sha256: string | null;
  parsed_text: string | null;
  skills: string[];
  is_default: boolean;
  version: number;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export type ResumeInsert = {
  id?: string;
  user_id: string;
  label: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  checksum_sha256?: string | null;
  parsed_text?: string | null;
  skills?: string[];
  is_default?: boolean;
  version?: number;
  metadata?: Json;
  created_at?: string;
  updated_at?: string;
};

export type JobRow = {
  id: string;
  user_id: string;
  source: string;
  source_job_id: string | null;
  source_url: string | null;
  company_name: string;
  title: string;
  location_text: string | null;
  work_arrangement: WorkArrangement | null;
  employment_type: EmploymentType | null;
  description: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_period: SalaryPeriod | null;
  disposition: JobDisposition;
  posted_at: string | null;
  expires_at: string | null;
  discovered_at: string;
  last_seen_at: string;
  raw_payload: Json;
  created_at: string;
  updated_at: string;
};

export type JobInsert = {
  id?: string;
  user_id: string;
  source: string;
  source_job_id?: string | null;
  source_url?: string | null;
  company_name: string;
  title: string;
  location_text?: string | null;
  work_arrangement?: WorkArrangement | null;
  employment_type?: EmploymentType | null;
  description: string;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  salary_period?: SalaryPeriod | null;
  disposition?: JobDisposition;
  posted_at?: string | null;
  expires_at?: string | null;
  discovered_at?: string;
  last_seen_at?: string;
  raw_payload?: Json;
  created_at?: string;
  updated_at?: string;
};

export type JobMatchRow = {
  id: string;
  user_id: string;
  job_id: string;
  resume_id: string | null;
  score: number;
  recommendation: MatchRecommendation;
  rationale: string;
  strengths: string[];
  gaps: string[];
  hard_blockers: string[];
  requirement_analysis: Json;
  model_name: string | null;
  model_version: string | null;
  matched_at: string;
  created_at: string;
  updated_at: string;
};

export type JobMatchInsert = {
  id?: string;
  user_id: string;
  job_id: string;
  resume_id?: string | null;
  score: number;
  recommendation: MatchRecommendation;
  rationale: string;
  strengths?: string[];
  gaps?: string[];
  hard_blockers?: string[];
  requirement_analysis?: Json;
  model_name?: string | null;
  model_version?: string | null;
  matched_at?: string;
  created_at?: string;
  updated_at?: string;
};

export type ApplicationRow = {
  id: string;
  user_id: string;
  job_id: string;
  match_id: string | null;
  resume_id: string | null;
  status: ApplicationStatus;
  channel: ApplicationChannel;
  cover_letter: string | null;
  field_values: Json;
  missing_fields: string[];
  requires_review: boolean;
  consented_at: string | null;
  queued_at: string | null;
  submitted_at: string | null;
  external_confirmation_id: string | null;
  external_confirmation_url: string | null;
  failure_code: string | null;
  failure_message: string | null;
  created_at: string;
  updated_at: string;
};

export type ApplicationInsert = {
  id?: string;
  user_id: string;
  job_id: string;
  match_id?: string | null;
  resume_id?: string | null;
  status?: ApplicationStatus;
  channel?: ApplicationChannel;
  cover_letter?: string | null;
  field_values?: Json;
  missing_fields?: string[];
  requires_review?: boolean;
  consented_at?: string | null;
  queued_at?: string | null;
  submitted_at?: string | null;
  external_confirmation_id?: string | null;
  external_confirmation_url?: string | null;
  failure_code?: string | null;
  failure_message?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ApplicationEventRow = {
  id: number;
  user_id: string;
  application_id: string;
  event_type: string;
  actor: ApplicationActor;
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus | null;
  message: string | null;
  metadata: Json;
  created_at: string;
};

export type ApplicationEventInsert = {
  id?: number;
  user_id: string;
  application_id: string;
  event_type: string;
  actor: ApplicationActor;
  from_status?: ApplicationStatus | null;
  to_status?: ApplicationStatus | null;
  message?: string | null;
  metadata?: Json;
  created_at?: string;
};

export type ExtensionHandoffRow = {
  id: string;
  user_id: string;
  application_id: string | null;
  job_id: string | null;
  token_hash: string;
  status: HandoffStatus;
  target_url: string;
  payload: Json;
  claimed_at: string | null;
  completed_at: string | null;
  expires_at: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type ExtensionHandoffInsert = {
  id?: string;
  user_id: string;
  application_id?: string | null;
  job_id?: string | null;
  token_hash: string;
  status?: HandoffStatus;
  target_url: string;
  payload?: Json;
  claimed_at?: string | null;
  completed_at?: string | null;
  expires_at?: string;
  error_message?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<ProfileRow, ProfileInsert, Partial<ProfileInsert>>;
      profile_answers: TableDefinition<
        ProfileAnswerRow,
        ProfileAnswerInsert,
        Partial<ProfileAnswerInsert>
      >;
      resumes: TableDefinition<ResumeRow, ResumeInsert, Partial<ResumeInsert>>;
      jobs: TableDefinition<JobRow, JobInsert, Partial<JobInsert>>;
      job_matches: TableDefinition<JobMatchRow, JobMatchInsert, Partial<JobMatchInsert>>;
      applications: TableDefinition<
        ApplicationRow,
        ApplicationInsert,
        Partial<ApplicationInsert>
      >;
      application_events: TableDefinition<
        ApplicationEventRow,
        ApplicationEventInsert,
        Partial<ApplicationEventInsert>
      >;
      extension_handoffs: TableDefinition<
        ExtensionHandoffRow,
        ExtensionHandoffInsert,
        Partial<ExtensionHandoffInsert>
      >;
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      work_arrangement: WorkArrangement;
      employment_type: EmploymentType;
      salary_period: SalaryPeriod;
      job_disposition: JobDisposition;
      match_recommendation: MatchRecommendation;
      application_status: ApplicationStatus;
      application_channel: ApplicationChannel;
      application_actor: ApplicationActor;
      handoff_status: HandoffStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

export type Tables<TableName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TableName]["Row"];

export type TablesInsert<TableName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TableName]["Insert"];

export type TablesUpdate<TableName extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][TableName]["Update"];
