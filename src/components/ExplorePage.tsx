import React from 'react';
import { Search, Compass, MapPin, Calendar, Users, Sparkles, ArrowUpRight } from 'lucide-react';
import { HackathonStatusBadge } from './HackathonStatusBadge';
import { Hackathon } from '../types';

interface ExplorePageProps {
  setActiveTab: (tab: 'landing' | 'explore' | 'tracker' | 'validator' | 'auth') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  isAddingHackathon: boolean;
  setIsAddingHackathon: (val: boolean) => void;
  hackathons: Hackathon[];
  filteredHackathons: Hackathon[];
  allAvailableTags: string[];
  triggerTrackingForHackathon: (title: string) => void;
  setValHackathon: (title: string) => void;

  // Forge Host fields and submission
  newTitle: string;
  setNewTitle: (val: string) => void;
  newPrize: string;
  setNewPrize: (val: string) => void;
  newDeadline: string;
  setNewDeadline: (val: string) => void;
  newLocation: string;
  setNewLocation: (val: string) => void;
  newTagsString: string;
  setNewTagsString: (val: string) => void;
  newDesc: string;
  setNewDesc: (val: string) => void;
  handleCreateHackathon: (e: React.FormEvent) => void;
}

export const ExplorePage: React.FC<ExplorePageProps> = ({
  setActiveTab,
  searchQuery,
  setSearchQuery,
  selectedTag,
  setSelectedTag,
  isAddingHackathon,
  setIsAddingHackathon,
  hackathons,
  filteredHackathons,
  allAvailableTags,
  triggerTrackingForHackathon,
  setValHackathon,
  newTitle,
  setNewTitle,
  newPrize,
  setNewPrize,
  newDeadline,
  setNewDeadline,
  newLocation,
  setNewLocation,
  newTagsString,
  setNewTagsString,
  newDesc,
  setNewDesc,
  handleCreateHackathon
}) => {
  return (
    <div>
      
      {/* HERO SECTION CONTAINER */}
      <section className="relative bg-[#eee9e0] border-b-4 border-black w-full overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-6 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Visual text highlights */}
          <div className="z-10 lg:col-span-7 flex flex-col items-start">
            
            <div className="bg-[#1a1a1a] text-white font-mono text-xs font-bold py-1 px-3 mb-6 uppercase tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ffcc00] animate-pulse"></span>
              Centralised Forge Hub
            </div>

            <h1 className="font-headline text-5xl md:text-7xl lg:text-[105px] font-black uppercase tracking-tighter leading-[0.85] text-black mb-8 select-none">
              BUILD<br />THE<br />FUTURE
            </h1>

            {/* Fully functional high-contrast search input */}
            <div className="bg-white border-4 border-black w-full max-w-xl shadow-[4px_4px_0px_0px_#1a1a1a] p-2 flex items-center mb-8 gap-3">
              <Search className="w-6 h-6 text-[#1a1a1a] pl-1 shrink-0" />
              <input 
                type="text"
                className="w-full bg-transparent border-none text-lg font-bold font-body placeholder:text-zinc-400 focus:ring-0 focus:outline-none uppercase"
                placeholder="Search hackathons, bounties, tech..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-mono font-bold bg-[#1a1a1a]/10 hover:bg-[#1a1a1a]/20 px-2 py-1 uppercase border-none cursor-pointer"
                >
                  Clear
                </button>
              )}
              <button 
                className="bg-black text-[#ffcc00] font-headline font-bold px-6 py-3 uppercase hover:bg-zinc-805 hover:text-white transition-colors cursor-pointer border-none"
                onClick={() => setSelectedTag(null)}
              >
                Find
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => { setActiveTab('validator'); }}
                className="inline-block bg-black text-white font-headline font-black text-lg md:text-xl uppercase px-8 py-4 border-4 border-black shadow-[6px_6px_0px_0px_#1a1a1a] hover:bg-white hover:text-black transition-all duration-105 hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_#1a1a1a] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none cursor-pointer"
              >
                Summon AI Validator
              </button>

              <button 
                type="button"
                onClick={() => setIsAddingHackathon(true)}
                className="inline-block bg-white text-black font-headline font-black text-lg md:text-xl uppercase px-8 py-4 border-4 border-black shadow-[6px_6px_0px_0px_#1a1a1a] hover:bg-zinc-100 transition-all duration-105 hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_0px_#1a1a1a] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none cursor-pointer"
              >
                + Host A Forge
              </button>
            </div>
          </div>

          {/* Right Side Grit Visual Mockup representing high-fidelity black-and-white asset */}
          <div className="relative h-[300px] lg:h-[500px] w-full z-0 lg:col-span-5 hidden md:block">
            <div 
              className="absolute inset-0 bg-blue-600/40 bg-cover bg-center bg-no-repeat border-4 border-black shadow-[6px_6px_0px_0px_#1a1a1a] mix-blend-overlay"
              style={{ backgroundImage: `url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop')` }}
            ></div>
            <div className="absolute inset-x-4 bottom-4 bg-[#1a1a1a] text-white p-4 font-mono text-xs uppercase border-2 border-white space-y-1">
              <div className="font-bold flex justify-between">
                <span>Server Terminal</span>
                <span className="text-[#ffcc00] animate-pulse">● online</span>
              </div>
              <p className="text-[10px] text-zinc-400">
                System nodes are mapping {hackathons.length} active global developer forges. Strip the fluff. Form follows function.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* QUICK CATEGORY FILTER CHIPS */}
      <section className="bg-white py-6 border-b-4 border-black">
        <div className="max-w-[1440px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <Compass className="w-5 h-5 text-blue-600" />
            <span className="font-headline font-black uppercase text-sm tracking-wider">Fast Filter Nodes:</span>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center justify-center md:justify-end">
            <button
              onClick={() => setSelectedTag(null)}
              className={`font-mono text-xs px-3 py-1.5 border-2 border-black font-black transition-all cursor-pointer ${
                selectedTag === null 
                  ? 'bg-black text-white' 
                  : 'bg-white hover:bg-zinc-100'
              }`}
            >
              ALL FORGES
            </button>
            {allAvailableTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`font-mono text-xs px-3 py-1.5 border-2 border-black font-bold uppercase transition-all cursor-pointer ${
                  selectedTag === tag 
                    ? 'bg-black text-[#ffcc00]' 
                    : 'bg-white hover:bg-zinc-100'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ADD A HACKATHON FORM IF OPENED */}
      {isAddingHackathon && (
        <section className="max-w-[1440px] mx-auto px-6 py-8 bg-[#ffcc00] border-b-4 border-black animate-fadeIn flex flex-col gap-6">
          <div className="flex justify-between items-center pb-2 border-b-2 border-black">
            <h3 className="font-headline font-black text-2xl uppercase">Host A Cyber-Forge / New Event</h3>
            <button 
              onClick={() => setIsAddingHackathon(false)} 
              className="p-1 px-3 border-2 border-black bg-white text-black hover:bg-black hover:text-white font-mono text-xs font-bold cursor-pointer"
            >
              CLOSE [X]
            </button>
          </div>
          
          <form onSubmit={handleCreateHackathon} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-xs font-extrabold uppercase mb-1">Hackathon Forge Name *</label>
              <input 
                type="text" required
                className="w-full bg-white p-3 border-3 border-black focus:outline-none focus:ring-0 uppercase font-bold"
                placeholder="e.g. BERLIN AGENT SUMMIT"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-mono text-xs font-extrabold uppercase mb-1">Prize Pool Valuation *</label>
              <input 
                type="text" required
                className="w-full bg-white p-3 border-3 border-black focus:outline-none focus:ring-0 uppercase font-bold"
                placeholder="e.g. $100,000"
                value={newPrize}
                onChange={(e) => setNewPrize(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-mono text-xs font-extrabold uppercase mb-1">Submission Deadline *</label>
              <input 
                type="date" required
                className="w-full bg-white p-3 border-3 border-black focus:outline-none focus:ring-0 uppercase font-bold text-xs"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-mono text-xs font-extrabold uppercase mb-1">Location / Axis *</label>
              <input 
                type="text" required
                className="w-full bg-white p-3 border-3 border-black focus:outline-none focus:ring-0 uppercase font-bold"
                placeholder="e.g. Berlin / Online"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-mono text-xs font-extrabold uppercase mb-1">Topics / Tech Tags (Comma-separated)</label>
              <input 
                type="text"
                className="w-full bg-white p-3 border-3 border-black focus:outline-none focus:ring-0 uppercase font-bold"
                placeholder="AI/ML, Solidity, React, Zero-Knowledge"
                value={newTagsString}
                onChange={(e) => setNewTagsString(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-mono text-xs font-extrabold uppercase mb-1">Core Pitch / Description</label>
              <textarea 
                rows={3}
                className="w-full bg-white p-3 border-3 border-black focus:outline-none focus:ring-0 uppercase text-xs font-mono font-bold resize-none"
                placeholder="Detail the constraints and expected submissions parameters..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button 
                type="submit"
                className="bg-[#1a1a1a] text-white p-4 font-headline uppercase font-black text-base border-3 border-black shadow-[4px_4px_0px_0px_#ffffff] hover:bg-white hover:text-black hover:shadow-none transition-all cursor-pointer"
              >
                PUBLISH EVENT FORGE
              </button>
            </div>
          </form>
        </section>
      )}

      {/* DYNAMIC FORGES LIST: Beautiful Brutalist Cards */}
      <section className="max-w-[1440px] mx-auto px-6 py-16">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 border-b-4 border-black pb-3">
          <div>
            <h2 className="font-headline text-4xl md:text-6xl font-black uppercase tracking-tighter">
              Active Forges ({filteredHackathons.length})
            </h2>
            <p className="font-mono text-xs uppercase text-zinc-500 mt-1">
              Explore available hackathons. Select a card to recruit team members or trigger validation.
            </p>
          </div>
          {selectedTag && (
            <span className="font-mono text-xs bg-black text-white py-1 px-3 border-2 border-black mt-2 md:mt-0">
              Filtered by #{selectedTag}
            </span>
          )}
        </div>

        {filteredHackathons.length === 0 ? (
          <div className="bg-white border-4 border-dashed border-zinc-250 py-20 text-center font-mono uppercase text-lg text-zinc-400">
            No Active Forges matching search parameter.
            <button 
              onClick={() => { setSelectedTag(null); setSearchQuery(''); }}
              className="block mx-auto mt-4 underline text-blue-600 font-bold cursor-pointer border-none bg-transparent"
            >
              RESET QUERY STACK
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredHackathons.map((hack) => (
              <div 
                key={hack.id}
                className="bg-white text-black border-4 border-black p-6 flex flex-col justify-between h-auto gap-6 hover:-translate-y-1 transition-all"
                style={{ boxShadow: `8px 8px 0px 0px ${hack.cardShadow}` }}
              >
                {/* Top Badging row */}
                <div className="flex justify-between items-start">
                  <HackathonStatusBadge hack={hack} />
                  <div className="text-right">
                    <span className="font-mono text-xs uppercase text-zinc-450 block font-bold">Prize Pool</span>
                    <span className="font-headline font-black text-2xl text-blue-600 block">{hack.prizePool}</span>
                  </div>
                </div>

                {/* Info layout block */}
                <div className="space-y-2">
                  <h4 className="font-headline text-3xl font-black uppercase tracking-tight leading-none text-[#1a1a1a]">
                    {hack.title}
                  </h4>
                  <p className="font-body text-sm font-bold text-zinc-650 leading-relaxed font-mono text-xs">
                    {hack.description}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="flex items-center gap-1 font-mono text-xs text-zinc-500 uppercase font-black mr-2">
                      <MapPin className="w-3.5 h-3.5" strokeWidth={3} />
                      {hack.location}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-xs text-zinc-500 uppercase font-black mr-2">
                      <Calendar className="w-3.5 h-3.5" strokeWidth={3} />
                      Deadline: {hack.deadline}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-xs text-zinc-500 uppercase font-black">
                      <Users className="w-3.5 h-3.5" strokeWidth={3} />
                      {hack.participantsCount} Bakers
                    </span>
                  </div>
                </div>

                {/* Interactive Action tools */}
                <div className="flex justify-between items-end pt-4 border-t-2 border-dashed border-zinc-200">
                  {/* Chips list */}
                  <div className="flex flex-wrap gap-1">
                    {hack.tags.map((tag) => (
                      <span key={tag} className="border-2 border-black px-2 py-0.5 text-[10px] font-mono font-black uppercase bg-[#eee9e0]">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Interactive flow actions list */}
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setValHackathon(hack.title);
                        setActiveTab('validator');
                      }}
                      className="bg-white text-black border-2 border-black p-2 text-xs font-headline font-black uppercase tracking-tight flex items-center gap-1 hover:bg-[#ffcc00] transition-all cursor-pointer shadow-[2px_2px_0px_0px_#1a1a1a]"
                      title="Analyze proposed idea for this event"
                    >
                      <Sparkles className="w-3.5 h-3.5" strokeWidth={3} />
                      AI Plan
                    </button>

                    <button 
                      onClick={() => triggerTrackingForHackathon(hack.title)}
                      className="bg-[#0055ff] text-white border-2 border-black p-2 text-xs font-headline font-black uppercase tracking-tight flex items-center gap-1 hover:bg-[#ffcc00] hover:text-black transition-all cursor-pointer shadow-[2px_2px_0px_0px_#1a1a1a]"
                    >
                      Track Plan
                      <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={3} />
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </section>

      {/* Testimonials */}
      <section className="bg-white py-20 border-t-4 border-black">
        <div className="max-w-[1440px] mx-auto px-6">
          <h2 className="font-headline text-5xl md:text-7xl font-black uppercase tracking-tighter mb-16 text-center select-none">
            BUILT BY<br />BUILDERS
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#fcfbfa] border-4 border-black shadow-[4px_4px_0px_0px_#1a1a1a] p-8 flex flex-col justify-between hover:-translate-y-1 transition-all">
              <div>
                <span className="font-display text-4xl block text-blue-600 font-black mb-4">“</span>
                <p className="font-body font-bold text-lg leading-relaxed mb-6">
                  &quot;HackathonFeed completely changed how I find events. I won 3 hackathons last month just by tracking everything here.&quot;
                </p>
              </div>
              <div className="flex items-center gap-4 pt-4 border-t-4 border-black">
                <div className="w-12 h-12 bg-blue-500 border-2 border-black"></div>
                <div>
                  <h4 className="font-headline font-black uppercase text-base">Sarah J.</h4>
                  <p className="font-mono text-[10px] font-bold text-zinc-400 uppercase">Full Stack Developer</p>
                </div>
              </div>
            </div>

            <div className="bg-[#ffcc00] border-4 border-black shadow-[4px_4px_0px_0px_#1a1a1a] p-8 flex flex-col justify-between hover:-translate-y-1 transition-all md:-translate-y-6">
              <div>
                <span className="font-display text-4xl block text-[#1a1a1a] font-black mb-4">“</span>
                <p className="font-body font-bold text-lg leading-relaxed mb-6">
                  &quot;The AI Idea Validator saved our team a week of debating. We pivoted early and took home the grand prize on AGI Frontiers with their neural feedback upgraded roster.&quot;
                </p>
              </div>
              <div className="flex items-center gap-4 pt-4 border-t-4 border-black">
                <div className="w-12 h-12 bg-red-500 border-2 border-black"></div>
                <div>
                  <h4 className="font-headline font-black uppercase text-base">Team Void</h4>
                  <p className="font-mono text-[10px] font-bold text-zinc-500 uppercase">Web3 Startup Group</p>
                </div>
              </div>
            </div>

            <div className="bg-[#fcfbfa] border-4 border-black shadow-[4px_4px_0px_0px_#1a1a1a] p-8 flex flex-col justify-between hover:-translate-y-1 transition-all">
              <div>
                <span className="font-display text-4xl block text-blue-600 font-black mb-4">“</span>
                <p className="font-body font-bold text-lg leading-relaxed mb-6">
                  &quot;Stop using heavy corporate spreadsheets. The clean minimal tracker dashboard is pure gold for serial builders and hackers who want clean focus.&quot;
                </p>
              </div>
              <div className="flex items-center gap-4 pt-4 border-t-4 border-black">
                <div className="w-12 h-12 bg-[#1a1a1a] border-2 border-black"></div>
                <div>
                  <h4 className="font-headline font-black uppercase text-base">Marcus T.</h4>
                  <p className="font-mono text-[10px] font-bold text-zinc-400 uppercase">AI Lead Researcher</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Why HackathonFeed Stats banner */}
      <section className="bg-black text-white py-16 px-6 border-t-4 border-black">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-headline text-4xl md:text-6xl font-black uppercase tracking-tighter text-[#ffcc00] leading-none mb-4 animate-pulse">
              FORM FOLLOWS FUNCTION.
            </h2>
            <p className="font-body text-xl font-bold max-w-lg text-[#faf7f2]/90 leading-relaxed uppercase">
              We stripped away the noise. No corporate bloated templates. No telemetry lag. Just pristine brutalist tools designed to find, track, validate, and win.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-[#ffcc00] text-[#1a1a1a] border-4 border-white p-6 flex flex-col justify-center items-center text-center aspect-square shadow-[6px_6px_0px_0px_#ffffff]">
              <span className="font-display text-5xl md:text-6xl font-black tracking-tighter mb-1 select-none">500+</span>
              <span className="font-headline text-sm font-black uppercase">Hackathons</span>
            </div>
            <div className="bg-blue-600 text-white border-4 border-white p-6 flex flex-col justify-center items-center text-center aspect-square shadow-[6px_6px_0px_0px_#ffffff]">
              <span className="font-display text-5xl md:text-6xl font-black tracking-tighter mb-1 select-none">10k+</span>
              <span className="font-headline text-sm font-black uppercase">Cyber Builders</span>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
