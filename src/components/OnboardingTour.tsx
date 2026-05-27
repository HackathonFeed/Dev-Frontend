import React, { useEffect, useState, useCallback } from 'react';
import { X, ArrowRight, LayoutGrid, Trophy, CheckSquare, Layers, Sparkles, Settings, Zap } from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  elementId?: string;
  tooltipSide: 'center' | 'right' | 'bottom';
  icon?: React.ReactNode;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to HackathonFeed!',
    description: "You're now part of the developer command center. Let's take 30 seconds to show you what's possible.",
    tooltipSide: 'center',
    icon: <Zap className="w-6 h-6" />,
  },
  {
    title: 'Dashboard',
    description: 'Your hacker HQ. See your global leaderboard rank, participation stats, and submission history at a glance.',
    elementId: 'tour-nav-dashboard',
    tooltipSide: 'right',
    icon: <LayoutGrid className="w-5 h-5" />,
  },
  {
    title: 'Browse Hackathons',
    description: 'Discover hundreds of active hackathons from platforms worldwide — filtered by theme, mode, prize pool, and deadline.',
    elementId: 'tour-nav-hackathons',
    tooltipSide: 'right',
    icon: <Trophy className="w-5 h-5" />,
  },
  {
    title: 'Project Tracking',
    description: 'Log every project you enter. Track your progress through stages, set milestones, and never miss a deadline again.',
    elementId: 'tour-nav-tracking',
    tooltipSide: 'right',
    icon: <CheckSquare className="w-5 h-5" />,
  },
  {
    title: 'Project Gallery',
    description: 'Your personal showcase of all past and ongoing hackathon projects — a living portfolio of your builder journey.',
    elementId: 'tour-nav-gallery',
    tooltipSide: 'right',
    icon: <Layers className="w-5 h-5" />,
  },
  {
    title: 'AI Idea Validator',
    description: 'Before you build, get AI-powered critique on your idea, pitch, and tech stack. Sharpen your concept before the deadline.',
    elementId: 'tour-nav-validate',
    tooltipSide: 'right',
    icon: <Sparkles className="w-5 h-5" />,
  },
  {
    title: 'Settings & Profile',
    description: 'Set up your hacker profile, add social links, and share your public profile URL with teammates and judges.',
    elementId: 'tour-nav-settings',
    tooltipSide: 'right',
    icon: <Settings className="w-5 h-5" />,
  },
];

const TOUR_PENDING_KEY = 'hackathon_feed_tour_pending';

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TooltipPosition {
  top: number;
  left: number;
  transformOrigin: string;
}

function getSpotlightRect(elementId: string): SpotlightRect | null {
  const el = document.getElementById(elementId);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function calcTooltipPosition(
  rect: SpotlightRect | null,
  side: TourStep['tooltipSide'],
  tooltipW = 320,
  tooltipH = 200,
): TooltipPosition {
  if (!rect || side === 'center') {
    return {
      top: window.innerHeight / 2 - tooltipH / 2,
      left: window.innerWidth / 2 - tooltipW / 2,
      transformOrigin: 'center center',
    };
  }
  const pad = 20;
  if (side === 'right') {
    return {
      top: Math.min(
        Math.max(rect.top + rect.height / 2 - tooltipH / 2, pad),
        window.innerHeight - tooltipH - pad,
      ),
      left: rect.left + rect.width + pad,
      transformOrigin: 'left center',
    };
  }
  // bottom fallback
  return {
    top: rect.top + rect.height + pad,
    left: Math.min(
      Math.max(rect.left + rect.width / 2 - tooltipW / 2, pad),
      window.innerWidth - tooltipW - pad,
    ),
    transformOrigin: 'top center',
  };
}

interface Props {
  onComplete: () => void;
}

export function OnboardingTour({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [visible, setVisible] = useState(false);

  const current = TOUR_STEPS[step];

  // Fade in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  // Update spotlight when step changes
  useEffect(() => {
    if (current.elementId) {
      const rect = getSpotlightRect(current.elementId);
      setSpotlight(rect);
    } else {
      setSpotlight(null);
    }
  }, [step, current.elementId]);

  const finish = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      localStorage.removeItem(TOUR_PENDING_KEY);
      onComplete();
    }, 300);
  }, [onComplete]);

  const next = useCallback(() => {
    if (step < TOUR_STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      finish();
    }
  }, [step, finish]);

  const tooltipPos = calcTooltipPosition(spotlight, current.tooltipSide);
  const isLast = step === TOUR_STEPS.length - 1;
  const PAD = 8;

  return (
    <div
      className="fixed inset-0 z-[999]"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.3s ease' }}
    >
      {/* Dark overlay with spotlight hole */}
      <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
        {spotlight ? (
          <svg
            className="absolute inset-0 w-full h-full"
            style={{ pointerEvents: 'none' }}
          >
            <defs>
              <mask id="tour-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={spotlight.left - PAD}
                  y={spotlight.top - PAD}
                  width={spotlight.width + PAD * 2}
                  height={spotlight.height + PAD * 2}
                  rx="4"
                  fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%"
              height="100%"
              fill="rgba(0,0,0,0.72)"
              mask="url(#tour-mask)"
            />
          </svg>
        ) : (
          <div className="absolute inset-0 bg-black/72" />
        )}
      </div>

      {/* Spotlight border ring */}
      {spotlight && (
        <div
          className="absolute border-4 border-[#ffcc00] shadow-[0_0_0_4px_rgba(255,204,0,0.25)]"
          style={{
            top: spotlight.top - PAD,
            left: spotlight.left - PAD,
            width: spotlight.width + PAD * 2,
            height: spotlight.height + PAD * 2,
            borderRadius: 4,
            pointerEvents: 'none',
            transition: 'all 0.3s cubic-bezier(.4,0,.2,1)',
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        className="absolute bg-[#eee9e0] border-4 border-black shadow-[6px_6px_0px_0px_#1a1a1a]"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: 320,
          transformOrigin: tooltipPos.transformOrigin,
          transition: 'top 0.3s cubic-bezier(.4,0,.2,1), left 0.3s cubic-bezier(.4,0,.2,1)',
          zIndex: 1000,
        }}
      >
        {/* Card header */}
        <div className="bg-[#1a1a1a] px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#ffcc00]">
            {current.icon}
            <span className="font-mono text-[10px] uppercase font-black tracking-widest text-white/60">
              Step {step + 1} of {TOUR_STEPS.length}
            </span>
          </div>
          <button
            onClick={finish}
            className="text-white/50 hover:text-white transition-colors"
            aria-label="Skip tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card body */}
        <div className="px-5 py-4">
          <h3 className="font-headline font-black text-lg uppercase tracking-tight text-[#1a1a1a] mb-2">
            {current.title}
          </h3>
          <p className="font-body text-sm text-[#1a1a1a]/80 leading-snug">
            {current.description}
          </p>
        </div>

        {/* Progress dots + actions */}
        <div className="px-5 pb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-2 border border-black transition-all ${
                  i === step
                    ? 'w-5 bg-[#ffcc00]'
                    : i < step
                    ? 'w-2 bg-[#1a1a1a]'
                    : 'w-2 bg-transparent'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={finish}
                className="font-mono text-[10px] uppercase font-black text-[#1a1a1a]/50 hover:text-[#1a1a1a] underline underline-offset-2"
              >
                Skip
              </button>
            )}
            <button
              onClick={next}
              className="flex items-center gap-2 bg-[#ffcc00] border-2 border-black px-4 py-2 font-headline font-black text-xs uppercase shadow-[3px_3px_0px_0px_#1a1a1a] hover:bg-black hover:text-[#ffcc00] transition-colors"
            >
              {isLast ? 'Done' : 'Next'}
              {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Returns true if the user just signed up and hasn't seen the tour yet. */
export function shouldShowTour(): boolean {
  return localStorage.getItem(TOUR_PENDING_KEY) === '1';
}

/** Call immediately after a successful registration to queue the tour. */
export function queueTourForNewUser(): void {
  localStorage.setItem(TOUR_PENDING_KEY, '1');
}
