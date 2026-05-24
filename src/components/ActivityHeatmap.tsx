import React, { useMemo } from 'react';
import {
  activityListToMap,
  buildHeatmapWeeks,
  countTotalRegistrations,
  formatRegistrationTooltip,
  getMonthLabels,
  getRegistrationHeatmapLevel,
  type ActivityDay,
} from '../lib/activityHeatmap';

interface ActivityHeatmapProps {
  activity?: ActivityDay[];
  counts?: Map<string, number>;
  weeks?: number;
  title?: string;
}

const LEVEL_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'bg-[#eee9e0] border-[#d4d4d8]',
  1: 'bg-[#bbf7d0] border-[#86efac]',
  2: 'bg-[#4ade80] border-[#22c55e]',
  3: 'bg-[#16a34a] border-[#15803d]',
  4: 'bg-[#14532d] border-[#052e16]',
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  activity = [],
  counts,
  weeks = 53,
  title = 'Registration activity',
}) => {
  const registrationMap = useMemo(
    () => counts ?? activityListToMap(activity),
    [activity, counts],
  );

  const heatmapWeeks = useMemo(() => buildHeatmapWeeks(registrationMap, weeks), [registrationMap, weeks]);
  const monthLabels = useMemo(() => getMonthLabels(heatmapWeeks), [heatmapWeeks]);
  const total = useMemo(() => countTotalRegistrations(registrationMap), [registrationMap]);

  return (
    <div className="bg-white border-4 border-black p-6 shadow-[5px_5px_0px_0px_#1a1a1a]">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
        <div>
          <h2 className="font-headline font-black text-xl uppercase tracking-tight text-[#1a1a1a]">
            {title}
          </h2>
          <p className="font-mono text-[10px] uppercase font-bold text-zinc-500 mt-1">
            {total} hackathon{total === 1 ? '' : 's'} registered in the last year
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-[9px] uppercase font-bold text-zinc-500">
          <span>0</span>
          {([1, 2, 3, 4] as const).map((level) => (
            <span
              key={level}
              className={`w-3.5 h-3.5 border ${LEVEL_CLASS[level]}`}
              title={level === 4 ? '4+ registrations' : `${level} registration${level === 1 ? '' : 's'}`}
            />
          ))}
          <span>4+</span>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[32px_1fr] gap-2">
            <div />
            <div className="relative h-4 mb-1">
              {monthLabels.map((month) => (
                <span
                  key={`${month.label}-${month.weekIndex}`}
                  className="absolute font-mono text-[9px] uppercase font-bold text-zinc-400"
                  style={{ left: `${month.weekIndex * 14}px` }}
                >
                  {month.label}
                </span>
              ))}
            </div>

            <div className="flex flex-col gap-[3px] pt-1">
              {DAY_LABELS.map((label, index) => (
                <span
                  key={label}
                  className="h-[11px] font-mono text-[8px] uppercase font-bold text-zinc-400 leading-none"
                  style={{ visibility: index % 2 === 1 ? 'visible' : 'hidden' }}
                >
                  {label}
                </span>
              ))}
            </div>

            <div className="flex gap-[3px]">
              {heatmapWeeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col gap-[3px]">
                  {week.map((day) => {
                    const level = getRegistrationHeatmapLevel(day.count);
                    return (
                      <div
                        key={day.dateKey}
                        title={formatRegistrationTooltip(day.date, day.count)}
                        aria-label={formatRegistrationTooltip(day.date, day.count)}
                        className={`w-[11px] h-[11px] border ${LEVEL_CLASS[level]} rounded-[2px]`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
