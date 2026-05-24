import type { Hackathon } from '../types';
import { getCardStatusLabel, getStatusBadgeClass } from '../lib/mapHackathon';

interface HackathonStatusBadgeProps {
  hack: Pick<Hackathon, 'statusLabel' | 'apiStatus'>;
  /** Use shorter label on compact cards */
  compact?: boolean;
  className?: string;
}

export function HackathonStatusBadge({
  hack,
  compact = false,
  className = '',
}: HackathonStatusBadgeProps) {
  const label = compact ? getCardStatusLabel(hack) : (hack.statusLabel ?? getCardStatusLabel(hack));

  return (
    <span
      className={`inline-flex items-center font-mono font-extrabold uppercase border-2 tracking-wide shrink-0 ${
        compact ? 'text-[10px] py-1 px-2.5' : 'text-xs py-1 px-3'
      } ${getStatusBadgeClass(hack.apiStatus)} ${className}`}
    >
      {label}
    </span>
  );
}
