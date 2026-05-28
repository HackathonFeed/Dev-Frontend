import { apiRequest } from './client';
import type {
  CreateOrderResponse,
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

/** @deprecated – direct upgrade without payment, kept for internal use only */
export async function upgradePlan(plan: SubscriptionPlan): Promise<SubscriptionStatus> {
  return apiRequest<SubscriptionStatus>('/subscriptions/upgrade', {
    method: 'POST',
    body: JSON.stringify({ plan }),
  });
}

/** Step 1: Create a Razorpay order. Returns order_id + publishable key. */
export async function createOrder(plan: SubscriptionPlan): Promise<CreateOrderResponse> {
  return apiRequest<CreateOrderResponse>('/subscriptions/create-order', {
    method: 'POST',
    body: JSON.stringify({ plan }),
  });
}

/** Step 2: Verify the Razorpay payment signature and apply the plan upgrade. */
export async function verifyPayment(payload: VerifyPaymentRequest): Promise<SubscriptionStatus> {
  return apiRequest<SubscriptionStatus>('/subscriptions/verify-payment', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
