import React, { useRef, useState, useCallback } from 'react';
import {
  Camera,
  Github,
  Globe,
  Linkedin,
  Twitter,
  ArrowRight,
  Check,
  Loader2,
  Sparkles,
  User,
  AtSign,
} from 'lucide-react';
import type { User as UserType } from '../api/types';
import { updateProfile, uploadProfileAvatar } from '../api/users';
import { ApiError } from '../api/client';
import { ProfileAvatar } from './ProfileAvatar';

// ─── localStorage key ────────────────────────────────────────────────────────
const SETUP_KEY = 'hackathon_feed_profile_setup_pending';

export function queueProfileSetup(): void {
  localStorage.setItem(SETUP_KEY, '1');
}
export function shouldShowProfileSetup(): boolean {
  return localStorage.getItem(SETUP_KEY) === '1';
}
function clearProfileSetup(): void {
  localStorage.removeItem(SETUP_KEY);
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  user: UserType;
  onComplete: (updatedUser: UserType) => void;
}

type Step = 'photo' | 'identity' | 'social';
const STEPS: Step[] = ['photo', 'identity', 'social'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sanitizeHandle(field: 'github' | 'linkedin' | 'x' | 'website', value: string): string {
  const v = value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split(/[?#]/)[0]
    .replace(/\/+$/, '');
  const h = v.replace(/^@/, '');
  switch (field) {
    case 'github':    return h.replace(/^github\.com\//i, '').split('/')[0];
    case 'linkedin':  return h.replace(/^linkedin\.com\/in\//i, '').split('/')[0];
    case 'x':         return h.replace(/^(x|twitter)\.com\//i, '').split('/')[0];
    case 'website':   return v;
  }
}

// ─── Step labels ─────────────────────────────────────────────────────────────
const STEP_LABELS: Record<Step, string> = {
  photo:    'Profile photo',
  identity: 'Your identity',
  social:   'Social links',
};

// ─── Component ───────────────────────────────────────────────────────────────
export function OnboardingProfileSetup({ user, onComplete }: Props) {
  const [step, setStep] = useState<Step>('photo');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserType>(user);

  // identity fields
  const [username, setUsername] = useState(user.username ?? '');
  const [interests, setInterests] = useState(user.interests?.join(', ') ?? '');

  // social fields
  const [github, setGithub]     = useState(user.github_username ?? '');
  const [linkedin, setLinkedin] = useState(user.linkedin_username ?? '');
  const [twitter, setTwitter]   = useState(user.twitter_username ?? '');
  const [website, setWebsite]   = useState(user.website ?? '');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const stepIndex = STEPS.indexOf(step);
  const isLast = step === 'social';

  // ── finish ─────────────────────────────────────────────────────────────────
  const finish = useCallback((finalUser: UserType) => {
    clearProfileSetup();
    onComplete(finalUser);
  }, [onComplete]);

  // ── photo upload ──────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) {
      setError('Use a JPEG, PNG, WebP, or GIF image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be 5 MB or smaller.');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setUploadingPhoto(true);
    setError(null);
    try {
      const updated = await uploadProfileAvatar(file);
      setCurrentUser(updated);
      setPreviewUrl(null);
    } catch (err) {
      setPreviewUrl(null);
      setError(err instanceof ApiError ? err.message : 'Upload failed.');
    } finally {
      setUploadingPhoto(false);
      URL.revokeObjectURL(url);
    }
  };

  // ── next / save ───────────────────────────────────────────────────────────
  const handleNext = async () => {
    setError(null);
    setSaving(true);
    try {
      if (step === 'photo') {
        // photo already saved on pick; just advance
        setStep('identity');
      } else if (step === 'identity') {
        const trimmed = username.trim().toLowerCase();
        if (trimmed.length < 3 || trimmed.length > 30 || !/^[a-z0-9_-]+$/.test(trimmed)) {
          setError('Username must be 3–30 characters (letters, numbers, _ or -).');
          return;
        }
        const interestList = interests.split(',').map((i) => i.trim()).filter(Boolean);
        const updated = await updateProfile({
          username: trimmed !== currentUser.username ? trimmed : undefined,
          interests: interestList,
        });
        setCurrentUser(updated);
        setStep('social');
      } else {
        // social step — save and finish
        const updated = await updateProfile({
          github_username:   sanitizeHandle('github',   github)   || null,
          linkedin_username: sanitizeHandle('linkedin', linkedin) || null,
          twitter_username:  sanitizeHandle('x',        twitter)  || null,
          website:           sanitizeHandle('website',  website)  || null,
        });
        finish(updated);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── skip step ────────────────────────────────────────────────────────────
  const handleSkip = () => {
    setError(null);
    if (step === 'photo') setStep('identity');
    else if (step === 'identity') setStep('social');
    else finish(currentUser);
  };

  const avatarUrl = previewUrl ?? currentUser.avatar_url ?? null;

  return (
    <div className="fixed inset-0 z-[998] bg-[#eee9e0] flex flex-col overflow-y-auto">
      {/* Top bar */}
      <div className="bg-[#1a1a1a] border-b-4 border-black px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <span className="w-4 h-4 bg-[#e63b2e] border-2 border-white" />
          <span className="font-headline font-black text-lg uppercase tracking-tighter text-white italic">
            HackathonFeed
          </span>
        </div>
        <button
          onClick={() => finish(currentUser)}
          className="font-mono text-[10px] uppercase font-bold text-white/40 hover:text-white underline underline-offset-2 cursor-pointer"
        >
          Skip all & go to dashboard →
        </button>
      </div>

      {/* Progress steps */}
      <div className="bg-[#1a1a1a] px-6 pb-4 shrink-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => {
              const done = STEPS.indexOf(step) > i;
              const active = step === s;
              return (
                <React.Fragment key={s}>
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-8 h-8 border-2 flex items-center justify-center font-headline font-black text-xs transition-all ${
                        done
                          ? 'bg-[#ffcc00] border-[#ffcc00] text-[#1a1a1a]'
                          : active
                          ? 'bg-white border-white text-[#1a1a1a]'
                          : 'bg-transparent border-white/30 text-white/30'
                      }`}
                    >
                      {done ? <Check className="w-4 h-4" strokeWidth={3} /> : i + 1}
                    </div>
                    <span
                      className={`font-mono text-[9px] uppercase font-bold tracking-widest whitespace-nowrap ${
                        active ? 'text-[#ffcc00]' : done ? 'text-white/60' : 'text-white/30'
                      }`}
                    >
                      {STEP_LABELS[s]}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mb-5 mx-2 transition-all ${
                        done ? 'bg-[#ffcc00]' : 'bg-white/20'
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl space-y-6">

          {/* ── STEP 1: PHOTO ─────────────────────────────────────────────── */}
          {step === 'photo' && (
            <div className="animate-fadeIn space-y-6">
              <div>
                <span className="inline-block bg-black text-[#ffcc00] font-mono text-[10px] uppercase font-black px-3 py-1 mb-3">
                  Step 1 of 3
                </span>
                <h1 className="font-headline font-black text-4xl sm:text-5xl uppercase tracking-tighter text-[#1a1a1a]">
                  Welcome,<br />
                  <span className="text-[#e63b2e]">{currentUser.name.split(' ')[0]}.</span>
                </h1>
                <p className="font-mono text-sm font-bold text-[#1a1a1a]/60 mt-3 uppercase">
                  Let's get your profile looking sharp. Start with a photo.
                </p>
              </div>

              <div className="bg-white border-4 border-black p-6 sm:p-8 shadow-[6px_6px_0px_0px_#1a1a1a]">
                <div className="flex flex-col sm:flex-row items-center gap-8">
                  {/* Avatar preview */}
                  <div className="relative shrink-0">
                    <div className="border-4 border-black p-2 bg-gradient-to-br from-[#ffd700] via-[#ffcc00] to-amber-500 shadow-[4px_4px_0px_0px_#1a1a1a]">
                      <ProfileAvatar
                        name={currentUser.name}
                        avatarUrl={avatarUrl}
                        size="xl"
                        className="rounded-none"
                      />
                    </div>
                    {uploadingPhoto && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Upload controls */}
                  <div className="flex-1 space-y-4 w-full">
                    <div>
                      <h3 className="font-headline font-black text-xl uppercase text-[#1a1a1a]">
                        Profile photo
                      </h3>
                      <p className="font-mono text-[10px] uppercase font-bold text-zinc-500 mt-1">
                        Shown in your sidebar, leaderboard & public profile
                      </p>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    <button
                      type="button"
                      onClick={() => { setError(null); fileInputRef.current?.click(); }}
                      disabled={uploadingPhoto}
                      className="inline-flex items-center gap-2 bg-black text-white border-2 border-black font-headline font-black text-xs uppercase px-5 py-3 shadow-[3px_3px_0px_0px_#ffcc00] hover:bg-[#ffcc00] hover:text-black cursor-pointer disabled:opacity-50"
                    >
                      <Camera className="w-4 h-4" />
                      {currentUser.avatar_url ? 'Change photo' : 'Upload photo'}
                    </button>

                    <p className="font-mono text-[9px] uppercase font-bold text-zinc-400">
                      JPEG, PNG, WebP, or GIF · Max 5 MB
                    </p>
                  </div>
                </div>

                {error && (
                  <p className="mt-4 font-mono text-[10px] uppercase font-bold text-[#e63b2e]">{error}</p>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 2: IDENTITY ──────────────────────────────────────────── */}
          {step === 'identity' && (
            <div className="animate-fadeIn space-y-6">
              <div>
                <span className="inline-block bg-black text-[#ffcc00] font-mono text-[10px] uppercase font-black px-3 py-1 mb-3">
                  Step 2 of 3
                </span>
                <h1 className="font-headline font-black text-4xl sm:text-5xl uppercase tracking-tighter text-[#1a1a1a]">
                  Your hacker<br />
                  <span className="text-[#0055ff]">identity.</span>
                </h1>
                <p className="font-mono text-sm font-bold text-[#1a1a1a]/60 mt-3 uppercase">
                  Pick a unique username and tell us what you build.
                </p>
              </div>

              <div className="bg-white border-4 border-black p-6 sm:p-8 shadow-[6px_6px_0px_0px_#1a1a1a] space-y-6">
                {/* Username */}
                <div>
                  <label className="flex items-center gap-2 font-mono text-[10px] uppercase font-black text-[#1a1a1a] mb-2">
                    <AtSign className="w-3.5 h-3.5" />
                    Username <span className="text-[#e63b2e]">*</span>
                  </label>
                  <div className="flex items-center border-3 border-black overflow-hidden focus-within:ring-2 focus-within:ring-[#0055ff]">
                    <span className="bg-[#1a1a1a] text-[#ffcc00] font-mono font-black text-xs px-3 py-3 shrink-0 select-none">
                      @
                    </span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      placeholder="your-handle"
                      maxLength={30}
                      className="flex-1 bg-white font-mono font-bold text-sm p-3 focus:outline-none"
                    />
                  </div>
                  <p className="font-mono text-[9px] text-zinc-400 mt-1.5">
                    3–30 chars · letters, numbers, _ or – · hackathonfeed.com/u/{username || 'your-handle'}
                  </p>
                </div>

                {/* Interests */}
                <div>
                  <label className="flex items-center gap-2 font-mono text-[10px] uppercase font-black text-[#1a1a1a] mb-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    Interests / Tech stack
                  </label>
                  <input
                    type="text"
                    value={interests}
                    onChange={(e) => setInterests(e.target.value)}
                    placeholder="AI, Web3, React, Rust, Design…"
                    className="w-full border-3 border-black font-mono font-bold text-sm p-3 focus:outline-none focus:ring-2 focus:ring-[#0055ff]"
                  />
                  <p className="font-mono text-[9px] text-zinc-400 mt-1.5">
                    Comma-separated · Used to personalise hackathon recommendations
                  </p>
                </div>

                {error && (
                  <p className="font-mono text-[10px] uppercase font-bold text-[#e63b2e]">{error}</p>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 3: SOCIAL ────────────────────────────────────────────── */}
          {step === 'social' && (
            <div className="animate-fadeIn space-y-6">
              <div>
                <span className="inline-block bg-black text-[#ffcc00] font-mono text-[10px] uppercase font-black px-3 py-1 mb-3">
                  Step 3 of 3
                </span>
                <h1 className="font-headline font-black text-4xl sm:text-5xl uppercase tracking-tighter text-[#1a1a1a]">
                  Connect your<br />
                  <span className="text-[#16a34a]">socials.</span>
                </h1>
                <p className="font-mono text-sm font-bold text-[#1a1a1a]/60 mt-3 uppercase">
                  Optional — shown on your public hacker profile.
                </p>
              </div>

              <div className="bg-white border-4 border-black p-6 sm:p-8 shadow-[6px_6px_0px_0px_#1a1a1a] space-y-5">
                {/* GitHub */}
                <div>
                  <label className="flex items-center gap-2 font-mono text-[10px] uppercase font-black text-[#1a1a1a] mb-2">
                    <Github className="w-3.5 h-3.5" />
                    GitHub username
                  </label>
                  <div className="flex items-center border-3 border-black overflow-hidden focus-within:ring-2 focus-within:ring-[#0055ff]">
                    <span className="bg-[#1a1a1a] text-white font-mono font-black text-[10px] px-3 py-3 shrink-0 select-none whitespace-nowrap">
                      github.com/
                    </span>
                    <input
                      type="text"
                      value={github}
                      onChange={(e) => setGithub(e.target.value)}
                      placeholder="your-username"
                      className="flex-1 bg-white font-mono font-bold text-sm p-3 focus:outline-none min-w-0"
                    />
                  </div>
                </div>

                {/* LinkedIn */}
                <div>
                  <label className="flex items-center gap-2 font-mono text-[10px] uppercase font-black text-[#1a1a1a] mb-2">
                    <Linkedin className="w-3.5 h-3.5" />
                    LinkedIn
                  </label>
                  <div className="flex items-center border-3 border-black overflow-hidden focus-within:ring-2 focus-within:ring-[#0055ff]">
                    <span className="bg-[#0a66c2] text-white font-mono font-black text-[10px] px-3 py-3 shrink-0 select-none whitespace-nowrap">
                      linkedin.com/in/
                    </span>
                    <input
                      type="text"
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                      placeholder="your-name"
                      className="flex-1 bg-white font-mono font-bold text-sm p-3 focus:outline-none min-w-0"
                    />
                  </div>
                </div>

                {/* Twitter/X */}
                <div>
                  <label className="flex items-center gap-2 font-mono text-[10px] uppercase font-black text-[#1a1a1a] mb-2">
                    <Twitter className="w-3.5 h-3.5" />
                    X / Twitter
                  </label>
                  <div className="flex items-center border-3 border-black overflow-hidden focus-within:ring-2 focus-within:ring-[#0055ff]">
                    <span className="bg-[#1a1a1a] text-white font-mono font-black text-[10px] px-3 py-3 shrink-0 select-none whitespace-nowrap">
                      x.com/
                    </span>
                    <input
                      type="text"
                      value={twitter}
                      onChange={(e) => setTwitter(e.target.value)}
                      placeholder="handle"
                      className="flex-1 bg-white font-mono font-bold text-sm p-3 focus:outline-none min-w-0"
                    />
                  </div>
                </div>

                {/* Website */}
                <div>
                  <label className="flex items-center gap-2 font-mono text-[10px] uppercase font-black text-[#1a1a1a] mb-2">
                    <Globe className="w-3.5 h-3.5" />
                    Personal website
                  </label>
                  <div className="flex items-center border-3 border-black overflow-hidden focus-within:ring-2 focus-within:ring-[#0055ff]">
                    <span className="bg-[#eee9e0] text-[#1a1a1a] font-mono font-black text-[10px] px-3 py-3 shrink-0 select-none whitespace-nowrap border-r-3 border-black">
                      https://
                    </span>
                    <input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="yoursite.com"
                      className="flex-1 bg-white font-mono font-bold text-sm p-3 focus:outline-none min-w-0"
                    />
                  </div>
                </div>

                {error && (
                  <p className="font-mono text-[10px] uppercase font-bold text-[#e63b2e]">{error}</p>
                )}
              </div>
            </div>
          )}

          {/* ── Action row ────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between gap-4 pt-2">
            <button
              type="button"
              onClick={handleSkip}
              className="font-mono text-[11px] uppercase font-bold text-[#1a1a1a]/50 hover:text-[#1a1a1a] underline underline-offset-2 cursor-pointer"
            >
              Skip this step
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={saving || uploadingPhoto}
              className="inline-flex items-center gap-2 bg-[#ffcc00] border-3 border-black px-8 py-3.5 font-headline font-black text-sm uppercase shadow-[4px_4px_0px_0px_#1a1a1a] hover:bg-black hover:text-[#ffcc00] transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : isLast ? (
                <>
                  <User className="w-4 h-4" />
                  Finish setup
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Step counter hint */}
          <p className="text-center font-mono text-[10px] uppercase font-bold text-[#1a1a1a]/30">
            {stepIndex + 1} / {STEPS.length} — You can always update this later in Settings
          </p>
        </div>
      </div>
    </div>
  );
}
