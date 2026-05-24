import React from 'react';
import { resolveAvatarUrl, userInitials } from '../lib/avatar';

type ProfileAvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ProfileAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: ProfileAvatarSize;
  className?: string;
  showOnlineBadge?: boolean;
}

const SIZE_CLASS: Record<ProfileAvatarSize, { box: string; text: string; badge: string }> = {
  xs: { box: 'w-9 h-9', text: 'text-sm', badge: 'w-2.5 h-2.5 top-0 right-0' },
  sm: { box: 'w-11 h-11', text: 'text-sm', badge: 'w-2.5 h-2.5 top-0 right-0' },
  md: { box: 'w-16 h-16', text: 'text-xl', badge: 'w-3 h-3 bottom-0 right-0' },
  lg: { box: 'w-28 h-28', text: 'text-4xl', badge: 'w-4 h-4 bottom-1 right-1' },
  xl: { box: 'w-36 h-36', text: 'text-5xl', badge: 'w-5 h-5 bottom-2 right-2' },
};

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  name,
  avatarUrl,
  size = 'md',
  className = '',
  showOnlineBadge = false,
}) => {
  const resolved = resolveAvatarUrl(avatarUrl);
  const sizeClass = SIZE_CLASS[size];

  return (
    <div
      className={`${sizeClass.box} border-2 border-black overflow-hidden rounded-[6px] shrink-0 flex items-center justify-center relative bg-zinc-900 shadow-[1px_1px_0px_0px_#1a1a1a] ${className}`}
    >
      {resolved ? (
        <img src={resolved} alt={`${name} profile photo`} className="w-full h-full object-cover" />
      ) : (
        <span className={`font-headline font-black text-[#ffcc00] ${sizeClass.text}`}>
          {userInitials(name)}
        </span>
      )}
      {showOnlineBadge && (
        <div
          className={`absolute ${sizeClass.badge} bg-[#e63b2e] border border-black rounded-full`}
        />
      )}
    </div>
  );
};
