import type { TrackedApplication } from '../types';
import type { UserHackathonRecordApi } from '../api/types';
import { isStepComplete } from './trackedProjects';

export interface ActivityDay {
  date: string;
  count: number;
}

export interface HeatmapCell {
  date: Date;
  dateKey: string;
  count: number;
}

export function toDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function activityListToMap(days: ActivityDay[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const day of days) {
    if (!day.date) continue;
    map.set(day.date, (map.get(day.date) ?? 0) + day.count);
  }
  return map;
}

export function incrementActivity(map: Map<string, number>, iso: string | undefined | null, weight = 1) {
  if (!iso) return;
  const key = toDateKey(iso);
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + weight);
}

/** One count per hackathon registration (registered step / registered_at only). */
export function buildRegistrationHeatmapFromTrackedApps(apps: TrackedApplication[]): Map<string, number> {
  const map = new Map<string, number>();

  for (const app of apps) {
    const registeredStep = app.completedSteps.find((step) => step.stepId === 'registered');
    if (registeredStep) {
      incrementActivity(map, registeredStep.completedAt);
      continue;
    }
    if (isStepComplete(app, 'registered')) {
      incrementActivity(map, app.createdAt);
    }
  }

  return map;
}

/** One count per hackathon on its registration date from public API records. */
export function buildRegistrationHeatmapFromRecords(records: UserHackathonRecordApi[]): Map<string, number> {
  const map = new Map<string, number>();

  for (const record of records) {
    incrementActivity(map, record.registered_at);
  }

  return map;
}

export function mergeActivityMaps(...maps: Map<string, number>[]): Map<string, number> {
  const merged = new Map<string, number>();
  for (const map of maps) {
    for (const [date, count] of map) {
      merged.set(date, (merged.get(date) ?? 0) + count);
    }
  }
  return merged;
}

export function buildHeatmapWeeks(counts: Map<string, number>, numWeeks = 53): HeatmapCell[][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setDate(start.getDate() - numWeeks * 7 + 1);
  start.setDate(start.getDate() - start.getDay());

  const weeks: HeatmapCell[][] = [];
  const cursor = new Date(start);

  while (cursor <= today || weeks.length < numWeeks) {
    const week: HeatmapCell[] = [];
    for (let day = 0; day < 7; day += 1) {
      const dateKey = toDateKey(cursor);
      week.push({
        date: new Date(cursor),
        dateKey,
        count: counts.get(dateKey) ?? 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    if (cursor > today && weeks.length >= numWeeks) break;
  }

  return weeks.slice(-numWeeks);
}

/** Discrete levels by registrations that day (GitHub-style). */
export function getRegistrationHeatmapLevel(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 4;
}

export function countTotalRegistrations(counts: Map<string, number>): number {
  let total = 0;
  for (const count of counts.values()) total += count;
  return total;
}

export function formatRegistrationTooltip(date: Date, count: number): string {
  const label = date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  if (count <= 0) return `No hackathons registered on ${label}`;
  if (count === 1) return `1 hackathon registered on ${label}`;
  return `${count} hackathons registered on ${label}`;
}

export function getMonthLabels(weeks: HeatmapCell[][]): { label: string; weekIndex: number }[] {
  const labels: { label: string; weekIndex: number }[] = [];
  let lastMonth = -1;

  weeks.forEach((week, weekIndex) => {
    const firstDay = week[0]?.date;
    if (!firstDay) return;
    const month = firstDay.getMonth();
    if (month !== lastMonth) {
      labels.push({
        label: firstDay.toLocaleDateString(undefined, { month: 'short' }),
        weekIndex,
      });
      lastMonth = month;
    }
  });

  return labels;
}
