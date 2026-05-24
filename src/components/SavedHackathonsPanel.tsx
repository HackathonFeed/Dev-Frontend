import React from 'react';
import { Bookmark } from 'lucide-react';
import type { Bookmark as ApiBookmark } from '../api/types';
import { mapHackathonsFromApi } from '../lib/mapHackathon';

interface SavedHackathonsPanelProps {
  bookmarks: ApiBookmark[];
  onRemove: (hackathonId: string) => void;
  onOpenHackathon: (hackathonId: string) => void;
  onBrowseHackathons?: () => void;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return value;
  }
}

export const SavedHackathonsPanel: React.FC<SavedHackathonsPanelProps> = ({
  bookmarks,
  onRemove,
  onOpenHackathon,
  onBrowseHackathons,
}) => {
  return (
    <div className="bg-white border-3 border-black p-6 shadow-[4px_4px_0px_0px_#101010] rounded-[4px] space-y-4 md:col-span-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-200 pb-3">
        <h3 className="font-headline font-black text-lg uppercase text-[#1a1a1a] flex items-center gap-2">
          <Bookmark className="w-5 h-5" />
          Saved hackathons
          <span className="font-mono text-[9px] bg-[#ffcc00] border-2 border-black px-2 py-0.5 uppercase">
            Private
          </span>
        </h3>
        <p className="font-mono text-[10px] uppercase font-bold text-zinc-500">
          Only visible to you — not shown on your public profile
        </p>
      </div>

      {bookmarks.length === 0 ? (
        <div className="border-4 border-dashed border-zinc-300 py-10 text-center font-mono uppercase text-sm font-bold text-zinc-400">
          No saved hackathons yet.
          {onBrowseHackathons && (
            <button
              type="button"
              onClick={onBrowseHackathons}
              className="block mx-auto mt-3 underline text-[#0055ff] cursor-pointer bg-transparent border-none"
            >
              Browse hackathons
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {bookmarks.map((bookmark) => {
            const hack = bookmark.hackathon
              ? mapHackathonsFromApi([bookmark.hackathon])[0]
              : null;
            if (!hack) return null;

            return (
              <div
                key={bookmark.id}
                className="border-2 border-black p-4 bg-[#faf7f2] shadow-[2px_2px_0px_0px_#101010]"
              >
                <p className="font-mono text-[9px] uppercase text-zinc-500 font-bold">
                  Saved {formatDate(bookmark.created_at)}
                </p>
                <h4 className="font-headline font-black text-sm uppercase tracking-tight text-[#1a1a1a] mt-1">
                  {hack.title}
                </h4>
                <p className="font-mono text-[10px] text-zinc-500 mt-1">
                  {hack.prizePool} · {hack.deadline}
                </p>
                <div className="flex gap-3 mt-3">
                  <button
                    type="button"
                    onClick={() => onOpenHackathon(bookmark.hackathon_id)}
                    className="text-[10px] font-bold uppercase text-[#0055ff] underline cursor-pointer bg-transparent border-none"
                  >
                    View
                  </button>
                  {hack.url && (
                    <a
                      href={hack.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold uppercase text-[#0055ff] underline"
                    >
                      Open
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemove(bookmark.hackathon_id)}
                    className="text-[10px] font-bold uppercase text-[#e63b2e] cursor-pointer bg-transparent border-none"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
