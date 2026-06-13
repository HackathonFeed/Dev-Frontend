import React, { useEffect, useState } from 'react';
import { Check, Crown, Loader2, Rocket, Sparkles, Zap } from 'lucide-react';
import type { SubscriptionPlan, SubscriptionStatus } from '../api/types';
import { waitForPlanUpgrade } from '../api/subscriptions';
import {
  billingSuccessPath,
  clearPendingUpgrade,
  resolvePaymentId,
  resolveUpgradePlan,
  savePostLoginRedirect,
} from '../lib/billingRedirect';

type Phase = 'confirming' | 'success' | 'error';

interface SubscriptionUpgradeSuccessProps {
  isAuthenticated: boolean;
  authLoading: boolean;
  onSuccess: (status: SubscriptionStatus) => void;
  onGoToDashboard: () => void;
  onSignIn: () => void;
}

const PLAN_META: Record<
  SubscriptionPlan,
  { label: string; icon: React.ReactNode; accent: string; badge: string }
> = {
  hacker: {
    label: 'Hacker',
    icon: <Zap className="w-8 h-8" strokeWidth={2.5} />,
    accent: 'bg-[#ffcc00] text-[#1a1a1a]',
    badge: 'bg-[#ffcc00] text-[#1a1a1a]',
  },
  builder: {
    label: 'Builder',
    icon: <Rocket className="w-8 h-8" strokeWidth={2.5} />,
    accent: 'bg-[#0055ff] text-white',
    badge: 'bg-[#0055ff] text-white',
  },
  champion: {
    label: 'Champion',
    icon: <Crown className="w-8 h-8" strokeWidth={2.5} />,
    accent: 'bg-[#1a1a1a] text-white',
    badge: 'bg-[#e63b2e] text-white',
  },
};

export function SubscriptionUpgradeSuccess({
  isAuthenticated,
  authLoading,
  onSuccess,
  onGoToDashboard,
  onSignIn,
}: SubscriptionUpgradeSuccessProps) {
  const [phase, setPhase] = useState<Phase>('confirming');
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activatedStatus, setActivatedStatus] = useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    if (authLoading) return;

    const expectedPlan = resolveUpgradePlan(window.location.search);
    const paymentId = resolvePaymentId(window.location.search);
    if (!expectedPlan || expectedPlan === 'hacker') {
      setError('Could not detect which plan you purchased. Open Settings → Upgrade to confirm your plan.');
      setPhase('error');
      return;
    }

    setPlan(expectedPlan);

    if (!isAuthenticated) {
      savePostLoginRedirect(billingSuccessPath(expectedPlan));
      onSignIn();
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const status = await waitForPlanUpgrade(expectedPlan, {
          maxAttempts: 40,
          intervalMs: 1500,
          paymentId,
        });
        if (cancelled) return;

        clearPendingUpgrade();
        setActivatedStatus(status);
        onSuccess(status);
        setPhase('success');

        window.setTimeout(() => {
          if (!cancelled) onGoToDashboard();
        }, 4200);
      } catch (err) {
        if (cancelled) return;
        const msg =
          err instanceof Error
            ? err.message
            : 'Payment received but we could not activate your plan yet.';
        setError(msg);
        setPhase('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, onGoToDashboard, onSignIn, onSuccess]);

  const meta = plan ? PLAN_META[plan] : PLAN_META.builder;

  return (
    <div className="min-h-screen bg-[#f5f0e8] text-[#1a1a1a] font-body antialiased flex items-center justify-center p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(#1a1a1a 1px, transparent 1px), linear-gradient(90deg, #1a1a1a 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {phase === 'success' && (
        <div className="absolute inset-0 pointer-events-none upgrade-confetti" aria-hidden="true">
          {Array.from({ length: 18 }).map((_, i) => (
            <span
              key={i}
              className="upgrade-confetti-piece"
              style={{
                left: `${(i * 17) % 100}%`,
                animationDelay: `${(i % 6) * 0.12}s`,
                backgroundColor: i % 3 === 0 ? '#ffcc00' : i % 3 === 1 ? '#0055ff' : '#e63b2e',
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10 w-full max-w-lg border-4 border-black bg-white shadow-[12px_12px_0px_0px_#101010] upgrade-success-card">
        <div className="bg-[#1a1a1a] border-b-4 border-black px-6 py-5">
          <p className="font-mono text-[10px] uppercase font-bold tracking-[0.22em] text-[#ffcc00] mb-1">
            PAYMENT COMPLETE
          </p>
          <h1 className="font-headline font-black text-3xl uppercase tracking-tighter text-white leading-none">
            {phase === 'confirming' && 'Activating plan…'}
            {phase === 'success' && 'Upgrade successful!'}
            {phase === 'error' && 'Almost there…'}
          </h1>
        </div>

        <div className="p-8 flex flex-col items-center text-center gap-6">
          {phase === 'confirming' && (
            <>
              <div className="w-24 h-24 border-4 border-black bg-[#0055ff] flex items-center justify-center upgrade-pulse-ring">
                <Loader2 className="w-10 h-10 text-white animate-spin" strokeWidth={2.5} />
              </div>
              <div>
                <p className="font-headline font-black text-xl uppercase tracking-tight">
                  Confirming your {meta.label} plan
                </p>
                <p className="mt-2 font-mono text-[11px] uppercase font-bold text-zinc-500 leading-relaxed max-w-sm mx-auto">
                  Hang tight — we are verifying your Razorpay payment and unlocking AI copilot access.
                </p>
              </div>
            </>
          )}

          {phase === 'success' && plan && (
            <>
              <div className={`w-24 h-24 border-4 border-black flex items-center justify-center upgrade-check-pop ${meta.accent}`}>
                <Check className="w-12 h-12" strokeWidth={3} />
              </div>
              <div className="upgrade-success-content">
                <div className={`inline-flex items-center gap-2 px-3 py-1 border-2 border-black font-mono text-[10px] uppercase font-black ${meta.badge}`}>
                  {meta.icon}
                  {meta.label} plan active
                </div>
                <p className="mt-4 font-headline font-black text-2xl uppercase tracking-tight">
                  Welcome to {meta.label}!
                </p>
                <p className="mt-2 font-mono text-[11px] uppercase font-bold text-zinc-500 leading-relaxed">
                  {activatedStatus?.ai_points === -1
                    ? 'Unlimited AI points are now live on your account.'
                    : `${activatedStatus?.ai_points ?? '—'} AI points loaded · ${activatedStatus?.messages_remaining ?? '—'} messages ready`}
                </p>
                <p className="mt-4 font-mono text-[10px] text-zinc-400 uppercase flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#ffcc00]" />
                  Redirecting to dashboard…
                </p>
              </div>
            </>
          )}

          {phase === 'error' && (
            <>
              <div className="w-24 h-24 border-4 border-black bg-[#ffcc00] flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-[#1a1a1a]" strokeWidth={2.5} />
              </div>
              <div>
                <p className="font-headline font-black text-xl uppercase tracking-tight">
                  Payment received
                </p>
                <p className="mt-2 font-mono text-[11px] uppercase font-bold text-zinc-600 leading-relaxed max-w-sm mx-auto">
                  {error}
                </p>
              </div>
              <button
                type="button"
                onClick={onGoToDashboard}
                className="w-full py-3 px-4 border-3 border-black bg-[#0055ff] text-white font-headline font-black text-xs uppercase tracking-wider shadow-[4px_4px_0px_0px_#1a1a1a] hover:bg-[#ffcc00] hover:text-[#1a1a1a] transition-colors cursor-pointer"
              >
                Go to dashboard
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
