import React from 'react';
import { PlusCircle, Trash2, CheckSquare, Square } from 'lucide-react';
import { Hackathon, TrackedApplication } from '../types';

interface TrackerPageProps {
  hackathons: Hackathon[];
  trackedApps: TrackedApplication[];
  trackHackathonName: string;
  setTrackHackathonName: (val: string) => void;
  trackProjectTitle: string;
  setTrackProjectTitle: (val: string) => void;
  trackConcept: string;
  setTrackConcept: (val: string) => void;
  handleAddNewTracking: (e: React.FormEvent) => void;
  handleDeleteTracked: (id: string) => void;
  toggleMilestone: (appId: string, milestoneId: string) => void;
  handleAddMilestone: (appId: string, text: string) => void;
  handleAddSpecialist: (appId: string, name: string) => void;
  updateTrackedStage: (appId: string, stage: TrackedApplication['stage']) => void;
}

export const TrackerPage: React.FC<TrackerPageProps> = ({
  hackathons,
  trackedApps,
  trackHackathonName,
  setTrackHackathonName,
  trackProjectTitle,
  setTrackProjectTitle,
  trackConcept,
  setTrackConcept,
  handleAddNewTracking,
  handleDeleteTracked,
  toggleMilestone,
  handleAddMilestone,
  handleAddSpecialist,
  updateTrackedStage
}) => {
  return (
    <div className="max-w-[1440px] mx-auto px-6 py-12">
      
      {/* Header outline */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end border-b-4 border-black pb-6 mb-10 gap-4 select-none">
        <div>
          <span className="font-mono text-xs bg-black text-[#ffcc00] py-1 px-3 uppercase font-bold tracking-widest">
            PROPRIETARY BUILD LOGGER
          </span>
          <h2 className="font-headline text-5xl md:text-6xl font-black uppercase tracking-tighter mt-2">
            APPLICATION TRACKER
          </h2>
        </div>
        <p className="font-mono text-xs uppercase text-zinc-500 max-w-md font-bold">
          Map project milestones and submission workflow pipelines. Keep track of deadlines directly.
        </p>
      </div>

      {/* Split layout: Register Tracker Application drawer & Kanban boards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Creator segment */}
        <div className="lg:col-span-1 bg-[#eee9e0] border-4 border-black p-6 h-fit text-black space-y-6">
          <div>
            <h3 className="font-display font-black text-xl uppercase tracking-tight flex items-center gap-2 text-blue-600">
              <PlusCircle className="w-5 h-5 flex-shrink-0" />
              TRACK NEW PLAN
            </h3>
            <p className="font-mono text-[11px] uppercase text-zinc-650 font-semibold mt-1">
              Map hackathon target files onto your active tracker:
            </p>
          </div>

          <form onSubmit={handleAddNewTracking} className="space-y-4">
            <div>
              <label className="block font-mono text-[11px] uppercase font-bold text-black mb-1 select-none">
                Choose Active Forge *
              </label>
              <select 
                className="w-full bg-white p-2.5 border-2 border-black font-bold uppercase text-xs focus:ring-0 focus:outline-none"
                value={trackHackathonName}
                onChange={(e) => setTrackHackathonName(e.target.value)}
              >
                {hackathons.map((h) => (
                  <option key={h.id} value={h.title}>
                    {h.title} ({h.prizePool})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase font-bold text-black mb-1 select-none">
                Proposed Project Title *
              </label>
              <input 
                type="text" required
                className="w-full bg-white p-2.5 border-2 border-black text-xs uppercase font-extrabold focus:outline-none"
                placeholder="e.g. Sovereign Router"
                value={trackProjectTitle}
                onChange={(e) => setTrackProjectTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase font-bold text-black mb-1 select-none">
                Concept Pitch Objective
              </label>
              <textarea 
                rows={4}
                className="w-full bg-white p-2 text-xs font-mono font-bold focus:outline-none uppercase resize-none"
                placeholder="e.g. Non-custodial liquidity escrow protocol resolved on-chain..."
                value={trackConcept}
                onChange={(e) => setTrackConcept(e.target.value)}
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-[#1a1a1a] text-white py-3 px-4 font-headline uppercase font-black text-xs border-2 border-black tracking-wider hover:bg-[#ffcc00] hover:text-black hover:scale-95 transition-all text-center cursor-pointer"
            >
              ADD TO TRACKER BOARD
            </button>
          </form>
        </div>

        {/* Kanban Pipelines segments */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          
          {/* COLUMN BUCKET GENERATOR */}
          {(['Idea / Backlog', 'In Progress', 'Submitted', 'Accepted / Win'] as TrackedApplication['stage'][]).map((stage) => {
            
            const stageApps = trackedApps.filter(app => app.stage === stage);
            
            let bgHeaderColor = 'bg-[#1a1a1a] text-white';
            if (stage === 'In Progress') bgHeaderColor = 'bg-blue-600 text-white';
            if (stage === 'Submitted') bgHeaderColor = 'bg-[#ffcc00] text-black';
            if (stage === 'Accepted / Win') bgHeaderColor = 'bg-emerald-600 text-white';

            return (
              <div key={stage} className="border-4 border-black bg-white min-h-[500px] flex flex-col animate-fadeIn">
                
                {/* Stage Headers bar representing strict structure */}
                <div className={`p-3 font-headline font-black text-center text-xs uppercase border-b-4 border-black ${bgHeaderColor}`}>
                  {stage} ({stageApps.length})
                </div>

                {/* Content panel holding tracked applications cards */}
                <div className="p-3 space-y-4 flex-grow bg-zinc-50">
                  {stageApps.length === 0 ? (
                    <div className="text-center font-mono py-12 uppercase text-[10px] text-zinc-400 border-2 border-dashed border-zinc-200 bg-white select-none">
                      Empty Pipeline
                    </div>
                  ) : (
                    stageApps.map((app) => {
                      const completedMilestones = app.milestones.filter(m => m.completed).length;
                      const totalMilestones = app.milestones.length;
                      const ratio = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

                      return (
                        <div 
                          key={app.id} 
                          className="bg-white border-2 border-black shadow-[3px_3px_0px_0px_#1a1a1a] p-3 flex flex-col gap-3 relative hover:scale-[1.01] transition-transform"
                        >
                          
                          {/* Trash button directly on top right corner */}
                          <button 
                            onClick={() => handleDeleteTracked(app.id)}
                            className="absolute top-2 right-2 text-red-500 hover:text-[#e63b2e] hover:scale-110 cursor-pointer border-none bg-transparent"
                            title="Delete item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <div>
                            <span className="font-mono text-[9px] uppercase font-bold text-zinc-500 block max-w-[110px] truncate">
                              {app.hackathonName}
                            </span>
                            <h4 className="font-headline font-bold text-sm uppercase leading-tight tracking-tight mt-0.5 max-w-[130px] truncate">
                              {app.title}
                            </h4>
                          </div>

                          <p className="font-body text-[10px] uppercase font-semibold text-zinc-650 line-clamp-2 max-h-8 leading-normal">
                            {app.concept}
                          </p>

                          {/* Progress ratios bar */}
                          <div>
                            <div className="flex justify-between font-mono text-[8px] uppercase font-black mb-1 select-none">
                              <span>Milestones checklist</span>
                              <span>{completedMilestones}/{totalMilestones}</span>
                            </div>
                            <div className="w-full bg-zinc-150 h-1.5 border border-black">
                              <div className="bg-[#e63b2e] h-full" style={{ width: `${ratio}%` }}></div>
                            </div>
                          </div>

                          <div className="space-y-1.5 border-t border-zinc-100 pt-2">
                            {app.milestones.map((m) => (
                              <div 
                                key={m.id}
                                onClick={() => toggleMilestone(app.id, m.id)}
                                className="flex items-center gap-1.5 cursor-pointer text-[9px] font-mono select-none hover:text-blue-600 group"
                              >
                                {m.completed ? (
                                  <CheckSquare className="w-3 h-3 text-blue-600 shrink-0" />
                                ) : (
                                  <Square className="w-3 h-3 text-black shrink-0" />
                                )}
                                <span className={m.completed ? "line-through text-zinc-400 uppercase" : "uppercase font-bold text-zinc-700"}>
                                  {m.text}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Dynamic Milestone Adder Form */}
                          <div className="border-t border-zinc-100 pt-2">
                            <input 
                              type="text" 
                              placeholder="+ ADD MILESTONE"
                              className="w-full text-[8.5px] font-mono p-1 border border-black uppercase font-extrabold focus:outline-none"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const inputVal = e.currentTarget.value;
                                  if (inputVal.trim()) {
                                    handleAddMilestone(app.id, inputVal.trim());
                                    e.currentTarget.value = '';
                                  }
                                }
                              }}
                            />
                          </div>

                          {/* Roster of recruited Roles tags list */}
                          <div className="flex flex-wrap gap-1.5 pt-1.5">
                            {app.team.map((t, idx) => (
                              <span key={idx} className="bg-zinc-100 text-zinc-600 text-[8px] uppercase tracking-wide font-mono font-black border border-black px-1 leading-normal select-none">
                                {t}
                              </span>
                            ))}
                            
                            <input 
                              type="text" 
                              placeholder="+ recruit specialist"
                              className="w-16 text-[7.5px] font-mono py-0 text-zinc-500 placeholder:text-zinc-350 focus:placeholder:opacity-0 bg-transparent border-none p-0 uppercase focus:outline-none flex-grow"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const inputVal = e.currentTarget.value;
                                  if (inputVal.trim()) {
                                    handleAddSpecialist(app.id, inputVal.trim());
                                    e.currentTarget.value = '';
                                  }
                                }
                              }}
                            />
                          </div>

                          {/* Action Buttons Stage shifts row */}
                          <div className="grid grid-cols-2 gap-1 border-t border-zinc-100 pt-2 mt-auto select-none">
                            
                            {stage !== 'Idea / Backlog' && (
                              <button 
                                onClick={() => {
                                  const stages: TrackedApplication['stage'][] = ['Idea / Backlog', 'In Progress', 'Submitted', 'Accepted / Win'];
                                  const currentIdx = stages.indexOf(stage);
                                  updateTrackedStage(app.id, stages[currentIdx - 1]);
                                }}
                                className="border border-black text-[8px] font-mono uppercase bg-white hover:bg-zinc-100 p-1 text-center font-bold cursor-pointer"
                              >
                                ← Back
                              </button>
                            )}

                            {stage !== 'Accepted / Win' && (
                              <button 
                                onClick={() => {
                                  const stages: TrackedApplication['stage'][] = ['Idea / Backlog', 'In Progress', 'Submitted', 'Accepted / Win'];
                                  const currentIdx = stages.indexOf(stage);
                                  updateTrackedStage(app.id, stages[currentIdx + 1]);
                                }}
                                className="border border-black text-[8px] font-mono uppercase bg-black text-white hover:bg-blue-600 p-1 text-center font-extrabold col-start-2 cursor-pointer"
                              >
                                Next →
                              </button>
                            )}

                          </div>

                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}

        </div>

      </div>

    </div>
  );
};
