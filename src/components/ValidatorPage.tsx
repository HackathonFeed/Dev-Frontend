import React from 'react';
import { Sparkles, Layers, Clock, CheckCircle2, BookOpen, Users } from 'lucide-react';
import Markdown from 'react-markdown';
import { Hackathon, TrackedApplication, ValidatorResponse } from '../types';
import { appendEvent, createTimelineEvent, createTrackedProject } from '../lib/trackedProjects';

interface ValidatorPageProps {
  hackathons: Hackathon[];
  valTitle: string;
  setValTitle: (val: string) => void;
  valHackathon: string;
  setValHackathon: (val: string) => void;
  valStack: string;
  setValStack: (val: string) => void;
  valPitch: string;
  setValPitch: (val: string) => void;
  isValidating: boolean;
  handleValidateIdea: (e: React.FormEvent) => void;
  
  pastValidations: Array<{
    id: string;
    title: string;
    hackathon: string;
    pitch: string;
    date: string;
    data: ValidatorResponse;
  }>;
  clearEvaluationHistory: () => void;
  validationResult: ValidatorResponse | null;
  setValidationResult: (res: ValidatorResponse | null) => void;
  
  VALIDATION_TAGLINES: string[];
  activeTaglineIndex: number;
  
  trackedApps: TrackedApplication[];
  setTrackedApps: (apps: TrackedApplication[]) => void;
  setActiveTab: (tab: 'landing' | 'explore' | 'tracker' | 'validator' | 'auth') => void;
}

export const ValidatorPage: React.FC<ValidatorPageProps> = ({
  hackathons,
  valTitle,
  setValTitle,
  valHackathon,
  setValHackathon,
  valStack,
  setValStack,
  valPitch,
  setValPitch,
  isValidating,
  handleValidateIdea,
  pastValidations,
  clearEvaluationHistory,
  validationResult,
  setValidationResult,
  VALIDATION_TAGLINES,
  activeTaglineIndex,
  trackedApps,
  setTrackedApps,
  setActiveTab
}) => {
  return (
    <div className="max-w-[1440px] mx-auto px-6 py-12">
      
      {/* Header banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end border-b-4 border-black pb-6 mb-10 gap-4">
        <div>
          <span className="font-mono text-xs bg-black text-[#ffcc00] py-1 px-3 uppercase font-bold tracking-widest flex items-center gap-2 w-fit">
            <Sparkles className="w-3.5 h-3.5" />
            WEIMAR AI NEURAL ENGINE
          </span>
          <h2 className="font-headline text-5xl md:text-6xl font-black uppercase tracking-tighter mt-2">
            AI IDEA VALIDATOR
          </h2>
        </div>
        <p className="font-mono text-xs uppercase text-zinc-500 max-w-md font-bold">
          Run your hackathon draft concept through our elite jurors. Get scores, checklists, teammate rosters, and architectural critique.
        </p>
      </div>

      {/* Split layout: Input Panel on Left, Result Workspace on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Form Input Deck (lg:col-span-5) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_#1a1a1a] space-y-5">
            
            <div className="flex justify-between items-center pb-2 border-b-2 border-black">
              <span className="font-headline font-black uppercase text-base text-blue-600 flex items-center gap-1.5">
                <Layers className="w-5 h-5" />
                Composition Deck
              </span>
              <span className="font-mono text-[9px] bg-black text-white px-2 font-bold py-0.5">GEMINI FLASH V3.5</span>
            </div>

            <form onSubmit={handleValidateIdea} className="space-y-4">
              
              <div>
                <label className="block font-mono text-[11px] uppercase font-black text-[#1a1a1a] mb-1 select-none">
                  1. Proposed App Project Title *
                </label>
                <input 
                  type="text" required
                  className="w-full bg-[#f5f5f5] p-3 border-2 border-black tracking-wide focus:outline-none uppercase text-xs font-mono font-black"
                  placeholder="e.g. AGI Sovereign Middleware"
                  value={valTitle}
                  onChange={(e) => setValTitle(e.target.value)}
                  disabled={isValidating}
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase font-black text-[#1a1a1a] mb-1 select-none">
                  2. Target Hackathon Forge *
                </label>
                <select 
                  className="w-full bg-[#f5f5f5] p-3 border-2 border-black text-xs uppercase font-extrabold focus:outline-none"
                  value={valHackathon}
                  onChange={(e) => setValHackathon(e.target.value)}
                  disabled={isValidating}
                >
                  {hackathons.map((h) => (
                    <option key={h.id} value={h.title}>
                      {h.title}
                    </option>
                  ))}
                  <option value="Any global hackathon">Other Global Forge (Indie)</option>
                </select>
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase font-black text-[#1a1a1a] mb-1 select-none">
                  3. Intended Technology Stack
                </label>
                <input 
                  type="text"
                  className="w-full bg-[#f5f5f5] p-3 border-2 border-black tracking-wide focus:outline-none uppercase text-xs font-mono font-bold"
                  placeholder="e.g. solidity, react, python, webrtc"
                  value={valStack}
                  onChange={(e) => setValStack(e.target.value)}
                  disabled={isValidating}
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase font-black text-[#1a1a1a] mb-1 select-none">
                  4. Concept & Innovation Pitch *
                </label>
                <textarea 
                  rows={6} required
                  className="w-full bg-[#f5f5f5] p-3 border-2 border-black tracking-wide focus:outline-none text-xs font-mono text-black font-bold uppercase resize-none"
                  placeholder="Detail the actual engineering flow. Speak conceptually about what you will build. Avoid flowery corporate jargon, solve the user problem directly..."
                  value={valPitch}
                  onChange={(e) => setValPitch(e.target.value)}
                  disabled={isValidating}
                />
              </div>

              <button 
                type="submit"
                disabled={isValidating || !valTitle.trim() || !valPitch.trim()}
                className="w-full flex items-center justify-center gap-3 bg-[#e63b2e] text-white py-4 font-headline uppercase font-black text-sm border-3 border-black shadow-[4px_4px_0px_0px_#1a1a1a] tracking-wider hover:bg-black hover:text-[#ffcc00] transition-all text-center cursor-pointer disabled:opacity-50"
              >
                {isValidating ? (
                  <>
                    <Clock className="w-5 h-5 animate-spin" />
                    ENGINES POWERING ON...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-[#ffcc00]" />
                    VALIDATE WITH NEURAL AJUROR
                  </>
                )}
              </button>

            </form>

          </div>

          {/* Past brainstorming local history list card */}
          {pastValidations.length > 0 && (
            <div className="bg-[#1a1a1a] text-white p-6 border-4 border-black">
              <div className="flex justify-between items-center pb-2 border-b-2 border-zinc-800 mb-4 select-none">
                <span className="font-headline font-black uppercase text-sm text-[#ffcc00]">
                  Brainstorm Archives ({pastValidations.length})
                </span>
                <button 
                  onClick={clearEvaluationHistory}
                  className="text-[10px] font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer uppercase border border-zinc-700 px-1 hover:border-white bg-transparent"
                  title="Delete past history from explorer"
                >
                  Clear
                </button>
              </div>

              <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2">
                {pastValidations.map((hist) => (
                  <div 
                    key={hist.id}
                    onClick={() => {
                      setValidationResult(hist.data);
                      setValTitle(hist.title);
                      setValPitch(hist.pitch);
                    }}
                    className="p-3 border-2 border-zinc-850 bg-[#252525] hover:bg-zinc-800 cursor-pointer font-mono text-xs flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-center text-[10px] text-zinc-500 mb-1">
                      <span>#{hist.data.feasibilityScore}/10 Feasibility</span>
                      <span>{hist.date}</span>
                    </div>
                    <span className="font-headline font-extrabold text-[#ffcc00] uppercase truncate">
                      {hist.title}
                    </span>
                    <span className="text-[10px] text-zinc-400 uppercase line-clamp-1 truncate block mt-1">
                      {hist.pitch}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Outputs panel on Right (lg:col-span-7) */}
        <div className="lg:col-span-7">
          
          {/* 1. Loading active state screen */}
          {isValidating && (
            <div className="bg-[#f5f0e8] border-4 border-dashed border-black/50 text-center py-24 px-6 flex flex-col items-center justify-center gap-6">
              <div className="relative">
                {/* Stylized custom CSS spinner blocks */}
                <div className="w-16 h-16 border-8 border-blue-600 border-t-white animate-spin rounded-none"></div>
                <span className="absolute top-5 left-5 text-xl font-bold select-none text-blue-600">✦</span>
              </div>

              <div className="space-y-2">
                <p className="font-headline text-2xl font-black uppercase text-black tracking-wide">
                  Constructing Critical Verdict
                </p>
                
                <div className="bg-black text-[#ffcc00] font-mono text-xs uppercase px-4 py-2 font-bold inline-block border-2 border-black animate-pulse">
                  &quot; {VALIDATION_TAGLINES[activeTaglineIndex]} &quot;
                </div>
              </div>

              <p className="font-mono text-[10px] uppercase text-zinc-500 max-w-sm">
                Form following function. The Gemini Chief strategist model compiles your technologic stack constraints against real hackathon scoring schemas.
              </p>
            </div>
          )}

          {/* 2. Standard inactive blank placeholder */}
          {!isValidating && !validationResult && (
            <div className="bg-white border-4 border-dashed border-zinc-300 text-center py-24 px-6 flex flex-col items-center justify-center gap-4">
              <span className="text-6xl text-blue-600">✦</span>
              <div>
                <h4 className="font-headline text-2xl font-black uppercase text-black">
                  No active validation feedback
                </h4>
                <p className="font-mono text-xs uppercase text-zinc-450 mt-1 max-w-md mx-auto">
                  Your draft coordinates have not been sent yet. Click the &ldquo;Compile with Neural Ajuror&rdquo; button to analyze technical feasibility.
                </p>
              </div>
            </div>
          )}

          {/* 3. Output Result Active Dashboard card */}
          {validationResult && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Scores dashboard overview */}
              <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_#1a1a1a]">
                
                <div className="flex justify-between items-center pb-2 border-b-2 border-black mb-6">
                  <span className="font-headline font-black text-xl uppercase text-blue-600">
                    Jurist Board Analytics
                  </span>
                  <span className="font-mono text-xs uppercase font-extrabold bg-black text-white px-2">
                    Evaluated
                  </span>
                </div>

                {/* Score metrics bar grids */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  
                  {/* Metric 1 */}
                  <div className="bg-[#fcfca0]/10 border-2 border-black p-4 flex flex-col justify-between items-center text-center">
                    <span className="font-mono text-[10px] uppercase font-bold text-zinc-500">
                      Technical Feasibility
                    </span>
                    <span className="font-headline font-black text-5xl text-blue-600 my-2 select-none">
                      {validationResult.feasibilityScore}<span className="text-xl text-black">/10</span>
                    </span>
                    {/* Colored block bar representation representing Bauhaus visual */}
                    <div className="w-full bg-zinc-100 h-2 border border-black">
                      <div className="bg-blue-600 h-full" style={{ width: `${validationResult.feasibilityScore * 10}%` }}></div>
                    </div>
                  </div>

                  {/* Metric 2 */}
                  <div className="bg-[#fcfca0]/10 border-2 border-black p-4 flex flex-col justify-between items-center text-center">
                    <span className="font-mono text-[10px] uppercase font-bold text-zinc-500">
                      Originality Quotient
                    </span>
                    <span className="font-headline font-black text-5xl text-[#e63b2e] my-2 select-none">
                      {validationResult.originalityScore}<span className="text-xl text-black">/10</span>
                    </span>
                    <div className="w-full bg-zinc-100 h-2 border border-black">
                      <div className="bg-[#e63b2e] h-full" style={{ width: `${validationResult.originalityScore * 10}%` }}></div>
                    </div>
                  </div>

                  {/* Metric 3 */}
                  <div className="bg-[#fcfca0]/10 border-2 border-black p-4 flex flex-col justify-between items-center text-center">
                    <span className="font-mono text-[10px] uppercase font-bold text-zinc-500">
                      Brutalist Directiveness
                    </span>
                    <span className="font-headline font-black text-5xl text-black my-2 select-none">
                      {validationResult.brutalistDirectness}<span className="text-xl text-black">/10</span>
                    </span>
                    <div className="w-full bg-zinc-100 h-2 border border-black">
                      <div className="bg-black h-full" style={{ width: `${validationResult.brutalistDirectness * 10}%` }}></div>
                    </div>
                  </div>

                </div>

                {/* Verdict banner */}
                <div className="bg-[#ffcc00] border-2 border-black p-4 font-mono font-bold text-xs uppercase mb-6 text-black">
                  <span className="font-extrabold text-[#e63b2e] block mb-1">■ Core Verdict Tagline:</span>
                  &ldquo; {validationResult.verdictSummary} &rdquo;
                </div>

                {/* Checklist Upgrades to win */}
                <div className="space-y-4">
                  <h4 className="font-headline font-black text-sm uppercase text-black flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-[#e63b2e]" strokeWidth={3} />
                    Required Upgrades to Take First Place:
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {validationResult.requiredUpgrades.map((upgrade, i) => (
                      <div key={i} className="bg-zinc-50 border-2 border-black p-3 font-mono text-[11px] font-bold uppercase text-zinc-700 leading-tight">
                        <span className="text-black font-black mr-1">{i + 1}.</span> {upgrade}
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Master art critic critique panel */}
              <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0px_0px_#1a1a1a] space-y-4">
                
                <div className="flex justify-between items-center pb-2 border-b-2 border-black">
                  <span className="font-headline font-black text-sm uppercase text-black flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    Weimar-Tech Architectural Review
                  </span>
                  <span className="font-mono text-[9px] uppercase font-bold text-[#e63b2e]">Master Evaluation</span>
                </div>

                {/* Markdown rendered layout review */}
                <div className="text-xs font-mono prose prose-zinc max-w-none text-zinc-800 leading-relaxed uppercase bg-zinc-50 p-4 border border-zinc-200">
                  <Markdown>{validationResult.critique}</Markdown>
                </div>

              </div>

              {/* Roster & Styling blocks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Teammates recommendation card */}
                <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_#1a1a1a] space-y-3">
                  <h4 className="font-headline font-black text-xs uppercase text-[#e63b2e] flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-blue-600" />
                    Recruit These Experts:
                  </h4>
                  
                  <ul className="space-y-2">
                    {validationResult.suggestedTeammates.map((teammate, i) => (
                      <li key={i} className="font-mono text-[10px] font-bold uppercase p-2 bg-zinc-50 border border-black leading-tight">
                        <span className="text-blue-600 font-black block mb-0.5">■ Role {i+1}</span>
                        {teammate}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Styling Proposal */}
                <div className="bg-black text-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_#ffcc00] space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h4 className="font-headline font-black text-xs uppercase text-[#ffcc00] flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-white" />
                      Front-End Visual Motif:
                    </h4>
                    
                    <p className="font-mono text-[10px] text-zinc-300 leading-relaxed uppercase">
                      {validationResult.visualThemeProposal}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                    <button 
                      onClick={() => {
                        let project = createTrackedProject({
                          title: valTitle,
                          hackathonName: valHackathon,
                          prizePool: '$100,000',
                          deadline: '',
                          concept: validationResult.verdictSummary,
                        });
                        project = {
                          ...project,
                          milestones: validationResult.requiredUpgrades.map((upg, sidx) => ({
                            id: `m-upg-${sidx}-${Date.now()}`,
                            text: upg,
                            completed: false,
                          })),
                          team: ['Lead Builder', 'Architect API proxy'],
                        };
                        project = appendEvent(
                          project,
                          createTimelineEvent(
                            'idea_validated',
                            'AI validation run',
                            validationResult.verdictSummary,
                          ),
                        );
                        setTrackedApps([project, ...trackedApps]);
                        setActiveTab('tracker');
                      }}
                      className="bg-white text-black text-[10px] font-headline font-black py-2.5 px-3 uppercase border-2 border-white hover:bg-[#ffcc00] hover:text-black transition-all cursor-pointer inline-block border-none"
                    >
                      Export project to Tracker
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
};
