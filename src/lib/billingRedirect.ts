import type { SubscriptionPlan } from '../api/types';

export const PENDING_UPGRADE_KEY = 'hf_pending_upgrade_plan';
export const POST_LOGIN_REDIRECT_KEY = 'hf_post_login_redirect';

const VALID_PLANS = new Set<SubscriptionPlan>(['hacker', 'builder', 'champion']);

export function savePendingUpgrade(plan: SubscriptionPlan) {
  sessionStorage.setItem(PENDING_UPGRADE_KEY, plan);
}

export function readPendingUpgrade(): SubscriptionPlan | null {
  const fromStorage = sessionStorage.getItem(PENDING_UPGRADE_KEY);
  if (fromStorage && VALID_PLANS.has(fromStorage as SubscriptionPlan)) {
    return fromStorage as SubscriptionPlan;
  }
  return null;
}

export function clearPendingUpgrade() {
  sessionStorage.removeItem(PENDING_UPGRADE_KEY);
}

export function parsePlanFromSearch(search: string): SubscriptionPlan | null {
  const params = new URLSearchParams(search);
  const plan = params.get('plan');
  if (plan && VALID_PLANS.has(plan as SubscriptionPlan)) {
    return plan as SubscriptionPlan;
  }
  return null;
}

export function parsePaymentIdFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  return (
    params.get('razorpay_payment_id')
    ?? params.get('payment_id')
    ?? params.get('razorpay_payment_link_id')
  );
}

export function resolveUpgradePlan(search: string): SubscriptionPlan | null {
  return parsePlanFromSearch(search) ?? readPendingUpgrade();
}

export function resolvePaymentId(search: string): string | null {
  return parsePaymentIdFromSearch(search);
}

export function savePostLoginRedirect(path: string) {
  sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, path);
}

export function consumePostLoginRedirect(): string | null {
  const path = sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY);
  if (path) sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
  return path;
}

export function billingSuccessPath(plan: SubscriptionPlan) {
  return `/billing/success?plan=${plan}`;
}
