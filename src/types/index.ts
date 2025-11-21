
export enum OptimizeStatus {
  IDLE = 'IDLE',
  FETCHING_JOB = 'FETCHING_JOB',
  PARSING_RESUME = 'PARSING_RESUME',
  ANALYZING = 'ANALYZING',
  OPTIMIZING = 'OPTIMIZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface KeywordAnalysis {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  reasoning: string;
}

export interface OptimizationResult extends KeywordAnalysis {
  markdownContent: string; // Deprecated in favor of live editing
  jsonContent: ResumeSchema;
}

export interface ResumeProfile {
  network: string; // e.g. LinkedIn, Portfolio, GitHub
  url: string;
  username?: string;
  displayUrl?: boolean; // If true, shows the raw URL in the preview instead of the network label
}

// A simplified JSON resume schema for the "TS friendly" requirement
export interface ResumeSchema {
  meta: {
    sectionOrder: string[];
    visible: {
      education: boolean;
      experience: boolean;
      skills: boolean;
      projects: boolean;
      certifications: boolean;
      summary?: boolean; // Added summary visibility
      // Header granular visibility
      phone: boolean;
      location: boolean;
    };
  };
  basics: {
    name: string;
    email: string;
    phone: string;
    location: string;
    summary?: string; // Added summary field
    profiles: ResumeProfile[]; // Replaces simple strings for better "Name | Link" handling
  };
  skills: {
    category: string;
    keywords: string[];
  }[];
  experience: {
    id: string;
    company: string;
    position: string;
    startDate: string;
    endDate: string;
    highlights: string[];
    location?: string;
    visible?: boolean;
  }[];
  education: {
    id: string;
    institution: string;
    area: string;
    studyType: string;
    date: string;
    score?: string;
    location?: string;
    courses?: string[];
    visible?: boolean;
  }[];
  projects: {
    id: string;
    name: string;
    description: string;
    technologies: string[];
    link?: string;
    date?: string;
    visible?: boolean;
  }[];
  certifications: {
    id: string;
    name: string;
    issuer: string;
    date: string;
    visible?: boolean;
  }[];
}

export interface AutoTailorOptions {
  enableSummary: boolean;
  enableSkills: boolean;
  enableExperience: boolean;
  experienceMode: 'quick' | 'full';
  selectedKeywords: string[];
}

// --- SaaS Features Types ---

export type JobStatus = 'wishlist' | 'applied' | 'interviewing' | 'offer' | 'rejected';

export interface JobApplication {
  id: string;
  company: string;
  position: string;
  status: JobStatus;
  dateAdded: string;
  url?: string;
  salary?: string;
  notes?: string;
  nextActionDate?: string;
}

export interface CoverLetterOptions {
  tone: 'professional' | 'enthusiastic' | 'confident' | 'concise';
  includeRelocation: boolean;
}

export interface JobPosting {
  id: string;
  title: string;
  company: string;
  logo?: string;
  location: string;
  type: string; // Full-time, Contract
  salary?: string;
  postedAt: string; // e.g. "2 hours ago"
  description: string; // Short snippet
  url: string;
  tags: string[]; // e.g. "Remote", "Early Applicant"
  matchScore?: number; // 0-100 (Mocked for now)
  requirements?: string[];
}

