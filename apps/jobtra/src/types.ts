export type ApplicationStatus =
  | 'Wishlist'
  | 'Applied'
  | 'Screening'
  | 'Interviewing'
  | 'Offer'
  | 'Rejected'
  | 'Withdrawn';

export type JobSource =
  | 'Indeed'
  | 'LinkedIn'
  | 'Glassdoor'
  | 'Company Site'
  | 'Referral'
  | 'Recruiter'
  | 'Direct'
  | 'Email'
  | 'Other';

export type WorkType = 'Remote' | 'Hybrid' | 'On-site';
export type PriorityLevel = 'High' | 'Medium' | 'Low';

export interface InterviewRound {
  id: string;
  roundName: string;
  date?: string;
  interviewer?: string;
  notes?: string;
  status: 'pending' | 'scheduled' | 'completed' | 'passed';
}

export interface LinkedEmail {
  id: string;
  date: string;
  sender: string;
  senderEmail?: string;
  subject: string;
  snippet: string;
  fullBody?: string;
  sourceType: 'indeed' | 'greenhouse' | 'lever' | 'workday' | 'ashby' | 'linkedin' | 'direct' | 'other';
  detectedStatus?: ApplicationStatus;
  aiSummary?: string;
  actionRequired?: string;
  extractedInterviewDate?: string;
}

export type CVTemplateId =
  | 'modern-executive'
  | 'minimalist-ats'
  | 'tech-engineer'
  | 'contemporary'
  | 'compact-onepage';

export interface CVThemeSettings {
  fontFamily: 'Inter' | 'Merriweather' | 'JetBrains Mono' | 'Calibri' | 'Garamond' | 'Playfair' | 'Outfit' | 'Plus Jakarta Sans';
  primaryColor: string; // hex code or css color
  fontScale: 'compact' | 'standard' | 'relaxed';
  lineHeight: 'tight' | 'normal' | 'relaxed';
  marginSize: 'narrow' | 'normal' | 'wide';
  headerLayout: 'left' | 'centered' | 'split';
  showSectionDividers: boolean;
  bulletStyle: 'disc' | 'hyphen' | 'square' | 'accent-dot';
}

export interface BulletEvaluationResult {
  id?: string;
  originalBullet: string;
  score: number; // 0 - 100
  formulaTier: 'Weak / Passive' | 'Developing' | 'Impactful' | 'Elite Google XYZ';
  actionVerbFound?: string;
  hasActionVerb: boolean;
  metricsFound?: string[];
  hasMetrics: boolean;
  hasOutcome: boolean;
  detectedFocus?: string;
  feedback: string;
  xyzFormulaBreakdown?: {
    accomplishedX: string;
    measuredByY: string;
    byDoingZ: string;
  };
  improvedVersion: string;
  variations: {
    executive: string;
    metricsHeavy: string;
    concise: string;
  };
}

export interface CVTemplateInfo {
  id: CVTemplateId;
  name: string;
  badge: string;
  description: string;
  accentColor: string;
  bestFor: string;
  defaultTheme?: Partial<CVThemeSettings>;
}

export interface ReferenceCVRecord {
  id: string;
  name: string;
  sourceFileName?: string;
  rawText: string;
  detectedStyle?: string;
  detectedTone?: string;
  keyFormattingTraits?: string[];
  uploadedAt: string;
}

export interface BaseCV {
  id: string;
  title: string; // e.g. "Full-Stack Engineer Base"
  targetRole: string; // e.g. "Senior Full-Stack Engineer"
  fullName: string;
  email: string;
  phone?: string;
  location: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  website?: string;
  summary: string;
  skills: { category: string; items: string[] }[];
  experience: {
    id: string;
    company: string;
    role: string;
    location?: string;
    startDate: string;
    endDate: string;
    isCurrent?: boolean;
    bullets: string[];
    bulletScores?: Record<number, number>; // index to score
    techStack?: string[];
  }[];
  education: {
    id: string;
    degree: string;
    institution: string;
    location?: string;
    graduationYear: string;
    details?: string;
  }[];
  projects?: {
    id: string;
    name: string;
    description: string;
    link?: string;
    techStack: string[];
  }[];
  certifications?: string[];
  templateId?: CVTemplateId;
  themeSettings?: CVThemeSettings;
  googleDocId?: string;
  googleDocUrl?: string;
  lastSyncedToGoogleDocAt?: string;
  adaptedFromReferenceId?: string;
  sourceDocFileName?: string;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CVPerformanceMetric {
  baseCvId: string;
  baseCvTitle: string;
  targetRole: string;
  applicationsCount: number;
  interviewsCount: number;
  offersCount: number;
  rejectionsCount: number;
  responseRate: number; // percentage
  interviewRate: number; // percentage
  offerRate: number; // percentage
  avgMatchScore: number;
  preferredTemplateName: string;
  topWinningKeywords: string[];
}

export interface TailoredCVRecord {
  id: string;
  baseCvId: string;
  baseCvTitle: string;
  jobApplicationId: string;
  company: string;
  role: string;
  tailoredAt: string;
  matchScore: number;
  matchStrengths: string[];
  matchGaps: string[];
  keyKeywords: string[];
  tailoredSummary: string;
  tailoredSkills: { category: string; items: string[] }[];
  tailoredExperience: {
    id: string;
    company: string;
    role: string;
    bullets: string[];
    techStack?: string[];
  }[];
  tailoredCoverLetter: string;
  tailoringAdvice: string[];
  interviewAngles: string[];
  fullTailoredMarkdown: string;
  templateId?: CVTemplateId;
  googleDocId?: string;
  googleDocUrl?: string;
  lastSyncedToGoogleDocAt?: string;
}

export interface JobAnalysisResult {
  company: string;
  role: string;
  salaryEstimate?: string;
  location?: string;
  workType?: WorkType;
  extractedDescription?: string;
  requiredSkills: string[];
  preferredSkills: string[];
  keyResponsibilities: string[];
  cultureAndValues: string[];
  atsKeywords: string[];
  tailoringAdvice: string[];
}

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  salary?: string;
  location: string;
  workType: WorkType;
  dateApplied: string;
  jobUrl?: string;
  source: JobSource;
  contactName?: string;
  contactEmail?: string;
  contactRole?: string;
  contactPhone?: string;
  contactLinkedin?: string;
  companyWebsite?: string;
  companyCareersUrl?: string;
  discoveredContacts?: DiscoveredContact[];
  nextStepDate?: string;
  nextStepTitle?: string;
  priority: PriorityLevel;
  notes: string;
  jobDescription?: string;
  coverLetter?: { content: string; tone?: string; updatedAt: string };
  tailoredCv?: TailoredCVRecord;
  appliedCvId?: string;
  appliedCvTitle?: string;
  interviewRounds?: InterviewRound[];
  linkedEmails: LinkedEmail[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ConnectedAccount {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  provider: 'gmail' | 'workspace' | 'outlook' | 'custom';
  accessToken?: string;
  lastSyncedAt?: string;
  unreadCount?: number;
  status: 'active' | 'syncing' | 'error' | 'expired';
  isPrimary?: boolean;
}

export interface OnlineEnrichmentData {
  companyWebsite?: string;
  companyCareersUrl?: string;
  companyDomain?: string;
  industry?: string;
  companyHeadquarters?: string;
  estimatedSalaryRange?: string;
  isSalaryEstimatedOnline?: boolean;
  discoveredRecruiterEmails?: string[];
  discoveredRecruiterContacts?: DiscoveredContact[];
  googleSearchUrl?: string;
  linkedinSearchUrl?: string;
  companyOverview?: string;
  missingFieldsFilled?: string[];
}

export interface EmailScanResult {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  fullBody?: string;
  receivedDate: string;
  matchedApplicationId?: string;
  parsedData: {
    company: string;
    role: string;
    detectedStatus: ApplicationStatus;
    source: JobSource;
    salary?: string;
    location?: string;
    workType?: WorkType;
    interviewDate?: string;
    nextStep?: string;
    recruiterName?: string;
    recruiterEmail?: string;
    recruiterRole?: string;
    recruiterLinkedin?: string;
    jobUrl?: string;
    companyWebsite?: string;
    companyCareersUrl?: string;
    summary: string;
    keyHighlights?: string[];
    confidence: number;
    onlineEnrichment?: OnlineEnrichmentData;
  };
  processed?: boolean;
}

export interface DiscoveredContact {
  id: string;
  name: string;
  email?: string;
  role?: string;
  confidence?: number;
  sourceType: 'email_import' | 'website_search' | 'linkedin_finder' | 'ai_domain_heuristic';
  linkedinUrl?: string;
  phone?: string;
  notes?: string;
}

export interface OnlineRecruiterSearchResult {
  company: string;
  domain?: string;
  careersUrl?: string;
  suggestedEmails: string[];
  discoveredRecruiters: DiscoveredContact[];
  googleSearchUrl: string;
  linkedinSearchUrl: string;
  recommendedIntroSubject: string;
  recommendedIntroBody: string;
}

