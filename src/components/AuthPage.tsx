import React from 'react';
import { GoogleSignInButton } from './GoogleSignInButton';

interface AuthPageProps {
  setActiveTab: (tab: 'landing' | 'explore' | 'tracker' | 'validator' | 'auth') => void;
  setPendingTab: (tab: 'tracker' | 'explore' | 'validator' | null) => void;
  authMode: 'login' | 'register';
  setAuthMode: (mode: 'login' | 'register') => void;
  apiError: string | null;
  setApiError: (err: string | null) => void;
  inputEmail: string;
  setInputEmail: (email: string) => void;
  inputPassword: string;
  setInputPassword: (psw: string) => void;
  isAuthenticating: boolean;
  handleAuthenticate: (e: React.FormEvent) => void;
  onGoogleCredential: (idToken: string) => void;
  onGoogleError: (message: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  setActiveTab,
  setPendingTab,
  authMode,
  setAuthMode,
  apiError,
  setApiError,
  inputEmail,
  setInputEmail,
  inputPassword,
  setInputPassword,
  isAuthenticating,
  handleAuthenticate,
  onGoogleCredential,
  onGoogleError,
}) => {
  return (
    <div className="bg-[#f5f0e8] py-16 px-4 md:px-8 flex items-center justify-center min-h-[75vh] animate-fadeIn">
      <div className="bg-white border-4 border-[#1a1a1a] rounded-[12px] p-8 md:p-12 shadow-[0px_8px_0px_0px_#0055ff] max-w-5xl w-full mx-auto grid grid-cols-1 md:grid-cols-12 gap-12 relative">
        
        {/* Back button link */}
        <button 
          onClick={() => {
            setActiveTab('landing');
            setPendingTab(null);
          }}
          className="absolute top-6 left-6 md:top-8 md:left-8 flex items-center gap-1.5 font-headline font-black text-xs uppercase tracking-wider text-black hover:text-[#e63b2e] group transition-colors cursor-pointer border-none bg-transparent"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span>
          RETURN TO BASE
        </button>

        {/* Left Column: Visual Brand Identity */}
        <div className="md:col-span-6 flex flex-col justify-between pt-10 gap-8">
          <div className="space-y-6">
            <div>
              <h2 className="font-headline font-black text-5xl md:text-[68px] leading-[0.85] tracking-tighter text-[#1a1a1a] uppercase select-none">
                HACKATHON
              </h2>
              <h3 className="font-headline font-black text-5xl md:text-[68px] leading-[0.85] tracking-tighter text-[#e63b2e] uppercase select-none">
                FEED
              </h3>
            </div>

            <p className="font-headline font-black text-sm uppercase text-black leading-tight max-w-sm select-none">
              FORM FOLLOWS FUNCTION. CODE FOLLOWS LOGIC. JOIN THE COLLECTIVE.
            </p>
          </div>

          <div className="bg-[#1a1a1a] p-4 border-3 border-black shadow-[4px_4px_0px_0px_#ffcc00] font-mono text-[11px] text-zinc-300 select-none overflow-hidden min-h-[168px] flex flex-col">
            <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e63b2e] block" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffcc00] block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" />
              <span className="ml-1 text-zinc-500 text-[10px]">hackathonfeed — zsh</span>
            </div>
            <div className="space-y-2 flex-1">
              <p>
                <span className="text-emerald-400">➜</span>{' '}
                <span className="text-zinc-500">~/hackathons</span>{' '}
                <span className="text-[#ffcc00] font-bold">hackathonfeed add .</span>
              </p>
              <p>
                <span className="text-emerald-400">➜</span>{' '}
                <span className="text-zinc-500">~/hackathons</span>{' '}
                <span className="text-white">hackathonfeed commit -m &quot;&quot;</span>
              </p>
              <p>
                <span className="text-emerald-400">➜</span>{' '}
                <span className="text-zinc-500">~/hackathons</span>{' '}
                <span className="text-[#ffcc00] font-bold">hackathonfeed push</span>
              </p>
              <p className="text-zinc-600 pt-1">
                <span className="text-emerald-400">➜</span>{' '}
                <span className="inline-block w-2 h-3.5 bg-[#ffcc00] animate-pulse align-middle" />
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Form UI */}
        <div className="md:col-span-6 flex flex-col justify-center pt-10 md:pt-14 pb-4">
          
          {/* Toggles */}
          <div className="flex items-center gap-6 mb-8 font-headline">
            <button 
              type="button"
              onClick={() => { setAuthMode('login'); setApiError(null); }}
              className={`text-sm tracking-wider uppercase font-black transition-colors pb-1 cursor-pointer border-none bg-transparent ${
                authMode === 'login' 
                  ? 'text-black border-b-4 border-black' 
                  : 'text-zinc-400 hover:text-black'
              }`}
            >
              LOGIN
            </button>
            <span className="text-zinc-300 text-xl font-thin select-none">|</span>
            <button 
              type="button"
              onClick={() => { setAuthMode('register'); setApiError(null); }}
              className={`text-sm tracking-wider uppercase font-black transition-colors pb-1 cursor-pointer border-none bg-transparent ${
                authMode === 'register' 
                  ? 'text-black border-b-4 border-[#ffcc00]' 
                  : 'text-zinc-400 hover:text-black'
              }`}
            >
              CREATE ACCOUNT
            </button>
          </div>

          {apiError && (
            <div className="bg-[#e63b2e]/10 border-2 border-[#e63b2e] text-[#e63b2e] font-mono text-xs p-3.5 mb-6 uppercase font-bold">
              [SYSTEM ERROR]: {apiError}
            </div>
          )}

          <form onSubmit={handleAuthenticate} className="space-y-6">
            
            {/* Identification */}
            <div>
              <label className="block font-mono text-[11px] uppercase font-bold text-black mb-2 select-none tracking-wider">
                EMAIL IDENTIFICATION
              </label>
              <input 
                type="email" 
                required
                placeholder="SYS.ADMIN@HACKATHON.DEV"
                className="w-full bg-white p-3 border-2 border-black font-bold placeholder:text-zinc-300 text-[#1a1a1a] uppercase text-xs focus:ring-0 focus:outline-none"
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="font-mono text-[11px] uppercase font-bold text-black select-none tracking-wider">
                  SECURITY PROTOCOL
                </label>
                <button 
                  type="button"
                  onClick={() => setApiError('Verification key recovery signal dispatched to neural index.')}
                  className="font-mono text-[10px] uppercase text-zinc-500 hover:text-black underline cursor-pointer border-none bg-transparent"
                >
                  FORGOT PROTOCOL?
                </button>
              </div>
              <input 
                type="password" 
                required
                placeholder="•••••••••••••"
                className="w-full bg-white p-3 border-2 border-black font-mono text-[#1a1a1a] text-xs focus:ring-0 focus:outline-none"
                value={inputPassword}
                onChange={(e) => setInputPassword(e.target.value)}
              />
            </div>

            {/* Main Yellow Block Submit Button */}
            <button 
              type="submit"
              disabled={isAuthenticating}
              className="w-full bg-[#ffcc00] border-3 border-black p-4 uppercase font-headline font-black text-sm tracking-tight flex items-center justify-between shadow-[4px_4px_0px_0px_#1a1a1a] hover:bg-[#1a1a1a] hover:text-[#ffcc00] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer disabled:opacity-50 text-left"
            >
              {isAuthenticating ? 'AUTHENTICATING...' : authMode === 'login' ? 'AUTHENTICATE' : 'GENERATE CREDENTIALS'}
              <span className="font-sans text-xl font-bold">→</span>
            </button>

          </form>

          <div className="relative my-8 text-center select-none">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200"></div>
            </div>
            <span className="relative px-3 bg-white text-zinc-400 font-mono text-[10px] font-bold uppercase tracking-wider">
              OR ACCESS VIA
            </span>
          </div>

          <GoogleSignInButton
            disabled={isAuthenticating}
            onCredential={onGoogleCredential}
            onError={onGoogleError}
            className="w-full border-3 border-black p-3.5 flex items-center justify-center gap-3 bg-white text-[#1a1a1a] font-headline font-black text-xs uppercase hover:bg-zinc-50 active:translate-y-[2px] transition-all cursor-pointer select-none disabled:opacity-50"
          />

        </div>

      </div>
    </div>
  );
};
