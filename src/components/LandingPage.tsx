import React from 'react';
import { Search, Globe, Layers, Sparkles, ExternalLink } from 'lucide-react';
import { CircuitBoardIllustration } from './CircuitBoardIllustration';

interface LandingPageProps {
  setActiveTab: (tab: 'landing' | 'explore' | 'tracker' | 'validator' | 'auth') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  handleTrackerAccess: () => void;
  setValHackathon: (hackathon: string) => void;
  triggerTrackingForHackathon: (hackathon: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  setActiveTab,
  searchQuery,
  setSearchQuery,
  handleTrackerAccess,
  setValHackathon,
  triggerTrackingForHackathon
}) => {
  return (
    <div className="animate-fadeIn">
      
      {/* HERO SECTION CONTAINER - Yellow background matching screenshot exactly */}
      <section className="relative bg-[#ffcc00] border-b-4 border-black w-full overflow-hidden py-16 md:py-24 animate-fadeIn">
        <div className="max-w-[1440px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column contents */}
          <div className="z-10 lg:col-span-7 flex flex-col items-start">
            
            <h1 className="font-headline text-6xl md:text-8xl lg:text-[115px] font-black uppercase tracking-tighter leading-[0.82] text-[#1a1a1a] mb-10 select-none">
              BUILD<br />THE<br />FUTURE
            </h1>

            {/* Search input exactly styled */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                setActiveTab('explore');
              }}
              className="bg-white border-4 border-black w-full max-w-xl shadow-[4px_4px_0px_0px_#1a1a1a] p-2 flex items-center mb-8 gap-3"
            >
              <Search className="w-6 h-6 text-[#1a1a1a] pl-1 shrink-0" />
              <input 
                type="text"
                className="w-full bg-transparent border-none text-base font-bold font-body placeholder:text-zinc-400 focus:ring-0 focus:outline-none uppercase"
                placeholder="Search Every Hackathon, Bounties, Tech..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button 
                type="submit"
                className="bg-[#1a1a1a] text-white font-headline font-black px-6 py-2.5 uppercase hover:bg-zinc-805 hover:text-[#ffcc00] transition-colors text-xs cursor-pointer"
              >
                FIND
              </button>
            </form>

            <button 
              onClick={handleTrackerAccess}
              className="inline-block bg-[#1a1a1a] text-white font-headline font-black text-xl uppercase px-10 py-5 border-4 border-black shadow-[6px_6px_0px_0px_#ffffff] hover:bg-[#ffcc00] hover:text-black transition-all hover:shadow-[4px_4px_0px_0px_#1a1a1a] active:translate-x-1 active:translate-y-1 cursor-pointer"
            >
              START TRACKING
            </button>

          </div>

          {/* Right Side Motherboard high-fidelity visual illustration */}
          <div className="lg:col-span-5 hidden lg:block bg-white border-4 border-black shadow-[8px_8px_0px_0px_#1a1a1a] p-4 aspect-video flex items-center justify-center">
            <CircuitBoardIllustration />
          </div>

        </div>
      </section>

      {/* THREE VERTICAL WHITE FEATURE PANELS */}
      <section className="bg-[#f5f0e8] py-16 border-b-4 border-black">
        <div className="max-w-[1440px] mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Panel 1 */}
          <div 
            onClick={() => setActiveTab('explore')}
            className="bg-white border-4 border-black p-8 flex flex-col justify-between items-start gap-12 group cursor-pointer hover:translate-y-[-4px] active:translate-y-0 transition-all shadow-[6px_6px_0px_0px_#1a1a1a] hover:shadow-[10px_10px_0px_0px_#1a1a1a]"
          >
            <div className="w-16 h-16 bg-[#eee9e0] border-3 border-black flex items-center justify-center group-hover:bg-[#ffcc00] transition-colors shadow-[3px_3px_0px_0px_#1a1a1a]">
              <Globe className="w-8 h-8 text-[#1a1a1a]" />
            </div>
            <div>
              <h3 className="font-headline font-black text-2xl uppercase tracking-tight mb-2 text-[#1a1a1a]">
                HACKATHON AGGREGATOR
              </h3>
              <p className="font-body text-sm font-bold text-zinc-600 leading-relaxed uppercase">
                Explore every hackathon across the web in one place. Filter by tech stacks, prize pools, and timelines.
              </p>
            </div>
          </div>

          {/* Panel 2 */}
          <div 
            onClick={handleTrackerAccess}
            className="bg-white border-4 border-black p-8 flex flex-col justify-between items-start gap-12 group cursor-pointer hover:translate-y-[-4px] active:translate-y-0 transition-all shadow-[6px_6px_0px_0px_#1a1a1a] hover:shadow-[10px_10px_0px_0px_#0055ff]"
          >
            <div className="w-16 h-16 bg-[#eee9e0] border-3 border-black flex items-center justify-center group-hover:bg-[#0055ff] group-hover:text-white transition-colors shadow-[3px_3px_0px_0px_#1a1a1a]">
              <Layers className="w-8 h-8 text-[#1a1a1a] group-hover:text-white" />
            </div>
            <div>
              <h3 className="font-headline font-black text-2xl uppercase tracking-tight mb-2 text-[#1a1a1a]">
                APPLICATION TRACKER
              </h3>
              <p className="font-body text-sm font-bold text-zinc-600 leading-relaxed uppercase">
                Monitor your status, deadlines, and submissions effortlessly on custom-built brutalist Kanban pipelines.
              </p>
            </div>
          </div>

          {/* Panel 3 */}
          <div 
            onClick={() => setActiveTab('validator')}
            className="bg-white border-4 border-black p-8 flex flex-col justify-between items-start gap-12 group cursor-pointer hover:translate-y-[-4px] active:translate-y-0 transition-all shadow-[6px_6px_0px_0px_#1a1a1a] hover:shadow-[10px_10px_0px_0px_#e63b2e]"
          >
            <div className="w-16 h-16 bg-[#eee9e0] border-3 border-black flex items-center justify-center group-hover:bg-[#e63b2e] group-hover:text-white transition-colors shadow-[3px_3px_0px_0px_#1a1a1a]">
              <Sparkles className="w-8 h-8 text-[#1a1a1a] group-hover:text-white" />
            </div>
            <div>
              <h3 className="font-headline font-black text-2xl uppercase tracking-tight mb-2 text-[#1a1a1a]">
                AI IDEA VALIDATOR
              </h3>
              <p className="font-body text-sm font-bold text-zinc-600 leading-relaxed uppercase">
                Get instant feedback on your project concepts from our neural engineering jury. Pitch, score, upgrade.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* "HOW IT WORKS" BLOCKS ROW */}
      <section className="bg-[#f5f0e8] py-16 border-b-4 border-black">
        <div className="max-w-[1440px] mx-auto px-6">
          
          <h2 className="font-headline text-5xl md:text-6xl font-black uppercase text-center tracking-tighter mb-16 select-none">
            HOW IT WORKS
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            
            {/* Block 01 */}
            <div 
              onClick={() => setActiveTab('explore')}
              className="bg-[#ffcc00] border-4 border-black p-6 shadow-[5px_5px_0px_0px_#1a1a1a] flex flex-col gap-8 cursor-pointer hover:-translate-y-1 transition-all"
            >
              <span className="font-headline font-black text-3xl">01</span>
              <div>
                <h4 className="font-headline font-black text-xl uppercase mb-2">DISCOVER</h4>
                <p className="font-mono text-xs font-bold uppercase leading-relaxed text-[#1a1a1a]/85">
                  Explore our vast database matching your skill set parameters. Find the perfect forge.
                </p>
              </div>
            </div>

            {/* Block 02 */}
            <div 
              onClick={() => setActiveTab('validator')}
              className="bg-[#eee9e0] border-4 border-black p-6 shadow-[5px_5px_0px_0px_#1a1a1a] flex flex-col gap-8 cursor-pointer hover:-translate-y-1 transition-all"
            >
              <span className="font-headline font-black text-3xl">02</span>
              <div>
                <h4 className="font-headline font-black text-xl uppercase mb-2">VALIDATE</h4>
                <p className="font-mono text-xs font-bold uppercase leading-relaxed text-[#1a1a1a]/85">
                  Run your short ideas on our neural engine to check potential feasibility and get required upgrades.
                </p>
              </div>
            </div>

            {/* Block 03 */}
            <div 
              onClick={handleTrackerAccess}
              className="bg-[#e63b2e] text-white border-4 border-black p-6 shadow-[5px_5px_0px_0px_#1a1a1a] flex flex-col gap-8 cursor-pointer hover:-translate-y-1 transition-all"
            >
              <span className="font-headline font-black text-3xl">03</span>
              <div>
                <h4 className="font-headline font-black text-xl uppercase mb-2 text-white">TRACK</h4>
                <p className="font-mono text-xs font-bold uppercase leading-relaxed text-white/90">
                  Manage applications, teams, and milestones on our kanban boards. Move seamlessly to release.
                </p>
              </div>
            </div>

            {/* Block 04 */}
            <div 
              onClick={handleTrackerAccess}
              className="bg-white border-4 border-black p-6 shadow-[5px_5px_0px_0px_#1a1a1a] flex flex-col gap-8 cursor-pointer hover:-translate-y-1 transition-all"
            >
              <span className="font-headline font-black text-3xl">04</span>
              <div>
                <h4 className="font-headline font-black text-xl uppercase mb-2">BUILD</h4>
                <p className="font-mono text-xs font-bold uppercase leading-relaxed text-[#1a1a1a]/85">
                  Focus on execution and winning hackathons targeting your stack. Form follows function.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* "TRENDING FORGES" - Dark thematic block */}
      <section className="bg-[#1a1a1a] text-white py-20 border-b-4 border-black">
        <div className="max-w-[1440px] mx-auto px-6">
          
          <div className="flex justify-between items-center mb-12 border-b-2 border-white/20 pb-4">
            <h2 className="font-headline text-4xl md:text-5xl font-black uppercase text-white tracking-tighter">
              TRENDING FORGES
            </h2>
            <button 
              onClick={() => setActiveTab('explore')}
              className="font-headline font-bold text-sm uppercase text-[#ffcc00] hover:underline flex items-center gap-1 cursor-pointer"
            >
              VIEW ALL ↗
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Card 1: AGI Frontiers */}
            <div className="bg-white text-black border-4 border-[#ffcc00] p-8 flex flex-col justify-between gap-8 shadow-[6px_6px_0px_0px_#ffcc00]">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className="bg-[#1a1a1a] text-white text-[10px] font-mono font-bold uppercase py-1 px-3">
                    LIVE NOW
                  </span>
                  <span className="font-headline font-black text-xl text-[#0055ff]">$500,000 PRIZE POOL</span>
                </div>
                <h3 className="font-headline font-black text-3xl uppercase tracking-tight text-[#1a1a1a]">
                  AGI Frontiers
                </h3>
                <p className="font-mono text-xs font-bold uppercase text-zinc-650 leading-relaxed">
                  Forge the sovereign artificial general intelligence middleware. Highly technical, raw algorithmic implementations only.
                </p>
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t border-zinc-200">
                <div className="flex gap-2">
                  <span className="border border-black px-2 py-0.5 text-[9px] font-mono font-bold bg-[#eee9e0]">#AI/ML</span>
                  <span className="border border-black px-2 py-0.5 text-[9px] font-mono font-bold bg-[#eee9e0]">#Web3</span>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setValHackathon('AGI Frontiers');
                      setActiveTab('validator');
                    }}
                    className="bg-[#eee9e0] border-2 border-black text-[10px] font-headline font-black px-3 py-1.5 uppercase hover:bg-[#ffcc00] cursor-pointer"
                  >
                    AI PLAN
                  </button>
                  <button 
                    onClick={() => triggerTrackingForHackathon('AGI Frontiers')}
                    className="bg-[#1a1a1a] text-white border-2 border-black text-[10px] font-headline font-black px-3 py-1.5 uppercase hover:bg-[#ffcc00] hover:text-black cursor-pointer"
                  >
                    TRACK PLAN
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2: DeFi Summer Hack */}
            <div className="bg-[#eee9e0] text-[#1a1a1a] border-4 border-black p-8 flex flex-col justify-between gap-8 shadow-[6px_6px_0px_0px_#0055ff]">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <span className="bg-[#0055ff] text-white text-[10px] font-mono font-bold uppercase py-1 px-3">
                    STARTS IN 3 DAYS
                  </span>
                  <span className="font-headline font-black text-xl text-[#0055ff]">$150,000 PRIZE POOL</span>
                </div>
                <h3 className="font-headline font-black text-3xl uppercase tracking-tight text-[#1a1a1a]">
                  DeFi Summer Hack
                </h3>
                <p className="font-mono text-xs font-bold uppercase text-zinc-650 leading-relaxed">
                  Deconstruct legacy liquidity routing protocols. Build highly efficient AMMs and zero-knowledge privacy pools.
                </p>
              </div>
              
              <div className="flex justify-between items-center pt-4 border-t border-zinc-200">
                <div className="flex gap-2">
                  <span className="border border-black px-2 py-0.5 text-[9px] font-mono font-bold bg-white">#Solidity</span>
                  <span className="border border-black px-2 py-0.5 text-[9px] font-mono font-bold bg-white">#DeFi</span>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setValHackathon('DeFi Summer Hack');
                      setActiveTab('validator');
                    }}
                    className="bg-white border-2 border-black text-[10px] font-headline font-black px-3 py-1.5 uppercase hover:bg-[#0055ff] hover:text-white cursor-pointer"
                  >
                    AI PLAN
                  </button>
                  <button 
                    onClick={() => triggerTrackingForHackathon('DeFi Summer Hack')}
                    className="bg-[#1a1a1a] text-white border-2 border-black text-[10px] font-headline font-black px-3 py-1.5 uppercase hover:bg-[#0055ff] hover:text-black cursor-pointer"
                  >
                    TRACK PLAN
                  </button>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* "FORM FOLLOWS FUNCTION" SECTION */}
      <section className="bg-[#f5f0e8] py-20 border-b-4 border-black">
        <div className="max-w-[1440px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Side Header */}
          <div className="lg:col-span-6 space-y-6">
            <h2 className="font-headline text-5xl md:text-7xl font-black uppercase tracking-tighter text-[#1a1a1a] leading-[0.9]">
              FORM<br />FOLLOWS<br />FUNCTION.
            </h2>
            <div className="border-4 border-black p-6 bg-white shadow-[4px_4px_0px_0px_#1a1a1a] max-w-md">
              <p className="font-body text-base font-bold text-zinc-750 uppercase leading-relaxed">
                We stripped away the noise. No fluff. No distractions. Just the tools hand-built for builders, start-ups, and hackers to evaluate feasibility, track task streams, and win.
              </p>
            </div>
          </div>

          {/* Right Side Stats block */}
          <div className="lg:col-span-6 grid grid-cols-2 gap-6">
            
            <div className="bg-[#ffcc00] border-4 border-black p-8 flex flex-col justify-center items-center h-52 text-center shadow-[6px_6px_0px_0px_#1a1a1a]">
              <span className="font-display text-5xl md:text-6xl font-black tracking-tight mb-2 select-none text-[#1a1a1a]">500+</span>
              <span className="font-headline text-xs font-black uppercase text-[#1a1a1a]">ACTIVE FORGES</span>
            </div>

            <div className="bg-white border-4 border-black p-8 flex flex-col justify-center items-center h-52 text-center shadow-[6px_6px_0px_0px_#0055ff]">
              <span className="font-display text-5xl md:text-6xl font-black tracking-tight mb-2 select-none text-[#1a1a1a]">10k+</span>
              <span className="font-headline text-xs font-black uppercase text-[#1a1a1a]">BUILDERS</span>
            </div>

          </div>

        </div>
      </section>

      {/* "BUILT BY BUILDERS" TESTIMONIAL QUOTES */}
      <section className="bg-[#f5f0e8] py-20 border-b-4 border-black">
        <div className="max-w-[1440px] mx-auto px-6">
          
          <h2 className="font-headline text-5xl md:text-6xl font-black uppercase tracking-tighter text-center mb-16 select-none border-b-4 border-black pb-4">
            BUILT BY BUILDERS
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Testimonial 1 */}
            <div className="bg-white border-4 border-black p-8 flex flex-col justify-between gap-10 shadow-[6px_6px_0px_0px_#1a1a1a] hover:-translate-y-1 transition-transform">
              <div>
                <span className="font-display text-5xl font-black text-[#0055ff] select-none block mb-2">“</span>
                <p className="font-body font-bold text-base leading-relaxed uppercase text-[#1a1a1a]/90">
                  HackathonFeed completely changed how I find events. I won 3 hackathons last month just by tracking everything here.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t-2 border-zinc-200">
                <div className="w-10 h-10 bg-[#0055ff] border-2 border-black"></div>
                <div>
                  <h4 className="font-headline font-black text-sm uppercase">Sarah J.</h4>
                  <p className="font-mono text-[9px] font-bold uppercase text-zinc-500">Full Stack Developer</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-[#ffcc00] border-4 border-black p-8 flex flex-col justify-between gap-10 shadow-[6px_6px_0px_0px_#1a1a1a] hover:-translate-y-1 transition-transform">
              <div>
                <span className="font-display text-5xl font-black text-[#1a1a1a] select-none block mb-2">“</span>
                <p className="font-body font-bold text-base leading-relaxed uppercase text-[#1a1a1a]/90">
                  The AI Idea Validator saved our team a week of debating. We pivoted early and took home the grand prize on AGI Frontiers with their neural feedback upgraded roster.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t-2 border-zinc-200">
                <div className="w-10 h-10 bg-[#e63b2e] border-2 border-black"></div>
                <div>
                  <h4 className="font-headline font-black text-sm uppercase">Team Void</h4>
                  <p className="font-mono text-[9px] font-bold uppercase text-[#1a1a1a]/60">Web3 Startup Group</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white border-4 border-black p-8 flex flex-col justify-between gap-10 shadow-[6px_6px_0px_0px_#1a1a1a] hover:-translate-y-1 transition-transform">
              <div>
                <span className="font-display text-5xl font-black text-[#0055ff] select-none block mb-2">“</span>
                <p className="font-body font-bold text-base leading-relaxed uppercase text-[#1a1a1a]/90">
                  Stop using heavy corporate spreadsheets. The clean minimal tracker dashboard is pure gold for serial builders and hackers who want clean focus.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t-2 border-zinc-200">
                <div className="w-10 h-10 bg-[#1a1a1a] border-2 border-black"></div>
                <div>
                  <h4 className="font-headline font-black text-sm uppercase">Marcus T.</h4>
                  <p className="font-mono text-[9px] font-bold uppercase text-zinc-500">AI Lead Researcher</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* "READY TO FORGE" RED Call to Action Section */}
      <section className="bg-[#e63b2e] py-20 text-center border-b-4 border-black">
        <div className="max-w-[1440px] mx-auto px-6 space-y-10">
          <h2 className="font-headline text-5xl md:text-8xl font-black uppercase text-white tracking-tighter select-none">
            READY TO FORGE?
          </h2>
          
          <button 
            onClick={() => setActiveTab('validator')}
            className="bg-[#1a1a1a] text-white font-headline font-black text-xl uppercase px-12 py-5 border-4 border-white shadow-[6px_6px_0px_0px_#ffcc00] hover:bg-white hover:text-black hover:shadow-none transition-all active:translate-x-1 active:translate-y-1 cursor-pointer"
          >
            JOIN NOW ↗
          </button>
        </div>
      </section>

    </div>
  );
};
