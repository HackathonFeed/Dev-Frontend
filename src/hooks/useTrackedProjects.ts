import { useCallback, useEffect, useState } from 'react';
import {
  addTrackedMilestone,
  addTrackedNote,
  completeTrackedStep,
  deleteTrackedProject,
  listTrackedProjects,
  registerTrackedHackathon,
  toggleTrackedMilestone,
  undoTrackedStep,
} from '../api/trackedProjects';
import type { JourneyStepId, TrackedApplication, TrackedStage } from '../types';
import {
  appendEvent,
  completeJourneyStep,
  createTimelineEvent,
  createTrackedProject,
  deriveStageFromSteps,
  getNextStepId,
  isBackendProjectId,
  isStepComplete,
  loadTrackedProjects,
  mapTrackedProjectFromApi,
  saveTrackedProjects,
  stepActionKey,
  undoLastJourneyStep,
  upsertTrackedProject,
} from '../lib/trackedProjects';

type RegisterInput = {
  hackathonName: string;
  hackathonId?: string;
  prizePool: string;
  deadline: string;
};

function applyLocalRegistration(
  prev: TrackedApplication[],
  input: RegisterInput,
): TrackedApplication[] {
  const existingIdx = prev.findIndex(
    (a) =>
      (input.hackathonId && a.hackathonId === input.hackathonId) ||
      a.hackathonName === input.hackathonName,
  );

  if (existingIdx !== -1) {
    const existing = prev[existingIdx];
    if (isStepComplete(existing, 'registered')) {
      return prev;
    }

    const updated = completeJourneyStep(existing, 'registered');
    if (updated === existing) return prev;

    const copy = [...prev];
    copy.splice(existingIdx, 1);
    return [updated, ...copy];
  }

  const project = createTrackedProject({
    title: `${input.hackathonName} entry`,
    hackathonName: input.hackathonName,
    hackathonId: input.hackathonId,
    prizePool: input.prizePool,
    deadline: input.deadline,
    concept: 'Track your progress from registration through submission.',
    registrationOnly: true,
  });
  return [project, ...prev];
}

async function syncProjectFromApi(
  projectId: string,
  apiCall: () => Promise<ReturnType<typeof mapTrackedProjectFromApi> extends infer T ? never : unknown>,
  setTrackedAppsState: React.Dispatch<React.SetStateAction<TrackedApplication[]>>,
) {
  const project = await apiCall();
  const mapped = mapTrackedProjectFromApi(project as Awaited<ReturnType<typeof completeTrackedStep>>);
  setTrackedAppsState((prev) => upsertTrackedProject(prev, mapped));
}

export function useTrackedProjects(
  isAuthenticated: boolean,
  onError?: (message: string) => void,
) {
  const [trackedApps, setTrackedAppsState] = useState<TrackedApplication[]>(() => loadTrackedProjects());
  const [stepActionLoading, setStepActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      saveTrackedProjects(trackedApps);
    }
  }, [trackedApps, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    listTrackedProjects()
      .then((items) => {
        if (!cancelled) {
          setTrackedAppsState(items.map(mapTrackedProjectFromApi));
        }
      })
      .catch((err) => {
        if (!cancelled) {
          onError?.(err instanceof Error ? err.message : 'Failed to load tracked projects.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, onError]);

  const setTrackedApps = useCallback(
    (updater: TrackedApplication[] | ((prev: TrackedApplication[]) => TrackedApplication[])) => {
      setTrackedAppsState(updater);
    },
    [],
  );

  const addProject = useCallback(
    async (input: {
      title: string;
      hackathonName: string;
      hackathonId?: string;
      prizePool: string;
      deadline: string;
      concept: string;
    }) => {
      const project = createTrackedProject(input);
      setTrackedAppsState((prev) => [project, ...prev]);
      return project;
    },
    [],
  );

  const registerHackathonInterest = useCallback(
    async (input: RegisterInput) => {
      if (isAuthenticated && input.hackathonId) {
        const project = await registerTrackedHackathon(input.hackathonId);
        const mapped = mapTrackedProjectFromApi(project);
        setTrackedAppsState((prev) => upsertTrackedProject(prev, mapped));
        return;
      }

      setTrackedAppsState((prev) => applyLocalRegistration(prev, input));
    },
    [isAuthenticated],
  );

  const exportValidatedProject = useCallback(
    async (input: {
      title: string;
      hackathonName: string;
      hackathonId?: string;
      prizePool: string;
      deadline: string;
      concept: string;
      validationSummary: string;
      extraMilestones?: string[];
      extraTeam?: string[];
    }) => {
      const project = createTrackedProject({
        title: input.title,
        hackathonName: input.hackathonName,
        hackathonId: input.hackathonId,
        prizePool: input.prizePool,
        deadline: input.deadline,
        concept: input.concept,
      });

      let withValidation = appendEvent(
        project,
        createTimelineEvent('idea_validated', 'AI validation run', input.validationSummary),
      );

      if (input.extraMilestones?.length) {
        withValidation = {
          ...withValidation,
          milestones: [
            ...withValidation.milestones,
            ...input.extraMilestones.map((text, index) => ({
              id: `m-ai-${Date.now()}-${index}`,
              text,
              completed: false,
            })),
          ],
        };
      }

      if (input.extraTeam?.length) {
        withValidation = {
          ...withValidation,
          team: [...new Set([...withValidation.team, ...input.extraTeam])],
        };
      }

      setTrackedAppsState((prev) => [withValidation, ...prev]);
    },
    [],
  );

  const recordBookmark = useCallback((hackathonName: string, hackathonId?: string) => {
    setTrackedAppsState((prev) => {
      const idx = prev.findIndex(
        (a) => a.hackathonName === hackathonName || a.hackathonId === hackathonId,
      );
      if (idx === -1) return prev;

      const app = prev[idx];
      const already = app.timeline.some((e) => e.type === 'bookmarked');
      if (already) return prev;

      const next = appendEvent(
        app,
        createTimelineEvent(
          'bookmarked',
          'Saved hackathon',
          `Bookmarked ${hackathonName} for later.`,
        ),
      );

      const copy = [...prev];
      copy[idx] = next;
      return copy;
    });
  }, []);

  const completeStep = useCallback(
    async (appId: string, stepId: JourneyStepId) => {
      const loadingKey = stepActionKey(appId, stepId);
      setStepActionLoading(loadingKey);

      try {
        if (isAuthenticated && isBackendProjectId(appId)) {
          const project = await completeTrackedStep(appId, stepId);
          const mapped = mapTrackedProjectFromApi(project);
          setTrackedAppsState((prev) => upsertTrackedProject(prev, mapped));
          return;
        }

        setTrackedAppsState((prev) =>
          prev.map((app) => (app.id === appId ? completeJourneyStep(app, stepId) : app)),
        );
      } catch (err) {
        onError?.(err instanceof Error ? err.message : 'Failed to complete journey step.');
        throw err;
      } finally {
        setStepActionLoading((current) => (current === loadingKey ? null : current));
      }
    },
    [isAuthenticated, onError],
  );

  const undoLastStep = useCallback(
    async (appId: string) => {
      const loadingKey = stepActionKey(appId, 'undo');
      setStepActionLoading(loadingKey);

      try {
        if (isAuthenticated && isBackendProjectId(appId)) {
          const project = await undoTrackedStep(appId);
          const mapped = mapTrackedProjectFromApi(project);
          setTrackedAppsState((prev) => upsertTrackedProject(prev, mapped));
          return;
        }

        setTrackedAppsState((prev) =>
          prev.map((app) => (app.id === appId ? undoLastJourneyStep(app) : app)),
        );
      } catch (err) {
        onError?.(err instanceof Error ? err.message : 'Failed to undo journey step.');
        throw err;
      } finally {
        setStepActionLoading((current) => (current === loadingKey ? null : current));
      }
    },
    [isAuthenticated, onError],
  );

  /** Kanban / legacy — one journey step forward or back only. */
  const updateStage = useCallback(
    async (appId: string, nextStage: TrackedStage) => {
      const stageOrder: TrackedStage[] = [
        'Idea / Backlog',
        'In Progress',
        'Submitted',
        'Accepted / Win',
      ];

      const app = trackedApps.find((a) => a.id === appId);
      if (!app) return;

      const currentStage = deriveStageFromSteps(app.completedSteps);
      const currentIdx = stageOrder.indexOf(currentStage);
      const targetIdx = stageOrder.indexOf(nextStage);

      if (targetIdx === currentIdx + 1) {
        const nextStepId = getNextStepId(app);
        if (nextStepId) await completeStep(appId, nextStepId);
      } else if (targetIdx === currentIdx - 1) {
        await undoLastStep(appId);
      }
    },
    [trackedApps, completeStep, undoLastStep],
  );

  const toggleMilestone = useCallback(
    async (appId: string, milestoneId: string) => {
      try {
        if (isAuthenticated && isBackendProjectId(appId) && isBackendProjectId(milestoneId)) {
          const project = await toggleTrackedMilestone(appId, milestoneId);
          const mapped = mapTrackedProjectFromApi(project);
          setTrackedAppsState((prev) => upsertTrackedProject(prev, mapped));
          return;
        }

        setTrackedAppsState((prev) =>
          prev.map((app) => {
            if (app.id !== appId) return app;

            const milestone = app.milestones.find((m) => m.id === milestoneId);
            if (!milestone) return app;

            const willComplete = !milestone.completed;
            const nextMilestones = app.milestones.map((m) =>
              m.id === milestoneId ? { ...m, completed: willComplete } : m,
            );

            let next = { ...app, milestones: nextMilestones };
            if (willComplete) {
              next = appendEvent(
                next,
                createTimelineEvent(
                  'milestone_completed',
                  'Milestone completed',
                  milestone.text,
                ),
              );
            }
            return next;
          }),
        );
      } catch (err) {
        onError?.(err instanceof Error ? err.message : 'Failed to update milestone.');
      }
    },
    [isAuthenticated, onError],
  );

  const addMilestone = useCallback(
    async (appId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      try {
        if (isAuthenticated && isBackendProjectId(appId)) {
          const project = await addTrackedMilestone(appId, trimmed);
          const mapped = mapTrackedProjectFromApi(project);
          setTrackedAppsState((prev) => upsertTrackedProject(prev, mapped));
          return;
        }

        setTrackedAppsState((prev) =>
          prev.map((app) => {
            if (app.id !== appId) return app;

            const newMilestone = {
              id: `m-added-${Date.now()}`,
              text: trimmed,
              completed: false,
            };

            return appendEvent(
              { ...app, milestones: [...app.milestones, newMilestone] },
              createTimelineEvent('milestone_added', 'Task added', trimmed),
            );
          }),
        );
      } catch (err) {
        onError?.(err instanceof Error ? err.message : 'Failed to add milestone.');
      }
    },
    [isAuthenticated, onError],
  );

  const addSpecialist = useCallback((appId: string, role: string) => {
    const trimmed = role.trim();
    if (!trimmed) return;

    setTrackedAppsState((prev) =>
      prev.map((app) => {
        if (app.id !== appId) return app;

        return appendEvent(
          { ...app, team: [...app.team, trimmed] },
          createTimelineEvent('team_member_added', 'Team member added', trimmed),
        );
      }),
    );
  }, []);

  const recordValidation = useCallback((appId: string, summary: string) => {
    setTrackedAppsState((prev) =>
      prev.map((app) => {
        if (app.id !== appId) return app;

        return appendEvent(
          app,
          createTimelineEvent('idea_validated', 'AI validation run', summary),
        );
      }),
    );
  }, []);

  const addNote = useCallback(
    async (appId: string, note: string) => {
      const trimmed = note.trim();
      if (!trimmed) return;

      try {
        if (isAuthenticated && isBackendProjectId(appId)) {
          const project = await addTrackedNote(appId, trimmed);
          const mapped = mapTrackedProjectFromApi(project);
          setTrackedAppsState((prev) => upsertTrackedProject(prev, mapped));
          return;
        }

        setTrackedAppsState((prev) =>
          prev.map((app) => {
            if (app.id !== appId) return app;

            return appendEvent(
              app,
              createTimelineEvent('note', 'Note added', trimmed),
            );
          }),
        );
      } catch (err) {
        onError?.(err instanceof Error ? err.message : 'Failed to add note.');
      }
    },
    [isAuthenticated, onError],
  );

  const deleteProject = useCallback(
    async (appId: string) => {
      try {
        if (isAuthenticated && isBackendProjectId(appId)) {
          await deleteTrackedProject(appId);
        }
        setTrackedAppsState((prev) => prev.filter((app) => app.id !== appId));
      } catch (err) {
        onError?.(err instanceof Error ? err.message : 'Failed to delete tracked project.');
      }
    },
    [isAuthenticated, onError],
  );

  return {
    trackedApps,
    setTrackedApps,
    stepActionLoading,
    addProject,
    registerHackathonInterest,
    exportValidatedProject,
    recordBookmark,
    completeStep,
    undoLastStep,
    updateStage,
    toggleMilestone,
    addMilestone,
    addSpecialist,
    recordValidation,
    addNote,
    deleteProject,
  };
}
