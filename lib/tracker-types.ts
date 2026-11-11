// Shared types for the Protocol Tracker markdown data layer.

export interface Protocol {
  slug: string;
  name: string;
  created: string; // YYYY-MM-DD
  archived: string | null; // YYYY-MM-DD or null
  color: string; // hex, used for the adherence band
}

// Distinct-but-harmonious band colors, assigned round-robin on creation.
export const PROTOCOL_PALETTE = [
  '#23201B', // ink
  '#4E8FC4', // sky deep
  '#5FA87F', // mint deep
  '#DF9A2E', // butter deep
  '#D9758C', // blush deep
  '#C96B4A', // ember
  '#7E74C4', // lavender
  '#4FA3A5', // teal
];

export interface DayLog {
  date: string; // YYYY-MM-DD
  moodX: number | null; // pleasantness 1-10
  moodY: number | null; // energy 1-10
  sleep: number | null; // 1-10
  health: number | null; // 1-10
  pain: number | null; // 1-10
  protocols: Record<string, boolean | null>; // slug -> done | explicitly skipped | unlogged
}

export interface LifeEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
}

export const METRICS = [
  { key: 'mood', label: 'Mood', color: '#E8A33D' },
  { key: 'sleep', label: 'Sleep', color: '#7FA8CF' },
  { key: 'health', label: 'Health', color: '#6FB894' },
  { key: 'pain', label: 'Pain', color: '#DF7B62' },
] as const;

export type MetricKey = (typeof METRICS)[number]['key'];

// Mood score 1-10 from the 2-axis quadrant pick.
export function moodScore(log: Pick<DayLog, 'moodX' | 'moodY'>): number | null {
  if (log.moodX == null || log.moodY == null) return null;
  return Math.round((log.moodX + log.moodY) / 2);
}

// A mood word inspired by the energy x pleasantness quadrant grid.
// Rows = pleasantness band (negative / neutral / positive), cols = energy band.
export function moodWord(x: number, y: number): string {
  const band = (v: number) => (v >= 7 ? 2 : v >= 4 ? 1 : 0);
  const lowEnergy = [
    ['Desolate', 'Drained', 'Miserable'], // negative
    ['Apathetic', 'Tired', 'Lonely'], // neutral
    ['Serene', 'Tranquil', 'Restful'], // positive
  ];
  const highEnergy = [
    ['Uneasy', 'Stressed', 'Enraged'],
    ['Focused', 'Energized', 'Surprised'],
    ['Hopeful', 'Optimistic', 'Ecstatic'],
  ];
  const table = y >= 7 ? highEnergy : lowEnergy;
  return table[band(x)][band(y)] ?? 'Okay';
}

export function todayStr(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}
