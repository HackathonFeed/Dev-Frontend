import React from 'react';
import { Sparkles } from 'lucide-react';

interface AiComingSoonModalProps {
  open: boolean;
  onClose: () => void;
  message?: string;
}

export const AiComingSoonModal: React.FC<AiComingSoonModalProps> = ({
  open,
  onClose,
  message = 'AI idea validation is on the way. Check back soon.',
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white border-4 border-black p-8 md:p-10 shadow-[6px_6px_0px_0px_#ffcc00] max-w-md w-full text-center relative animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="ai-coming-soon-title"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 font-headline font-black text-sm cursor-pointer bg-transparent border-none hover:opacity-70"
          aria-label="Close"
        >
          [X]
        </button>
        <div className="w-16 h-16 mx-auto mb-5 bg-[#ffcc00] border-4 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_#1a1a1a]">
          <Sparkles className="w-8 h-8 text-black" />
        </div>
        <h3
          id="ai-coming-soon-title"
          className="font-headline font-black text-2xl md:text-3xl uppercase tracking-tight text-[#1a1a1a] mb-3"
        >
          Coming soon
        </h3>
        <p className="font-mono text-xs uppercase font-bold text-zinc-500 leading-relaxed mb-6">
          {message}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full bg-black text-white border-2 border-black py-3 font-headline font-black text-xs uppercase tracking-wider hover:bg-[#ffcc00] hover:text-black cursor-pointer"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
