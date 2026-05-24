import React from 'react';

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
  handleGoogleAuthenticate: () => void;
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
  handleGoogleAuthenticate
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
            {/* Yellow logo element */}
            <div className="w-16 h-16 bg-[#ffcc00] border-3 border-black rounded-2xl flex items-center justify-center shadow-[3px_3px_0px_0px_#1a1a1a] select-none">
              <span className="font-headline font-black text-2xl text-black">HF</span>
            </div>

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

          {/* Cyberpunk circuit wire / terminal diagram representation */}
          <div className="bg-[#1a1a1a] p-4 border-3 border-[#1a1a1a] shadow-[4px_4px_0px_0px_#ffcc00] font-mono text-[10px] text-zinc-400 select-none overflow-hidden h-40 relative flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 border-b border-zinc-800 pb-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#e63b2e] block"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffcc00] block"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
                <span className="ml-1 text-zinc-500">FEED_STREAM://ACTIVE_PROT</span>
              </div>
              <p className="text-[#ffcc00] font-bold">» SYS.INIT: PROTOCOL_GATE_V3_5</p>
              <p className="opacity-75">» CONSTRUCTING WEIMAR_BUILD_ENGINE_v42.TS...</p>
              <p className="opacity-50">» ESTABLISHING PERSISTENT CLOUD SECURITY CODES...</p>
            </div>
            <div className="flex justify-between items-center text-zinc-650 font-extrabold text-[9px]">
              <span>SECURE CONSOLE</span>
              <span>v3.5 // AUTHWAY</span>
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

          {/* Google Button Authentication */}
          <button 
            type="button"
            onClick={handleGoogleAuthenticate}
            disabled={isAuthenticating}
            className="w-full border-3 border-black p-3.5 flex items-center justify-center gap-3 bg-white text-[#1a1a1a] font-headline font-black text-xs uppercase hover:bg-zinc-50 active:translate-y-[2px] transition-all cursor-pointer select-none"
          >
            {/* Colored G SVG */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
            CONTINUE WITH GOOGLE
          </button>

        </div>

      </div>
    </div>
  );
};
