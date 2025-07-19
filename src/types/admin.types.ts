export interface User {
  id: string;
  handle: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  role?: string;
  auth_user_id?: string;
  created_at: string;
  updated_at?: string;
  agent_profiles?: AgentProfile[];
  personal_stories?: PersonalStory;
}

export interface AgentProfile {
  id: string;
  user_id: string;
  agent_name: string;
  communication_style?: string;
  created_at: string;
  updated_at?: string;
}

export interface PersonalStory {
  id: string;
  user_id: string;
  narrative: string;
  current_focus?: string[];
  seeking_connections?: string[];
  offering_expertise?: string[];
  expertise?: string[];
  completeness_score: number;
  created_at: string;
  updated_at?: string;
  summary?: string;
}

export interface AdminStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export type UserStatus = "PENDING" | "APPROVED" | "REJECTED";
export type UserRole = "user" | "admin" | "moderator";

export interface UserFilter {
  status?: UserStatus;
  role?: UserRole;
  searchQuery?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface EmailTemplate {
  subject: string;
  template: string;
  variables?: Record<string, any>;
}
