import { apiRequest } from './client';
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

/** Poll until webhook upgrades the user to the expected plan. */
export async function waitForPlanUpgrade(
  expectedPlan: SubscriptionPlan,
  options?: { maxAttempts?: number; intervalMs?: number },
): Promise<SubscriptionStatus> {
  const maxAttempts = options?.maxAttempts ?? 20;
  const intervalMs = options?.intervalMs ?? 3000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
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
