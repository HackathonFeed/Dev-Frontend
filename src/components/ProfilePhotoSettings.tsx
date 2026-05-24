import React, { useRef, useState } from 'react';
import { Camera, Loader2, Trash2 } from 'lucide-react';
import type { User } from '../api/types';
import { uploadProfileAvatar, removeProfileAvatar } from '../api/users';
import { ApiError } from '../api/client';
import { ProfileAvatar } from './ProfileAvatar';

interface ProfilePhotoSettingsProps {
  user: User;
  onUpdated: (user: User) => void | Promise<void>;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_BYTES = 5 * 1024 * 1024;

export const ProfilePhotoSettings: React.FC<ProfilePhotoSettingsProps> = ({ user, onUpdated }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const displayAvatarUrl = previewUrl ?? user.avatar_url ?? null;
  const busy = uploading || removing;

  const handlePick = () => {
    if (busy) return;
    setError(null);
    inputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const byExt =
        ext === 'jpg' || ext === 'jpeg'
          ? 'image/jpeg'
          : ext === 'png'
            ? 'image/png'
            : ext === 'webp'
              ? 'image/webp'
              : ext === 'gif'
                ? 'image/gif'
                : null;
      if (!byExt) {
        setError('Use a JPEG, PNG, WebP, or GIF image.');
        return;
      }
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be 5 MB or smaller.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setUploading(true);
    setError(null);

    try {
      const updated = await uploadProfileAvatar(file);
      await onUpdated(updated);
      setPreviewUrl(null);
    } catch (err) {
      setPreviewUrl(null);
      if (err instanceof ApiError) {
        const detail =
          err.details && typeof err.details === 'object' && Array.isArray((err.details as { errors?: unknown }).errors)
            ? (err.details as { errors: { msg?: string }[] }).errors.map((e) => e.msg).filter(Boolean).join(', ')
            : null;
        setError(detail || err.message || 'Could not upload profile photo.');
      } else {
        setError('Could not upload profile photo.');
      }
    } finally {
      setUploading(false);
      URL.revokeObjectURL(objectUrl);
    }
  };

  const handleRemove = async () => {
    if (busy || !user.avatar_url) return;
    setRemoving(true);
    setError(null);
    try {
      const updated = await removeProfileAvatar();
      await onUpdated(updated);
      setPreviewUrl(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove profile photo.');
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="bg-white border-3 border-black p-6 shadow-[4px_4px_0px_0px_#101010] rounded-[4px] space-y-5">
      <div>
        <h3 className="font-headline font-black text-lg uppercase text-[#0055ff] border-b border-zinc-100 pb-2">
          Profile Photo
        </h3>
        <p className="font-mono text-[10px] uppercase font-bold text-zinc-500 mt-2">
          Shown on your sidebar and public profile at /u/{user.username}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative">
          <div className="border-4 border-black p-1.5 bg-gradient-to-br from-[#ffd700] via-[#ffcc00] to-amber-500 shadow-[3px_3px_0px_0px_#1a1a1a] rounded-[4px]">
            <ProfileAvatar name={user.name} avatarUrl={displayAvatarUrl} size="lg" className="rounded-[2px]" />
          </div>
          {busy && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-[4px]">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-3 w-full">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            type="button"
            onClick={handlePick}
            disabled={busy}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-black text-white border-2 border-black font-headline font-black text-xs uppercase px-5 py-3 shadow-[3px_3px_0px_0px_#ffcc00] hover:bg-[#ffcc00] hover:text-black cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Camera className="w-4 h-4" />
            {user.avatar_url ? 'Change photo' : 'Upload photo'}
          </button>

          {user.avatar_url && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-[#e63b2e] border-2 border-black font-headline font-black text-xs uppercase px-5 py-3 hover:bg-[#e63b2e]/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="w-4 h-4" />
              Remove photo
            </button>
          )}

          <p className="font-mono text-[9px] uppercase font-bold text-zinc-400">
            JPEG, PNG, WebP, or GIF · Max 5 MB
          </p>
        </div>
      </div>

      {error && (
        <p className="font-mono text-[10px] uppercase font-bold text-[#e63b2e]">{error}</p>
      )}
    </div>
  );
};
