/**
 * ForgotPasswordModal — Neo-Brutalist 3-step password reset flow.
 *
 * Step 1 — Enter email  → POST /auth/forgot-password
 * Step 2 — Enter 6-digit OTP sent via SMTP
 * Step 3 — Enter new password → POST /auth/reset-password
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Mail, ShieldCheck, Lock, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { forgotPassword, verifyResetCode, resetPassword } from '../api/auth';
import { ApiError } from '../api/client';

type Step = 'email' | 'code' | 'password' | 'done';

interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
  /** Pre-fill the email if the user already typed one on the login form */
  prefillEmail?: string;
}

export function ForgotPasswordModal({ open, onClose, prefillEmail }: ForgotPasswordModalProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [codeDigits, setCodeDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setStep('email');
      setEmail(prefillEmail ?? '');
      setCodeDigits(['', '', '', '', '', '']);
      setResetToken('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setLoading(false);
      setResendCooldown(0);
    }
  }, [open, prefillEmail]);

  // Countdown timer for resend button
  const startCooldown = useCallback(() => {
    setResendCooldown(60);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(cooldownRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  // ── Step handlers ──────────────────────────────────────────────────────────

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) { setError('Enter a valid email address.'); return; }
    setLoading(true);
    setError(null);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setStep('code');
      startCooldown();
      // Focus first digit after transition
      setTimeout(() => digitRefs.current[0]?.focus(), 120);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    setError(null);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setCodeDigits(['', '', '', '', '', '']);
      startCooldown();
      setTimeout(() => digitRefs.current[0]?.focus(), 60);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  const handleDigitInput = (idx: number, val: string) => {
    // Accept only digits; handle paste of full code
    const clean = val.replace(/\D/g, '');
    if (clean.length > 1) {
      // Paste — distribute across all boxes
      const digits = clean.slice(0, 6).split('');
      const next = [...codeDigits];
      digits.forEach((d, i) => { next[idx + i < 6 ? idx + i : 5] = d; });
      setCodeDigits(next);
      const focusIdx = Math.min(idx + digits.length, 5);
      digitRefs.current[focusIdx]?.focus();
      return;
    }
    const next = [...codeDigits];
    next[idx] = clean;
    setCodeDigits(next);
    if (clean && idx < 5) digitRefs.current[idx + 1]?.focus();
  };

  const handleDigitKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeDigits[idx] && idx > 0) {
      digitRefs.current[idx - 1]?.focus();
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = codeDigits.join('');
    if (code.length < 6) { setError('Enter all 6 digits.'); return; }
    setLoading(true);
    setError(null);
    try {
      const token = await verifyResetCode(email, code);
      setResetToken(token);
      setStep('password');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid or expired code.');
      setCodeDigits(['', '', '', '', '', '']);
      setTimeout(() => digitRefs.current[0]?.focus(), 60);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError(null);
    try {
      await resetPassword(resetToken, newPassword);
      setStep('done');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Reset failed. Please start over.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const STEP_META: Record<Step, { icon: React.ReactNode; title: string; sub: string }> = {
    email: {
      icon: <Mail className="w-6 h-6" strokeWidth={2.5} />,
      title: 'FORGOT PASSWORD',
      sub: "Enter your email and we'll send a 6-digit reset code.",
    },
    code: {
      icon: <ShieldCheck className="w-6 h-6" strokeWidth={2.5} />,
      title: 'VERIFY CODE',
      sub: `We sent a 6-digit code to ${email}. Check your inbox.`,
    },
    password: {
      icon: <Lock className="w-6 h-6" strokeWidth={2.5} />,
      title: 'NEW PASSWORD',
      sub: 'Choose a strong password for your account.',
    },
    done: {
      icon: <CheckCircle2 className="w-6 h-6" strokeWidth={2.5} />,
      title: 'ALL DONE!',
      sub: 'Your password has been updated. You can now log in.',
    },
  };

  const meta = STEP_META[step];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Forgot password"
    >
      <div
        className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_#1a1a1a] w-full max-w-md animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-5 border-b-4 border-black flex items-start justify-between gap-4 ${
          step === 'done' ? 'bg-[#0055ff]' : step === 'code' ? 'bg-[#ffcc00]' : 'bg-[#e63b2e]'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 border-3 border-black flex items-center justify-center shrink-0 ${
              step === 'done' ? 'bg-white text-[#0055ff]' : 'bg-[#1a1a1a] text-[#ffcc00]'
            }`}>
              {meta.icon}
            </div>
            <div>
              <h2 className={`font-headline font-black text-xl uppercase tracking-tighter ${
                step === 'done' ? 'text-white' : 'text-[#1a1a1a]'
              }`}>
                {meta.title}
              </h2>
              <p className={`font-mono text-[10px] uppercase font-bold mt-0.5 leading-snug max-w-[260px] ${
                step === 'done' ? 'text-white/80' : 'text-[#1a1a1a]/60'
              }`}>
                {meta.sub}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 border-2 border-black bg-white hover:bg-black hover:text-white transition-colors cursor-pointer shrink-0 mt-0.5"
            aria-label="Close"
          >
            <X className="w-4 h-4" strokeWidth={3} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-[#e63b2e] text-white border-2 border-black px-3 py-2.5 font-mono text-[10px] font-bold uppercase shadow-[2px_2px_0px_0px_#1a1a1a]">
              <span className="shrink-0">⚠</span>
              {error}
            </div>
          )}

          {/* ── STEP 1: Email ── */}
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="font-mono text-[10px] uppercase font-black tracking-wider text-zinc-700 block mb-1.5">
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  className="w-full bg-zinc-50 border-2 border-black px-3 py-3 font-mono text-sm focus:outline-none focus:bg-white focus:border-[#0055ff] transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#e63b2e] text-white font-headline font-black text-sm uppercase border-2 border-black px-5 py-3.5 shadow-[4px_4px_0px_0px_#1a1a1a] hover:bg-[#1a1a1a] transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-between"
              >
                <span>{loading ? 'SENDING CODE…' : 'SEND RESET CODE'}</span>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} /> : <span>→</span>}
              </button>
            </form>
          )}

          {/* ── STEP 2: OTP Code ── */}
          {step === 'code' && (
            <form onSubmit={handleCodeSubmit} className="space-y-5">
              <div>
                <label className="font-mono text-[10px] uppercase font-black tracking-wider text-zinc-700 block mb-3">
                  6-DIGIT CODE
                </label>
                <div className="flex gap-2 justify-between">
                  {codeDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { digitRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={digit}
                      onChange={(e) => handleDigitInput(idx, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                      onFocus={(e) => e.target.select()}
                      className="w-12 h-14 text-center font-headline font-black text-2xl border-3 border-black bg-white focus:outline-none focus:border-[#0055ff] focus:bg-[#ffcc00]/20 transition-colors shadow-[2px_2px_0px_0px_#1a1a1a] caret-transparent"
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || codeDigits.join('').length < 6}
                className="w-full bg-[#1a1a1a] text-[#ffcc00] font-headline font-black text-sm uppercase border-2 border-black px-5 py-3.5 shadow-[4px_4px_0px_0px_#ffcc00] hover:bg-[#0055ff] hover:text-white hover:shadow-[4px_4px_0px_0px_#1a1a1a] transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-between"
              >
                <span>{loading ? 'VERIFYING…' : 'VERIFY CODE'}</span>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} /> : <span>→</span>}
              </button>

              <div className="flex items-center justify-between pt-1 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => { setStep('email'); setError(null); setCodeDigits(['', '', '', '', '', '']); }}
                  className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-zinc-500 hover:text-[#0055ff] transition-colors cursor-pointer bg-transparent border-none"
                >
                  <ArrowLeft className="w-3 h-3" strokeWidth={2.5} />
                  CHANGE EMAIL
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                  className="font-mono text-[10px] uppercase font-bold text-zinc-500 hover:text-[#e63b2e] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-transparent border-none"
                >
                  {resendCooldown > 0 ? `RESEND IN ${resendCooldown}s` : 'RESEND CODE'}
                </button>
              </div>
            </form>
          )}

          {/* ── STEP 3: New Password ── */}
          {step === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="font-mono text-[10px] uppercase font-black tracking-wider text-zinc-700 block mb-1.5">
                  NEW PASSWORD
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  minLength={8}
                  placeholder="Min. 8 characters"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setError(null); }}
                  className="w-full bg-zinc-50 border-2 border-black px-3 py-3 font-mono text-sm focus:outline-none focus:bg-white focus:border-[#0055ff] transition-colors"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase font-black tracking-wider text-zinc-700 block mb-1.5">
                  CONFIRM PASSWORD
                </label>
                <input
                  type="password"
                  required
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                  className="w-full bg-zinc-50 border-2 border-black px-3 py-3 font-mono text-sm focus:outline-none focus:bg-white focus:border-[#0055ff] transition-colors"
                />
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="font-mono text-[10px] uppercase font-bold text-[#e63b2e]">
                  ✗ Passwords do not match
                </p>
              )}
              {newPassword && confirmPassword && newPassword === confirmPassword && (
                <p className="font-mono text-[10px] uppercase font-bold text-[#16a34a]">
                  ✓ Passwords match
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0055ff] text-white font-headline font-black text-sm uppercase border-2 border-black px-5 py-3.5 shadow-[4px_4px_0px_0px_#1a1a1a] hover:bg-[#1a1a1a] transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-between"
              >
                <span>{loading ? 'UPDATING…' : 'SET NEW PASSWORD'}</span>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} /> : <span>→</span>}
              </button>
            </form>
          )}

          {/* ── STEP 4: Done ── */}
          {step === 'done' && (
            <div className="space-y-5 text-center py-2">
              <div className="mx-auto w-16 h-16 bg-[#0055ff] border-3 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_#1a1a1a]">
                <CheckCircle2 className="w-8 h-8 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="font-headline font-black text-2xl uppercase tracking-tighter">
                  PASSWORD UPDATED
                </p>
                <p className="font-mono text-[11px] text-zinc-500 uppercase font-bold mt-1">
                  Log in with your new password.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-[#1a1a1a] text-[#ffcc00] font-headline font-black text-sm uppercase border-2 border-black px-5 py-3.5 shadow-[4px_4px_0px_0px_#ffcc00] hover:bg-[#0055ff] hover:text-white hover:shadow-[4px_4px_0px_0px_#1a1a1a] transition-colors cursor-pointer"
              >
                BACK TO LOGIN →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
