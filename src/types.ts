export interface Hackathon {
  id: string;
  title: string;
  prizePool: string;
  deadline: string;
  tags: string[];
  location: string;
  statusLabel: string;
  startDate?: string;
  endDate?: string;
  participantsCount: number;
  description: string;
  cardShadow: string;
  url?: string;
  organizer?: string;
  sourcePlatform?: string;
  mode?: 'online' | 'offline' | 'hybrid' | 'unknown';
  thumbnail?: string | null;
  apiStatus?: 'open' | 'closed' | 'upcoming' | 'ended' | null;
}

export type JourneyStepId =
  | 'registered'
  | 'project_created'
  | 'building'
  | 'submitted'
  | 'accepted';

export interface JourneyStepCompletion {
  stepId: JourneyStepId;
  completedAt: string;
}

export type TimelineEventType =
  | 'registered'
  | 'bookmarked'
  | 'project_created'
  | 'building'
  | 'submitted'
  | 'accepted'
  | 'stage_changed'
  | 'milestone_completed'
  | 'milestone_added'
  | 'team_member_added'
  | 'idea_validated'
  | 'note';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  label: string;
  description?: string;
  timestamp: string;
}

export type TrackedStage = 'Idea / Backlog' | 'In Progress' | 'Submitted' | 'Accepted / Win';

export interface TrackedApplication {
  id: string;
  title: string;
  hackathonName: string;
  hackathonId?: string;
  prizePool: string;
  deadline: string;
  stage: TrackedStage;
  concept: string;
  milestones: { id: string; text: string; completed: boolean }[];
  team: string[];
  createdAt: string;
  /** Ordered journey steps the user has completed (strict sequence). */
  completedSteps: JourneyStepCompletion[];
  timeline: TimelineEvent[];
}

export interface ValidatorResponse {
  feasibilityScore: number;
  originalityScore: number;
  brutalistDirectness: number;
  verdictSummary: string;
  critique: string;
  keyStrengths: string[];
  requiredUpgrades: string[];
  suggestedTeammates: string[];
  visualThemeProposal: string;
}
