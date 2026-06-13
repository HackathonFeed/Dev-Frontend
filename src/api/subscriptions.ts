import { ApiError, apiRequest } from './client';
import type {
  CreateOrderResponse,
  PaymentPageResponse,
  PlanInfo,
  SubscriptionPlan,
  SubscriptionStatus,
  VerifyPaymentRequest,
} from './types';

export async function getPlans(): Promise<PlanInfo[]> {
  return apiRequest<PlanInfo[]>('/subscriptions/plans');
}

export async function getMySubscription(): Promise<SubscriptionStatus> {
  return apiRequest<SubscriptionStatus>('/subscriptions/me');
}

/** Charge points for opening one project details view. */
export async function consumeProjectView(): Promise<SubscriptionStatus> {
  return apiRequest<SubscriptionStatus>('/subscriptions/consume-project-view', {
    method: 'POST',
  });
}

/** Razorpay Payment Page URL with email pre-filled. */
export async function getPaymentPage(plan: SubscriptionPlan): Promise<PaymentPageResponse> {
  return apiRequest<PaymentPageResponse>(`/subscriptions/payment-page/${plan}`);
}

/** Verify payment with Razorpay API and apply plan upgrade for the logged-in user. */
export async function claimPlanUpgrade(plan: SubscriptionPlan): Promise<SubscriptionStatus> {
  return apiRequest<SubscriptionStatus>('/subscriptions/claim-upgrade', {
    method: 'POST',
    body: JSON.stringify({ plan }),
  });
}

/** Poll until plan upgrades after Payment Page checkout. */
export async function waitForPlanUpgrade(
  expectedPlan: SubscriptionPlan,
  options?: { maxAttempts?: number; intervalMs?: number },
): Promise<SubscriptionStatus> {
  const maxAttempts = options?.maxAttempts ?? 30;
  const intervalMs = options?.intervalMs ?? 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await claimPlanUpgrade(expectedPlan);
    } catch (err) {
      if (!(err instanceof ApiError) || (err.status !== 404 && err.status !== 503)) {
        throw err;
      }
    }

    const status = await getMySubscription();
    if (status.plan === expectedPlan) {
      return status;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    'Payment received — your plan may take a minute to activate. Refresh the page or check your email.',
  );
}

/** @deprecated – legacy embedded Razorpay Checkout */
export async function createOrder(plan: SubscriptionPlan): Promise<CreateOrderResponse> {
  return apiRequest<CreateOrderResponse>('/subscriptions/create-order', {
    method: 'POST',
    body: JSON.stringify({ plan }),
  });
}

/** @deprecated – legacy embedded Razorpay Checkout */
export async function verifyPayment(payload: VerifyPaymentRequest): Promise<SubscriptionStatus> {
  return apiRequest<SubscriptionStatus>('/subscriptions/verify-payment', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
