export function userInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  );
}

import { API_ORIGIN } from '../api/client';

export function resolveAvatarUrl(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null;
  if (
    avatarUrl.startsWith('http://') ||
    avatarUrl.startsWith('https://') ||
    avatarUrl.startsWith('data:')
  ) {
    return avatarUrl;
  }
  const origin =
    API_ORIGIN ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  return `${origin.replace(/\/$/, '')}${avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`}`;
}
