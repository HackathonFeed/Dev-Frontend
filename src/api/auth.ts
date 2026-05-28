import { apiRequest, tokenStorage } from './client';
import type { TokenPayload, User } from './types';

async function establishSession(tokens: TokenPayload): Promise<User> {
  tokenStorage.set(tokens);
  try {
    return await getMe();
  } catch (error) {
    tokenStorage.clear();
    throw error;
  }
}

export async function register(
  name: string,
  email: string,
  password: string
): Promise<User> {
  const tokens = await apiRequest<TokenPayload>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
  return establishSession(tokens);
}

export async function login(email: string, password: string): Promise<User> {
  const tokens = await apiRequest<TokenPayload>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return establishSession(tokens);
}

export async function loginWithGoogle(accessToken: string): Promise<User> {
  const tokens = await apiRequest<TokenPayload>('/auth/google', {
    method: 'POST',
    body: JSON.stringify({ access_token: accessToken }),
  });
  return establishSession(tokens);
}

export async function getMe(): Promise<User> {
  return apiRequest<User>('/auth/me');
}

export function logout() {
  tokenStorage.clear();
}

export async function forgotPassword(email: string): Promise<void> {
  await apiRequest<null>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifyResetCode(email: string, code: string): Promise<string> {
  const data = await apiRequest<{ reset_token: string }>('/auth/verify-reset-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  });
  return data.reset_token;
}

export async function resetPassword(reset_token: string, new_password: string): Promise<void> {
  await apiRequest<null>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ reset_token, new_password }),
  });
}
