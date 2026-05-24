import type {
  JourneyStepCompletion,
  JourneyStepId,
  TimelineEvent,
  TimelineEventType,
  TrackedApplication,
  TrackedStage,
} from '../types';
import type { TrackedProjectApi } from '../api/types';

export function mapTrackedProjectFromApi(project: TrackedProjectApi): TrackedApplication {
  return migrateTrackedApplication({
    id: project.id,
    title: project.title,
    hackathonName: project.hackathon_name,
    hackathonId: project.hackathon_id,
    prizePool: project.prize_pool,
    deadline: project.deadline,
    stage: project.stage as TrackedStage,
    concept: project.concept,
    milestones: project.milestones,
    team: project.team,
    createdAt: project.created_at,
    completedSteps: project.completed_steps.map((step) => ({
      stepId: step.step_id as JourneyStepId,
      completedAt: step.completed_at,
    })),
    timeline: project.timeline.map((event) => ({
      id: event.id,
      type: event.type as TimelineEventType,
      label: event.label,
      description: event.description ?? undefined,
      timestamp: event.timestamp,
    })),
  });
}

export function upsertTrackedProject(
  apps: TrackedApplication[],
  project: TrackedApplication,
): TrackedApplication[] {
  const without = apps.filter(
    (app) =>
      app.id !== project.id &&
      !(project.hackathonId && app.hackathonId === project.hackathonId),
  );
  return [project, ...without];
}

export function isBackendProjectId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export function stepActionKey(appId: string, action: JourneyStepId | 'undo'): string {
  return `${appId}:${action}`;
}

export const TRACKED_PROJECTS_STORAGE_KEY = 'hackathon_feed_tracked_projects';

export const JOURNEY_STEPS: {
  id: JourneyStepId;
  label: string;
  description: string;
  stage: TrackedStage;
  timelineType: TimelineEventType;
}[] = [
  {
    id: 'registered',
    label: 'Registered',
    description: 'Signed up for the hackathon.',
    stage: 'Idea / Backlog',
    timelineType: 'registered',
  },
  {
    id: 'project_created',
    label: 'Project created',
    description: 'Defined your project name and idea.',
    stage: 'Idea / Backlog',
    timelineType: 'project_created',
  },
  {
    id: 'building',
    label: 'Building',
    description: 'Actively developing your prototype.',
    stage: 'In Progress',
    timelineType: 'building',
  },
  {
    id: 'submitted',
    label: 'Submitted',
    description: 'Sent your final submission to organizers.',
    stage: 'Submitted',
    timelineType: 'submitted',
  },
  {
    id: 'accepted',
    label: 'Accepted / won',
    description: 'Received results — accepted or won a prize.',
    stage: 'Accepted / Win',
    timelineType: 'accepted',
  },
];

export function nowIso(): string {
  return new Date().toISOString();
}

export function createTimelineEvent(
  type: TimelineEventType,
  label: string,
  description?: string,
  timestamp?: string,
): TimelineEvent {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    label,
    description,
    timestamp: timestamp ?? nowIso(),
  };
}

export function stageLabel(stage: TrackedStage): string {
  switch (stage) {
    case 'Idea / Backlog':
      return 'Planning';
    case 'In Progress':
      return 'Building';
    case 'Submitted':
      return 'Submitted';
    case 'Accepted / Win':
      return 'Accepted / Won';
  }
}

export function stageDescription(stage: TrackedStage): string {
  switch (stage) {
    case 'Idea / Backlog':
      return 'Project is in the idea and planning phase.';
    case 'In Progress':
      return 'Active development — building the prototype.';
    case 'Submitted':
      return 'Final submission sent to hackathon organizers.';
    case 'Accepted / Win':
      return 'Project accepted or won a prize.';
  }
}

function sortTimeline(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

export function appendEvent(
  app: TrackedApplication,
  event: TimelineEvent,
): TrackedApplication {
  return {
    ...app,
    timeline: sortTimeline([...app.timeline, event]),
  };
}

export function getStepDef(stepId: JourneyStepId) {
  return JOURNEY_STEPS.find((s) => s.id === stepId)!;
}

export function getNextStepId(app: TrackedApplication): JourneyStepId | null {
  const next = JOURNEY_STEPS[app.completedSteps.length];
  return next?.id ?? null;
}

export function isStepComplete(app: TrackedApplication, stepId: JourneyStepId): boolean {
  return app.completedSteps.some((s) => s.stepId === stepId);
}

export function isHackathonRegistered(
  apps: TrackedApplication[],
  hack: { title: string; id?: string },
): boolean {
  return apps.some(
    (app) =>
      ((hack.id && app.hackathonId === hack.id) || app.hackathonName === hack.title) &&
      isStepComplete(app, 'registered'),
  );
}

export function deriveStageFromSteps(completedSteps: JourneyStepCompletion[]): TrackedStage {
  if (completedSteps.length === 0) return 'Idea / Backlog';
  const last = completedSteps[completedSteps.length - 1];
  return getStepDef(last.stepId).stage;
}

export function journeyProgressPercent(app: TrackedApplication): number {
  return Math.round((app.completedSteps.length / JOURNEY_STEPS.length) * 100);
}

export function getStepStatus(
  app: TrackedApplication,
  stepId: JourneyStepId,
): 'completed' | 'current' | 'locked' {
  const index = JOURNEY_STEPS.findIndex((s) => s.id === stepId);
  const completedCount = app.completedSteps.length;
  if (index < completedCount) return 'completed';
  if (index === completedCount) return 'current';
  return 'locked';
}

export function getStepCompletionTime(
  app: TrackedApplication,
  stepId: JourneyStepId,
): string | undefined {
  return app.completedSteps.find((s) => s.stepId === stepId)?.completedAt;
}

function inferCompletedStepsFromLegacy(
  stage: TrackedStage,
  title: string,
  createdAt: string,
): JourneyStepCompletion[] {
  const steps: JourneyStepCompletion[] = [
    { stepId: 'registered', completedAt: createdAt },
  ];

  const hasProject = title && !title.endsWith(' entry');
  if (hasProject || stage !== 'Idea / Backlog') {
    steps.push({ stepId: 'project_created', completedAt: createdAt });
  }
  if (stage === 'In Progress' || stage === 'Submitted' || stage === 'Accepted / Win') {
    steps.push({ stepId: 'building', completedAt: createdAt });
  }
  if (stage === 'Submitted' || stage === 'Accepted / Win') {
    steps.push({ stepId: 'submitted', completedAt: createdAt });
  }
  if (stage === 'Accepted / Win') {
    steps.push({ stepId: 'accepted', completedAt: createdAt });
  }

  return steps;
}

function rebuildJourneyTimelineEvents(
  app: TrackedApplication,
  completedSteps: JourneyStepCompletion[],
): TimelineEvent[] {
  const extras = app.timeline.filter(
    (e) =>
      e.type === 'bookmarked' ||
      e.type === 'note' ||
      e.type === 'milestone_completed' ||
      e.type === 'milestone_added' ||
      e.type === 'team_member_added' ||
      e.type === 'idea_validated',
  );

  const journeyEvents = completedSteps.map(({ stepId, completedAt }) => {
    const def = getStepDef(stepId);
    return createTimelineEvent(def.timelineType, def.label, def.description, completedAt);
  });

  return sortTimeline([...journeyEvents, ...extras]);
}

export function completeJourneyStep(
  app: TrackedApplication,
  stepId: JourneyStepId,
): TrackedApplication {
  const nextId = getNextStepId(app);
  if (nextId !== stepId) return app;

  const def = getStepDef(stepId);
  const completedAt = nowIso();
  const completedSteps = [...app.completedSteps, { stepId, completedAt }];
  const stage = deriveStageFromSteps(completedSteps);

  const updated: TrackedApplication = {
    ...app,
    completedSteps,
    stage,
    timeline: rebuildJourneyTimelineEvents(app, completedSteps),
  };

  return updated;
}

export function completeJourneySteps(
  app: TrackedApplication,
  stepIds: JourneyStepId[],
): TrackedApplication {
  let current = app;
  for (const stepId of stepIds) {
    current = completeJourneyStep(current, stepId);
  }
  return current;
}

export function undoLastJourneyStep(app: TrackedApplication): TrackedApplication {
  if (app.completedSteps.length === 0) return app;

  const completedSteps = app.completedSteps.slice(0, -1);
  const stage = deriveStageFromSteps(completedSteps);

  return {
    ...app,
    completedSteps,
    stage,
    timeline: rebuildJourneyTimelineEvents(app, completedSteps),
  };
}

export function migrateTrackedApplication(raw: Partial<TrackedApplication>): TrackedApplication {
  const createdAt = raw.createdAt ?? nowIso();
  const stage = raw.stage ?? 'Idea / Backlog';
  const milestones = raw.milestones ?? [];
  const team = raw.team ?? ['Lead Builder'];
  const title = raw.title ?? 'Untitled project';

  let completedSteps = raw.completedSteps ?? [];
  if (completedSteps.length === 0) {
    completedSteps = inferCompletedStepsFromLegacy(stage, title, createdAt);
  }

  const timeline = raw.timeline?.length
    ? rebuildJourneyTimelineEvents(
        { ...(raw as TrackedApplication), timeline: raw.timeline, completedSteps },
        completedSteps,
      )
    : rebuildJourneyTimelineEvents(
        { ...(raw as TrackedApplication), timeline: [], completedSteps },
        completedSteps,
      );

  return {
    id: raw.id ?? `tracked-${Date.now()}`,
    title,
    hackathonName: raw.hackathonName ?? 'Unknown hackathon',
    hackathonId: raw.hackathonId,
    prizePool: raw.prizePool ?? '—',
    deadline: raw.deadline ?? '',
    stage: deriveStageFromSteps(completedSteps),
    concept: raw.concept ?? '',
    milestones,
    team,
    createdAt,
    completedSteps,
    timeline,
  };
}

export function loadTrackedProjects(): TrackedApplication[] {
  try {
    const stored = localStorage.getItem(TRACKED_PROJECTS_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as Partial<TrackedApplication>[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map(migrateTrackedApplication);
  } catch {
    return [];
  }
}

export function saveTrackedProjects(apps: TrackedApplication[]): void {
  try {
    localStorage.setItem(TRACKED_PROJECTS_STORAGE_KEY, JSON.stringify(apps));
  } catch (e) {
    console.error('Failed to persist tracked projects:', e);
  }
}

export function createTrackedProject(input: {
  title: string;
  hackathonName: string;
  hackathonId?: string;
  prizePool: string;
  deadline: string;
  concept: string;
  /** Quick track from card — only "registered" is completed initially. */
  registrationOnly?: boolean;
}): TrackedApplication {
  const createdAt = nowIso();
  const id = `tracked-${Date.now()}`;

  let app: TrackedApplication = {
    id,
    title: input.title,
    hackathonName: input.hackathonName,
    hackathonId: input.hackathonId,
    prizePool: input.prizePool,
    deadline: input.deadline,
    stage: 'Idea / Backlog',
    concept: input.concept || 'No written overview yet.',
    milestones: [
      {
        id: `m-${Date.now()}-1`,
        text: 'Assemble core stack and initial repository setup',
        completed: false,
      },
      {
        id: `m-${Date.now()}-2`,
        text: 'Validate idea with AI or team feedback',
        completed: false,
      },
    ],
    team: ['Lead Builder'],
    createdAt,
    completedSteps: [],
    timeline: [],
  };

  if (input.registrationOnly) {
    app = completeJourneyStep(app, 'registered');
  } else {
    app = completeJourneySteps(app, ['registered', 'project_created']);
  }

  return app;
}

export function formatTimelineDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function formatDeadline(deadline: string): string {
  if (!deadline) return '—';
  try {
    return new Date(deadline).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return deadline;
  }
}

export function eventAccent(type: TimelineEventType): string {
  switch (type) {
    case 'registered':
      return 'bg-[#0055ff]';
    case 'bookmarked':
      return 'bg-[#ffcc00]';
    case 'project_created':
      return 'bg-[#1a1a1a]';
    case 'building':
      return 'bg-[#0055ff]';
    case 'submitted':
      return 'bg-[#e63b2e]';
    case 'accepted':
      return 'bg-emerald-500';
    case 'stage_changed':
      return 'bg-[#e63b2e]';
    case 'milestone_completed':
      return 'bg-emerald-500';
    case 'milestone_added':
      return 'bg-zinc-400';
    case 'team_member_added':
      return 'bg-violet-500';
    case 'idea_validated':
      return 'bg-secondary';
    case 'note':
    default:
      return 'bg-zinc-500';
  }
}

export function supplementalTimelineEvents(app: TrackedApplication): TimelineEvent[] {
  const journeyTypes = new Set<string>(JOURNEY_STEPS.map((s) => s.timelineType));
  return app.timeline.filter((e) => !journeyTypes.has(e.type));
}
