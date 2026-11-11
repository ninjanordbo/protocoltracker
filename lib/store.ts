// Markdown-file data store. All state lives in data/ as human-readable,
// git-versioned markdown files — no database.
//
// data/protocols/<slug>.md   frontmatter: name, created, archived?
// data/logs/<YYYY-MM-DD>.md  frontmatter: date, moodX, moodY, sleep, health, pain, protocols{}
// data/events/<id>.md        frontmatter: date, title

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import {
  DayLog,
  LifeEvent,
  Protocol,
  PROTOCOL_PALETTE,
  slugify,
  todayStr,
} from './tracker-types';
import { commitData } from './git';

const DATA_DIR = path.join(process.cwd(), 'data');
const PROTOCOLS_DIR = path.join(DATA_DIR, 'protocols');
const LOGS_DIR = path.join(DATA_DIR, 'logs');
const EVENTS_DIR = path.join(DATA_DIR, 'events');

function ensureDirs() {
  for (const dir of [PROTOCOLS_DIR, LOGS_DIR, EVENTS_DIR]) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readMd<T>(file: string): T | null {
  try {
    const { data } = matter(fs.readFileSync(file, 'utf8'));
    return data as T;
  } catch {
    return null;
  }
}

// gray-matter/js-yaml parses bare dates (2026-09-14) as Date objects —
// normalize everything back to plain YYYY-MM-DD strings.
function dstr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'string') return v;
  return '';
}

function writeMd(file: string, frontmatter: Record<string, unknown>) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'object' && !Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        lines.push(`  ${k}: ${v === null ? 'null' : v}`);
      }
    } else {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---', '');
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
}

function listMdFiles(dir: string): string[] {
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .sort();
  } catch {
    return [];
  }
}

// ---------- Protocols ----------

export function listProtocols(): Protocol[] {
  const protocols = listMdFiles(PROTOCOLS_DIR)
    .map((file) => {
      const slug = file.replace(/\.md$/, '');
      const data = readMd<{ name?: string; created?: unknown; archived?: unknown; color?: string }>(
        path.join(PROTOCOLS_DIR, file)
      );
      const name = data?.name;
      if (!name) return null;
      const created = dstr(data.created) || todayStr();
      return {
        slug,
        name,
        created,
        archived: data.archived ? dstr(data.archived) : null,
        color: data.color || '',
      } as Protocol;
    })
    .filter((p): p is Protocol => p !== null)
    .sort((a, b) => a.created.localeCompare(b.created));
  // Backfill colors deterministically for protocols saved before colors existed
  protocols.forEach((p, i) => {
    if (!p.color) p.color = PROTOCOL_PALETTE[i % PROTOCOL_PALETTE.length];
  });
  return protocols;
}

export function createProtocol(name: string): Protocol {
  ensureDirs();
  const base = slugify(name) || 'protocol';
  let slug = base;
  let n = 2;
  while (fs.existsSync(path.join(PROTOCOLS_DIR, `${slug}.md`))) {
    slug = `${base}-${n++}`;
  }
  const colorCount = listProtocols().length;
  const protocol: Protocol = {
    slug,
    name: name.trim(),
    created: todayStr(),
    archived: null,
    color: PROTOCOL_PALETTE[colorCount % PROTOCOL_PALETTE.length],
  };
  writeMd(path.join(PROTOCOLS_DIR, `${slug}.md`), {
    name: protocol.name,
    created: protocol.created,
    color: protocol.color,
  });
  commitData(`protocol: add ${protocol.name}`);
  return protocol;
}

export function updateProtocol(
  slug: string,
  patch: { name?: string; archived?: string | null }
): Protocol | null {
  const file = path.join(PROTOCOLS_DIR, `${slug}.md`);
  const data = readMd<{ name?: string; created?: unknown; archived?: unknown; color?: string }>(file);
  if (!data?.name) return null;
  const updated: Protocol = {
    slug,
    name: patch.name?.trim() || data.name,
    created: dstr(data.created) || todayStr(),
    archived: patch.archived === undefined ? (data.archived ? dstr(data.archived) : null) : patch.archived,
    color: data.color || PROTOCOL_PALETTE[0],
  };
  writeMd(file, {
    name: updated.name,
    created: updated.created,
    archived: updated.archived,
    color: updated.color,
  });
  commitData(`protocol: update ${updated.name}`);
  return updated;
}

export function deleteProtocol(slug: string): boolean {
  const file = path.join(PROTOCOLS_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  commitData(`protocol: remove ${slug}`);
  return true;
}

// ---------- Daily logs ----------

export function getLog(date: string): DayLog | null {
  const data = readMd<{
    date?: unknown;
    moodX?: number | null;
    moodY?: number | null;
    sleep?: number | null;
    health?: number | null;
    pain?: number | null;
    protocols?: Record<string, boolean | null>;
  }>(path.join(LOGS_DIR, `${date}.md`));
  if (!data?.date) return null;
  return {
    date: dstr(data.date),
    moodX: data.moodX ?? null,
    moodY: data.moodY ?? null,
    sleep: data.sleep ?? null,
    health: data.health ?? null,
    pain: data.pain ?? null,
    protocols: data.protocols ?? {},
  };
}

export function listLogs(days: number): DayLog[] {
  ensureDirs();
  const logs: DayLog[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const log = getLog(todayStr(d));
    if (log) logs.push(log);
  }
  return logs.sort((a, b) => a.date.localeCompare(b.date));
}

export function upsertLog(
  date: string,
  entry: {
    moodX?: number | null;
    moodY?: number | null;
    sleep?: number | null;
    health?: number | null;
    pain?: number | null;
    protocols?: Record<string, boolean | null>;
  }
): DayLog {
  ensureDirs();
  const existing = getLog(date) ?? {
    date,
    moodX: null,
    moodY: null,
    sleep: null,
    health: null,
    pain: null,
    protocols: {},
  };
  const merged: DayLog = {
    date,
    moodX: entry.moodX !== undefined ? entry.moodX : existing.moodX,
    moodY: entry.moodY !== undefined ? entry.moodY : existing.moodY,
    sleep: entry.sleep !== undefined ? entry.sleep : existing.sleep,
    health: entry.health !== undefined ? entry.health : existing.health,
    pain: entry.pain !== undefined ? entry.pain : existing.pain,
    protocols: { ...existing.protocols, ...(entry.protocols ?? {}) },
  };
  writeMd(path.join(LOGS_DIR, `${date}.md`), merged);
  commitData(`log: ${date}`);
  return merged;
}

// ---------- Life events ----------

export function listEvents(): LifeEvent[] {
  return listMdFiles(EVENTS_DIR)
    .map((file) => {
      const id = file.replace(/\.md$/, '');
      const data = readMd<{ date?: unknown; title?: string }>(path.join(EVENTS_DIR, file));
      const date = data?.date ? dstr(data.date) : '';
      if (!date || !data?.title) return null;
      return { id, date, title: data.title } as LifeEvent;
    })
    .filter((e): e is LifeEvent => e !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function createEvent(input: { date: string; title: string }): LifeEvent {
  ensureDirs();
  const base = slugify(input.title) || 'event';
  let id = `${input.date}-${base}`;
  let n = 2;
  while (fs.existsSync(path.join(EVENTS_DIR, `${id}.md`))) {
    id = `${input.date}-${base}-${n++}`;
  }
  writeMd(path.join(EVENTS_DIR, `${id}.md`), { date: input.date, title: input.title.trim() });
  commitData(`event: add ${input.title.trim()}`);
  return { id, date: input.date, title: input.title.trim() };
}

export function updateEvent(
  id: string,
  patch: { date?: string; title?: string }
): LifeEvent | null {
  const file = path.join(EVENTS_DIR, `${id}.md`);
  const data = readMd<{ date?: unknown; title?: string }>(file);
  if (!data) return null;
  const updated = {
    id,
    date: patch.date ?? dstr(data.date) ?? todayStr(),
    title: patch.title?.trim() || data.title || '',
  };
  writeMd(file, updated);
  commitData(`event: update ${updated.title}`);
  return updated;
}

export function deleteEvent(id: string): boolean {
  const file = path.join(EVENTS_DIR, `${id}.md`);
  if (!fs.existsSync(file)) return false;
  fs.unlinkSync(file);
  commitData(`event: remove ${id}`);
  return true;
}
