import React, { useEffect, useState } from 'react';
import { X, Check, Zap, Crown, Rocket, Loader2, ExternalLink } from 'lucide-react';
import type { PlanInfo, SubscriptionPlan, SubscriptionStatus } from '../api/types';
import { getPlans, getPaymentPage } from '../api/subscriptions';
import { savePendingUpgrade } from '../lib/billingRedirect';

interface SubscriptionModalProps {
  open: boolean;
  onClose: () => void;
  currentStatus: SubscriptionStatus | null;
  userEmail?: string;
  userName?: string;
  onUpgradeSuccess: (status: SubscriptionStatus) => void;
}

const PLAN_ICONS: Record<SubscriptionPlan, React.ReactNode> = {
  hacker: <Zap className="w-5 h-5" strokeWidth={2.5} />,
  builder: <Rocket className="w-5 h-5" strokeWidth={2.5} />,
  champion: <Crown className="w-5 h-5" strokeWidth={2.5} />,
};

type CardStyle = {
  card: string;
  text: string;
  subtext: string;
  divider: string;
  featureCheck: string;
  featureText: string;
  priceBadge: string;
};

const CARD_STYLES: Record<SubscriptionPlan, CardStyle> = {
  hacker: {
    card: 'bg-white',
    text: 'text-[#1a1a1a]',
    subtext: 'text-zinc-500',
    divider: 'border-black/15',
    featureCheck: 'text-[#0055ff]',
    featureText: 'text-zinc-600',
    priceBadge: 'bg-[#1a1a1a] text-white',
  },
  builder: {
    card: 'bg-[#0055ff]',
    text: 'text-white',
    subtext: 'text-white/60',
    divider: 'border-white/20',
    featureCheck: 'text-[#ffcc00]',
    featureText: 'text-white/80',
    priceBadge: 'bg-[#ffcc00] text-[#1a1a1a]',
  },
  champion: {
    card: 'bg-[#1a1a1a]',
    text: 'text-white',
    subtext: 'text-white/50',
    divider: 'border-white/15',
    featureCheck: 'text-[#ffcc00]',
    featureText: 'text-white/75',
    priceBadge: 'bg-[#e63b2e] text-white',
  },
};

const PLAN_ORDER: Record<SubscriptionPlan, number> = { hacker: 0, builder: 1, champion: 2 };

export function SubscriptionModal({
  open,
  onClose,
  currentStatus,
  userEmail,
}: SubscriptionModalProps) {
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<SubscriptionPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    getPlans()
      .then(setPlans)
      .catch(() => setError('Failed to load plans. Please try again.'))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !upgrading) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, upgrading]);

  if (!open) return null;

  const currentPlan = currentStatus?.plan ?? 'hacker';

  const pointsPercent = (() => {
    if (!currentStatus) return 0;
    if (currentStatus.ai_points === -1) return 100;
    const planObj = plans.find((p) => p.key === currentPlan);
    const max = planObj?.points ?? 50;
    return max <= 0 ? 0 : Math.min(100, Math.max(0, (currentStatus.ai_points / max) * 100));
  })();

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    if (upgrading) return;
    setUpgrading(plan);
    setError(null);

    try {
      const page = await getPaymentPage(plan);
      savePendingUpgrade(plan);
      window.location.assign(page.payment_page_url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not open payment page. Please try again.';
      setError(msg);
      setUpgrading(null);
    }
  };

  const payButtonLabel = (plan: PlanInfo) => {
    if (plan.key === 'champion') return `PAY ₹${plan.price_inr} · LIFETIME`;
    return `PAY ₹${plan.price_inr} · UPGRADE`;
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Subscription Plans"
    >
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" onClick={upgrading ? undefined : onClose} />

      <div className="relative z-10 w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[#f5f0e8] border-4 border-black shadow-[12px_12px_0px_0px_#101010] animate-fadeIn">

        <div className="bg-[#1a1a1a] border-b-4 border-black px-6 py-5 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase font-bold tracking-[0.22em] text-[#ffcc00] mb-1">
              AI COPILOT ACCESS
            </p>
            <h2 className="font-headline font-black text-3xl md:text-4xl uppercase tracking-tighter text-white leading-none">
              CHOOSE YOUR PLAN
            </h2>
            <p className="mt-1.5 font-mono text-[11px] text-white/45">
              Each AI chat message costs 5 points · Pay securely on Razorpay
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={!!upgrading}
            className="mt-1 shrink-0 bg-white/10 hover:bg-[#e63b2e] border-2 border-white/20 hover:border-[#e63b2e] p-1.5 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-white" strokeWidth={3} />
          </button>
        </div>

        {currentStatus && (
          <div className="border-b-4 border-black bg-white px-6 py-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] uppercase font-bold text-zinc-500">Current plan</span>
              <span className={`font-headline font-black text-xs uppercase px-2 py-0.5 border-2 border-black ${
                currentPlan === 'champion' ? 'bg-[#1a1a1a] text-white'
                : currentPlan === 'builder' ? 'bg-[#0055ff] text-white'
                : 'bg-[#ffcc00] text-[#1a1a1a]'
              }`}>
                {currentPlan.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-1 min-w-[180px]">
              <span className="font-mono text-[9px] uppercase font-bold text-zinc-500 shrink-0">AI Points</span>
              <div className="flex-1 h-2.5 bg-zinc-200 border border-black overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    currentStatus.ai_points === -1 ? 'bg-[#0055ff]'
                    : pointsPercent > 40 ? 'bg-[#0055ff]'
                    : pointsPercent > 15 ? 'bg-[#ffcc00]'
                    : 'bg-[#e63b2e]'
                  }`}
                  style={{ width: `${pointsPercent}%` }}
                />
              </div>
              <span className="font-headline font-black text-sm tabular-nums shrink-0">
                {currentStatus.ai_points === -1 ? '∞' : currentStatus.ai_points}
                <span className="font-mono text-[9px] text-zinc-500 ml-0.5">pts</span>
              </span>
            </div>
            {currentStatus.messages_remaining !== -1 && (
              <span className="font-mono text-[9px] text-zinc-500 uppercase">
                ≈ {currentStatus.messages_remaining} messages left
              </span>
            )}
          </div>
        )}

        {error && (
          <div className="mx-6 mt-4 px-4 py-3 bg-[#e63b2e] border-2 border-black font-mono text-xs text-white font-bold uppercase">
            ⚠ {error}
          </div>
        )}

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#0055ff]" />
              <span className="font-mono text-xs uppercase font-bold text-zinc-500">Loading plans…</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {plans.map((plan) => {
                const styles = CARD_STYLES[plan.key];
                const isCurrent = plan.key === currentPlan;
                const isBusy = upgrading === plan.key;
                const isDowngrade = PLAN_ORDER[plan.key] < PLAN_ORDER[currentPlan];
                const isFree = plan.price_inr === 0;
                const hasPaymentPage = Boolean(plan.payment_page_url);

                return (
                  <div
                    key={plan.key}
                    className={`relative border-4 border-black ${styles.card} p-6 flex flex-col gap-4 shadow-[6px_6px_0px_0px_#101010] ${isCurrent ? 'ring-4 ring-[#ffcc00] ring-offset-0' : ''}`}
                  >
                    {plan.key === 'builder' && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#ffcc00] border-2 border-black px-3 py-0.5 font-mono text-[9px] uppercase font-black tracking-widest text-[#1a1a1a] whitespace-nowrap z-10 shadow-[2px_2px_0px_0px_#101010]">
                        MOST POPULAR
                      </div>
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={styles.text}>{PLAN_ICONS[plan.key]}</span>
                        <h3 className={`font-headline font-black text-xl uppercase tracking-tight ${styles.text}`}>
                          {plan.name}
                        </h3>
                      </div>
                      <span className={`font-mono text-[9px] font-black uppercase px-2 py-1 border-2 border-black ${styles.priceBadge}`}>
                        {isFree ? 'FREE' : plan.key === 'champion' ? `₹${plan.price_inr} LIFETIME` : `₹${plan.price_inr}`}
                      </span>
                    </div>

                    <div className={`border-t-2 ${styles.divider} pt-3`}>
                      <p className={`font-headline font-black text-3xl tracking-tighter ${styles.text}`}>
                        {plan.points === -1 ? '∞ UNLIMITED' : `${plan.points.toLocaleString()} PTS`}
                      </p>
                      <p className={`font-mono text-[9px] uppercase font-bold mt-0.5 ${styles.subtext}`}>
                        {plan.messages_per_cycle}
                      </p>
                    </div>

                    <ul className="flex flex-col gap-1.5 flex-1">
                      {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${styles.featureCheck}`} strokeWidth={3} />
                          <span className={`font-mono text-[10px] uppercase font-bold leading-snug ${styles.featureText}`}>
                            {feat}
                          </span>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      disabled={isCurrent || !!upgrading || isDowngrade || (!isFree && !hasPaymentPage)}
                      onClick={() => !isFree && handleUpgrade(plan.key)}
                      className={`w-full py-3 px-4 border-3 border-black font-headline font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                        isCurrent
                          ? 'bg-[#ffcc00] text-[#1a1a1a] cursor-default shadow-[3px_3px_0px_0px_#1a1a1a]'
                          : isDowngrade
                            ? 'bg-zinc-200 text-zinc-400 border-zinc-300 cursor-not-allowed'
                            : !isFree && !hasPaymentPage
                              ? 'bg-zinc-200 text-zinc-400 border-zinc-300 cursor-not-allowed'
                            : isBusy
                              ? 'opacity-50 cursor-wait'
                              : plan.key === 'champion'
                                ? 'bg-[#e63b2e] text-white hover:bg-white hover:text-[#1a1a1a] shadow-[3px_3px_0px_0px_#1a1a1a] cursor-pointer'
                                : plan.key === 'builder'
                                  ? 'bg-white text-[#0055ff] hover:bg-[#ffcc00] hover:text-[#1a1a1a] shadow-[3px_3px_0px_0px_#1a1a1a] cursor-pointer'
                                  : 'bg-[#1a1a1a] text-white hover:bg-[#ffcc00] hover:text-[#1a1a1a] shadow-[3px_3px_0px_0px_#1a1a1a] cursor-pointer'
                      }`}
                    >
                      {isBusy ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          OPENING PAYMENT…
                        </>
                      ) : isCurrent ? (
                        <>
                          <Check className="w-4 h-4" strokeWidth={3} />
                          CURRENT PLAN
                        </>
                      ) : isDowngrade ? (
                        'DOWNGRADE NOT AVAILABLE'
                      ) : isFree ? (
                        'FREE — NO PAYMENT'
                      ) : !hasPaymentPage ? (
                        'COMING SOON'
                      ) : (
                        <>
                          <ExternalLink className="w-3.5 h-3.5" strokeWidth={3} />
                          {payButtonLabel(plan)}
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t-4 border-black bg-[#1a1a1a] px-6 py-4">
          <p className="font-mono text-[9px] uppercase font-bold text-white/35 text-center">
            Pay on Razorpay · Use your HackathonFeed email · You will return here after payment
          </p>
        </div>
      </div>
    </div>
  );
}
