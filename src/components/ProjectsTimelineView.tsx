import React, { useMemo, useState } from 'react';
import {
  Bookmark,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Flag,
  Lock,
  Loader2,
  RotateCcw,
  Sparkles,
  Trash2,
  Trophy,
} from 'lucide-react';
import type { JourneyStepId, TrackedApplication } from '../types';
import {
  JOURNEY_STEPS,
  formatDeadline,
  formatTimelineDate,
  getNextStepId,
  getStepCompletionTime,
  getStepStatus,
  journeyProgressPercent,
  stageLabel,
  stepActionKey,
  supplementalTimelineEvents,
} from '../lib/trackedProjects';

interface ProjectsTimelineViewProps {
  trackedApps: TrackedApplication[];
  stepActionLoading?: string | null;
  onCompleteStep: (appId: string, stepId: JourneyStepId) => void | Promise<void>;
  onUndoLastStep: (appId: string) => void | Promise<void>;
  onToggleMilestone: (appId: string, milestoneId: string) => void;
  onAddMilestone: (appId: string, text: string) => void;
  onAddNote: (appId: string, note: string) => void;
  onDeleteProject: (appId: string) => void;
}

function stageBadgeClass(stage: TrackedApplication['stage']): string {
  switch (stage) {
    case 'Idea / Backlog':
      return 'bg-zinc-100 text-zinc-700 border-zinc-400';
    case 'In Progress':
      return 'bg-blue-50 text-blue-700 border-blue-300';
    case 'Submitted':
      return 'bg-[#ffcc00]/30 text-[#1a1a1a] border-[#ffcc00]';
    case 'Accepted / Win':
      return 'bg-emerald-50 text-emerald-700 border-emerald-400';
  }
}

export const ProjectsTimelineView: React.FC<ProjectsTimelineViewProps> = ({
  trackedApps,
  stepActionLoading = null,
  onCompleteStep,
  onUndoLastStep,
  onToggleMilestone,
  onAddMilestone,
  onAddNote,
  onDeleteProject,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(
    trackedApps[0]?.id ?? null,
  );
  const [comingSoonOpen, setComingSoonOpen] = useState(false);
  const [confirmStep, setConfirmStep] = useState<{
    appId: string;
    stepId: JourneyStepId;
    label: string;
  } | null>(null);

  const sortedApps = useMemo(
    () =>
      [...trackedApps].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [trackedApps],
  );

  const handleCompleteClick = async (appId: string, stepId: JourneyStepId, label: string) => {
    if (stepId === 'submitted' || stepId === 'accepted') {
      setConfirmStep({ appId, stepId, label });
    } else {
      await onCompleteStep(appId, stepId);
    }
  };

  const isStepLoading = (appId: string, stepId: JourneyStepId) =>
    stepActionLoading === stepActionKey(appId, stepId);

  const isUndoLoading = (appId: string) =>
    stepActionLoading === stepActionKey(appId, 'undo');

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-4 border-black pb-4 mb-2">
        <div>
          <span className="font-mono text-[10px] bg-black text-[#ffcc00] py-1 px-3.5 uppercase font-bold tracking-widest select-none">
            Hackathon journey tracker
          </span>
          <h2 className="font-headline font-black text-4xl md:text-5xl uppercase tracking-tighter mt-2">
            Tracking
          </h2>
        </div>
        <p className="font-mono text-[11px] uppercase text-zinc-500 font-bold max-w-md text-center md:text-right mt-2 md:mt-0 leading-tight">
          Complete each step in order — registered, project created, building, submitted, then results. Undo if you mark something by mistake.
        </p>
      </div>

      <div className="space-y-6">
          {sortedApps.length === 0 ? (
            <div className="border-4 border-dashed border-zinc-300 py-24 px-6 text-center">
              <Clock className="w-10 h-10 mx-auto text-zinc-400 mb-4" />
              <p className="font-headline font-black text-xl uppercase text-zinc-500 mb-2">
                No timelines yet
              </p>
              <p className="font-mono text-xs uppercase font-bold text-zinc-400 max-w-sm mx-auto">
                Click &quot;Register&quot; on any hackathon card to start your journey at step 1.
              </p>
            </div>
          ) : (
            sortedApps.map((app) => {
              const isExpanded = expandedId === app.id;
              const progress = journeyProgressPercent(app);
              const completedMilestones = app.milestones.filter((m) => m.completed).length;
              const nextStepId = getNextStepId(app);
              const extras = supplementalTimelineEvents(app);
              const buildingUnlocked = app.completedSteps.some((s) => s.stepId === 'building');

              return (
                <article
                  key={app.id}
                  className="bg-white border-3 border-black shadow-[5px_5px_0px_0px_#1a1a1a] rounded-[6px] overflow-hidden"
                >
                  <header className="p-5 md:p-6 border-b-3 border-black bg-[#faf7f2]">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10px] font-black uppercase bg-black text-[#ffcc00] px-2 py-0.5 border border-black">
                            {app.hackathonName}
                          </span>
                          <span
                            className={`font-mono text-[9px] font-black uppercase px-2 py-0.5 border-2 ${stageBadgeClass(app.stage)}`}
                          >
                            {stageLabel(app.stage)}
                          </span>
                          <span className="font-mono text-[9px] font-bold uppercase text-zinc-500">
                            Step {app.completedSteps.length}/{JOURNEY_STEPS.length}
                          </span>
                        </div>
                        <h3 className="font-headline font-black text-2xl md:text-3xl uppercase tracking-tight text-[#1a1a1a] truncate">
                          {app.title}
                        </h3>
                        {app.concept && (
                          <p className="font-mono text-[11px] uppercase text-zinc-500 font-bold line-clamp-2">
                            {app.concept}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-4 pt-1 font-mono text-[10px] uppercase font-bold text-zinc-600">
                          <span className="flex items-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5 text-[#ffcc00]" />
                            {app.prizePool}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            Due {formatDeadline(app.deadline)}
                          </span>
                          {buildingUnlocked && (
                            <span className="flex items-center gap-1.5">
                              <Flag className="w-3.5 h-3.5" />
                              {completedMilestones}/{app.milestones.length} tasks
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setComingSoonOpen(true)}
                          className="bg-zinc-100 border-2 border-black font-headline font-black text-[9px] py-2 px-3 uppercase hover:bg-[#ffcc00] cursor-pointer flex items-center gap-1"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          AI check
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteProject(app.id)}
                          className="text-zinc-400 hover:text-[#e63b2e] p-2 cursor-pointer bg-transparent border-none"
                          title="Remove timeline"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : app.id)}
                          className="border-2 border-black p-2 bg-white hover:bg-[#ffcc00] cursor-pointer"
                          aria-expanded={isExpanded}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex justify-between font-mono text-[9px] uppercase font-bold text-zinc-500 mb-1">
                        <span>Journey progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-2 bg-zinc-200 border-2 border-black">
                        <div
                          className="h-full bg-[#0055ff] transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </header>

                  {isExpanded && (
                    <div className="p-5 md:p-6 grid grid-cols-1 xl:grid-cols-2 gap-8">
                      <section>
                        <div className="flex items-center justify-between mb-4 gap-2">
                          <h4 className="font-headline font-black text-sm uppercase flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Your journey
                          </h4>
                          {app.completedSteps.length > 0 && (
                            <button
                              type="button"
                              onClick={() => void onUndoLastStep(app.id)}
                              disabled={isUndoLoading(app.id)}
                              className="font-mono text-[9px] uppercase font-bold text-[#e63b2e] border border-[#e63b2e] px-2 py-1 hover:bg-[#e63b2e] hover:text-white cursor-pointer flex items-center gap-1 bg-transparent disabled:opacity-60 disabled:cursor-wait"
                            >
                              {isUndoLoading(app.id) ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3 h-3" />
                              )}
                              {isUndoLoading(app.id) ? 'Undoing...' : 'Undo last step'}
                            </button>
                          )}
                        </div>

                        <ol className="space-y-3">
                          {JOURNEY_STEPS.map((step, index) => {
                            const status = getStepStatus(app, step.id);
                            const completedAt = getStepCompletionTime(app, step.id);
                            const isNext = nextStepId === step.id;

                            return (
                              <li
                                key={step.id}
                                className={`border-2 border-black p-3 ${
                                  status === 'completed'
                                    ? 'bg-emerald-50'
                                    : status === 'current'
                                      ? 'bg-[#ffcc00]/20 ring-2 ring-[#ffcc00]'
                                      : 'bg-zinc-100 opacity-60'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <span
                                    className={`w-7 h-7 shrink-0 border-2 border-black flex items-center justify-center font-headline font-black text-xs ${
                                      status === 'completed'
                                        ? 'bg-emerald-500 text-white'
                                        : status === 'current'
                                          ? 'bg-[#ffcc00] text-black'
                                          : 'bg-zinc-300 text-zinc-500'
                                    }`}
                                  >
                                    {status === 'completed' ? (
                                      <Check className="w-4 h-4" strokeWidth={3} />
                                    ) : status === 'locked' ? (
                                      <Lock className="w-3.5 h-3.5" />
                                    ) : (
                                      index + 1
                                    )}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-headline font-black text-xs uppercase tracking-tight">
                                      {step.label}
                                    </p>
                                    <p className="font-mono text-[10px] uppercase text-zinc-600 font-bold mt-0.5">
                                      {step.description}
                                    </p>
                                    {completedAt && (
                                      <time className="font-mono text-[9px] uppercase text-zinc-500 font-bold mt-1 block">
                                        Done {formatTimelineDate(completedAt)}
                                      </time>
                                    )}
                                    {isNext && (
                                      <button
                                        type="button"
                                        onClick={() => void handleCompleteClick(app.id, step.id, step.label)}
                                        disabled={isStepLoading(app.id, step.id)}
                                        className="mt-2 bg-black text-white font-headline font-black text-[10px] uppercase px-3 py-1.5 border-2 border-black hover:bg-[#0055ff] cursor-pointer disabled:opacity-60 disabled:cursor-wait inline-flex items-center gap-1.5"
                                      >
                                        {isStepLoading(app.id, step.id) ? (
                                          <>
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            Saving...
                                          </>
                                        ) : (
                                          `Mark step ${index + 1} complete`
                                        )}
                                      </button>
                                    )}
                                    {status === 'locked' && (
                                      <p className="font-mono text-[9px] uppercase text-zinc-400 font-bold mt-1">
                                        Complete step {index} first
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ol>

                        {extras.length > 0 && (
                          <div className="mt-6 pt-4 border-t-2 border-dashed border-zinc-300">
                            <p className="font-mono text-[9px] uppercase font-bold text-zinc-500 mb-2">
                              Other activity
                            </p>
                            <ul className="space-y-2">
                              {extras.map((event) => (
                                <li
                                  key={event.id}
                                  className="font-mono text-[10px] uppercase font-bold text-zinc-600 border-l-2 border-zinc-300 pl-2"
                                >
                                  {event.label}
                                  {event.type === 'bookmarked' && (
                                    <Bookmark className="w-3 h-3 inline ml-1 text-[#ffcc00]" />
                                  )}
                                  <span className="text-zinc-400 block text-[9px]">
                                    {formatTimelineDate(event.timestamp)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </section>

                      <section className="space-y-6">
                        {buildingUnlocked ? (
                          <div>
                            <p className="font-mono text-[10px] uppercase font-bold text-zinc-500 mb-2">
                              Build tasks (optional)
                            </p>
                            <ul className="space-y-2">
                              {app.milestones.map((m) => (
                                <li key={m.id}>
                                  <button
                                    type="button"
                                    onClick={() => onToggleMilestone(app.id, m.id)}
                                    className={`w-full text-left flex items-start gap-2 p-2 border-2 border-black cursor-pointer transition-colors ${
                                      m.completed
                                        ? 'bg-emerald-50 line-through text-zinc-400'
                                        : 'bg-white hover:bg-[#ffcc00]/20'
                                    }`}
                                  >
                                    <span
                                      className={`w-4 h-4 shrink-0 mt-0.5 border-2 border-black ${m.completed ? 'bg-emerald-500' : 'bg-white'}`}
                                    />
                                    <span className="font-mono text-[10px] uppercase font-bold">
                                      {m.text}
                                    </span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                            <form
                              className="mt-2 flex gap-1"
                              onSubmit={(e) => {
                                e.preventDefault();
                                const input = e.currentTarget.elements.namedItem(
                                  'milestone',
                                ) as HTMLInputElement;
                                if (input?.value) {
                                  onAddMilestone(app.id, input.value);
                                  input.value = '';
                                }
                              }}
                            >
                              <input
                                name="milestone"
                                type="text"
                                placeholder="Add task..."
                                className="flex-1 border-2 border-black p-1.5 font-mono text-[10px] uppercase font-bold focus:outline-none"
                              />
                              <button
                                type="submit"
                                className="bg-[#1a1a1a] text-white font-mono text-[9px] font-black px-2 cursor-pointer border-none"
                              >
                                +
                              </button>
                            </form>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-zinc-300 p-4 font-mono text-[10px] uppercase font-bold text-zinc-400 text-center">
                            Reach the &quot;Building&quot; step to unlock task checklist
                          </div>
                        )}

                        <form
                          className="flex gap-2"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const input = e.currentTarget.elements.namedItem(
                              'note',
                            ) as HTMLInputElement;
                            if (input?.value) {
                              onAddNote(app.id, input.value);
                              input.value = '';
                            }
                          }}
                        >
                          <input
                            name="note"
                            type="text"
                            placeholder="Add a note..."
                            className="flex-1 border-2 border-black p-2 font-mono text-[10px] uppercase font-bold focus:outline-none"
                          />
                          <button
                            type="submit"
                            className="bg-zinc-200 text-black font-headline font-black text-[10px] uppercase px-3 cursor-pointer border-2 border-black"
                          >
                            Note
                          </button>
                        </form>
                      </section>
                    </div>
                  )}
                </article>
              );
            })
          )}
      </div>

      {confirmStep && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setConfirmStep(null)}
          role="presentation"
        >
          <div
            className="bg-white border-4 border-black p-6 max-w-sm w-full shadow-[6px_6px_0px_0px_#e63b2e]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <h3 className="font-headline font-black text-lg uppercase mb-2">
              Confirm: {confirmStep.label}?
            </h3>
            <p className="font-mono text-[10px] uppercase font-bold text-zinc-600 mb-4">
              This will be logged on your timeline. You can undo with &quot;Undo last step&quot; if needed.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={
                  !!confirmStep &&
                  stepActionLoading === stepActionKey(confirmStep.appId, confirmStep.stepId)
                }
                onClick={() => {
                  if (!confirmStep) return;
                  void (async () => {
                    await onCompleteStep(confirmStep.appId, confirmStep.stepId);
                    setConfirmStep(null);
                  })();
                }}
                className="flex-1 bg-black text-white font-headline font-black text-xs uppercase py-2 border-2 border-black cursor-pointer disabled:opacity-60 disabled:cursor-wait inline-flex items-center justify-center gap-1.5"
              >
                {confirmStep &&
                stepActionLoading === stepActionKey(confirmStep.appId, confirmStep.stepId) ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Yes, mark complete'
                )}
              </button>
              <button
                type="button"
                onClick={() => setConfirmStep(null)}
                className="flex-1 bg-white font-headline font-black text-xs uppercase py-2 border-2 border-black cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {comingSoonOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
          onClick={() => setComingSoonOpen(false)}
          role="presentation"
        >
          <div
            className="bg-white border-4 border-black p-8 md:p-10 shadow-[6px_6px_0px_0px_#ffcc00] max-w-md w-full text-center relative animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="ai-check-coming-soon-title"
          >
            <button
              type="button"
              onClick={() => setComingSoonOpen(false)}
              className="absolute top-4 right-4 font-headline font-black text-sm cursor-pointer bg-transparent border-none hover:opacity-70"
              aria-label="Close"
            >
              [X]
            </button>
            <div className="w-16 h-16 mx-auto mb-5 bg-[#ffcc00] border-4 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_#1a1a1a]">
              <Sparkles className="w-8 h-8 text-black" />
            </div>
            <h3
              id="ai-check-coming-soon-title"
              className="font-headline font-black text-2xl md:text-3xl uppercase tracking-tight text-[#1a1a1a] mb-3"
            >
              Coming Soon
            </h3>
            <p className="font-mono text-xs uppercase font-bold text-zinc-500 leading-relaxed mb-6">
              AI project checks for your hackathon timeline are on the way.
            </p>
            <button
              type="button"
              onClick={() => setComingSoonOpen(false)}
              className="w-full bg-black text-white border-2 border-black py-3 font-headline font-black text-xs uppercase tracking-wider hover:bg-[#ffcc00] hover:text-black cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
