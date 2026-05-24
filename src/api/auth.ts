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

export async function getMe(): Promise<User> {
  return apiRequest<User>('/auth/me');
}

export function logout() {
  tokenStorage.clear();
}
