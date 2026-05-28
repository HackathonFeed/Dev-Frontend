export interface APIResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  details?: Record<string, unknown>;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface TokenPayload {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
}

export type SubscriptionPlan = 'hacker' | 'builder' | 'champion';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: 'user' | 'admin' | 'moderator';
  interests: string[];
  avatar_url?: string | null;
  github_username?: string | null;
  linkedin_username?: string | null;
  twitter_username?: string | null;
  website?: string | null;
  subscription_plan: SubscriptionPlan;
  ai_points: number;              // -1 = unlimited
  plan_expires_at?: string | null;
  created_at: string;
}

export interface PlanInfo {
  key: SubscriptionPlan;
  name: string;
  price_usd: number;
  price_inr: number;   // 0 = free, else rupees
  points: number;
  messages_per_cycle: string;
  features: string[];
}

export interface CreateOrderResponse {
  order_id: string;
  amount: number;      // paise (INR × 100)
  currency: string;
  key_id: string;
  plan: SubscriptionPlan;
  plan_name: string;
}

export interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  plan: SubscriptionPlan;
}

export interface SubscriptionStatus {
  plan: SubscriptionPlan;
  ai_points: number;
  ai_message_cost: number;
  messages_remaining: number;     // -1 = unlimited
  plan_expires_at: string | null;
}

export interface HackathonApi {
  id: string;
  title: string;
  platform_id: string | null;
  organizer: string;
  url: string;
  thumbnail: string | null;
  start_date: string | null;
  end_date: string | null;
  deadline: string | null;
  prize_pool: string;
  mode: 'online' | 'offline' | 'hybrid' | 'unknown';
  location: string | null;
  status: 'open' | 'closed' | 'upcoming' | 'ended' | null;
  status_label?: string | null;
  registrations: number | null;
  eligibility: string[];
  team_size: string;
  categories: string[];
  tags: string[];
  sponsors: string[];
  source_platform: string;
  scraped_at: string | null;
}

export interface Bookmark {
  id: string;
  user_id: string;
  hackathon_id: string;
  created_at: string;
  hackathon: HackathonApi | null;
}

export interface TrackedProjectStepApi {
  step_id: string;
  completed_at: string;
}

export interface TrackedProjectTimelineEventApi {
  id: string;
  type: string;
  label: string;
  description?: string | null;
  timestamp: string;
}

export interface TrackedProjectMilestoneApi {
  id: string;
  text: string;
  completed: boolean;
}

export interface TrackedProjectApi {
  id: string;
  title: string;
  hackathon_name: string;
  hackathon_id: string;
  prize_pool: string;
  deadline: string;
  stage: string;
  concept: string;
  milestones: TrackedProjectMilestoneApi[];
  team: string[];
  created_at: string;
  completed_steps: TrackedProjectStepApi[];
  timeline: TrackedProjectTimelineEventApi[];
  hackathon?: HackathonApi | null;
}

export interface ThemeCount {
  theme: string;
  count: number;
}

export interface PlatformStats {
  platform: string;
  total_count: number;
  open_count: number;
}

export interface AdminStats {
  total_hackathons: number;
  total_searches: number;
  events: Record<string, unknown>;
}

export type UserRole = 'user' | 'admin' | 'moderator';

export interface AdminUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  subscription_plan: SubscriptionPlan;
  ai_points: number;
  plan_expires_at: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

export interface AdminUserListResponse {
  items: AdminUser[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface LeaderboardEntryApi {
  user_id: string;
  name: string;
  username?: string | null;
  avatar_url?: string | null;
  participations: number;
  submissions: number;
  wins: number;
  rank: number;
}

export interface UserHackathonRecordApi {
  project_id: string;
  hackathon_id: string;
  hackathon_name: string;
  prize_pool: string;
  deadline: string;
  stage: string;
  outcome: 'won' | 'submitted' | 'participated' | 'tracking';
  registered_at: string | null;
  submitted_at: string | null;
  won_at: string | null;
}

export interface UserHackathonStatsApi {
  user: {
    id: string;
    name: string;
    username: string;
    interests: string[];
    avatar_url?: string | null;
    github_username?: string | null;
    linkedin_username?: string | null;
    twitter_username?: string | null;
    website?: string | null;
    created_at: string;
  };
  participations: number;
  submissions: number;
  wins: number;
  hackathons: UserHackathonRecordApi[];
  activity?: { date: string; count: number }[];
}

export interface ProjectMemberApi {
  username: string;
  full_name?: string | null;
  profile_image?: string | null;
}

export interface ProjectDescriptionSectionApi {
  title: string;
  content: string;
}

export interface ProjectApi {
  id: string;
  title: string;
  tagline: string | null;
  url: string;
  thumbnail: string | null;
  description: string | null;
  description_sections: ProjectDescriptionSectionApi[];
  hackathon_name: string | null;
  hackathon_url: string | null;
  team_members: ProjectMemberApi[];
  technologies: string[];
  tags: string[];
  platforms: string[];
  likes_count: number | null;
  views: number | null;
  github_url: string | null;
  demo_url: string | null;
  prize: string | null;
  prize_description: string | null;
  is_winner: boolean;
  source_platform: string;
  scraped_at: string | null;
}

export interface ProjectListParams {
  page?: number;
  page_size?: number;
  search?: string;
  hackathon?: string;
  technology?: string;
  platform?: string;
  is_winner?: boolean;
  sort?: 'likes' | 'views' | 'recent';
}

export interface ProjectPlatformStats {
  platform: string;
  count: number;
}

export interface ProjectTechnologyStats {
  technology: string;
  count: number;
}

export interface HackathonListParams {
  page?: number;
  page_size?: number;
  theme?: string;
  mode?: string;
  platform?: string;
  sort?: 'deadline' | 'registrations' | 'scraped_at' | 'start_date';
  only_open?: boolean;
  status?: string;
}

export interface HackathonSearchParams extends HackathonListParams {
  search: string;
}
