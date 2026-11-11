'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Check, LineChart } from 'lucide-react';
import MoodPicker, { MoodChip } from '@/components/mood-picker';
import { DayLog, Protocol, todayStr } from '@/lib/tracker-types';
import { cn } from '@/lib/utils';

function addDays(date: string, delta: number): string {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return todayStr(d);
}

function fmt(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export default function LogPage() {
  const today = todayStr();
  const [date, setDate] = useState(today);
  const [logs, setLogs] = useState<DayLog[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [mood, setMood] = useState<{ x: number; y: number } | null>(null);
  const [metrics, setMetrics] = useState({ sleep: null as number | null, health: null as number | null, pain: null as number | null });
  const [checks, setChecks] = useState<Record<string, boolean | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [logsRes, protocolsRes] = await Promise.all([
          fetch('/api/daily-logs?days=730'),
          fetch('/api/protocols'),
        ]);
        if (logsRes.ok) setLogs(await logsRes.json());
        if (protocolsRes.ok) {
          const all: Protocol[] = await protocolsRes.json();
          setProtocols(all.filter((p) => !p.archived));
        }
      } catch (error) {
        console.error('Error loading log page:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Load the selected day's existing entry
  useEffect(() => {
    const log = logs.find((l) => l.date === date);
    setMood(log && log.moodX !== null && log.moodY !== null ? { x: log.moodX, y: log.moodY } : null);
    setMetrics({ sleep: log?.sleep ?? null, health: log?.health ?? null, pain: log?.pain ?? null });
    setChecks(log?.protocols ?? {});
    setSaved(false);
  }, [date, logs]);

  const cycle = (slug: string) => {
    setChecks((prev) => {
      const cur = prev[slug];
      const next = cur === undefined || cur === null ? true : cur === true ? false : null;
      const copy = { ...prev };
      if (next === null) delete copy[slug];
      else copy[slug] = next;
      return copy;
    });
  };

  const save = async () => {
    setIsSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/daily-logs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          moodX: mood?.x ?? null,
          moodY: mood?.y ?? null,
          sleep: metrics.sleep,
          health: metrics.health,
          pain: metrics.pain,
          protocols: checks,
        }),
      });
      if (res.ok) {
        const updated: DayLog = await res.json();
        setLogs((prev) => {
          const rest = prev.filter((l) => l.date !== date);
          return [...rest, updated];
        });
        setSaved(true);
      }
    } catch (error) {
      console.error('Error saving log:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const hasEntry = logs.some((l) => l.date === date);

  const sliderRow = (key: 'sleep' | 'health' | 'pain', label: string, hint: string) => {
    const val = metrics[key] ?? 5;
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[13px] font-extrabold">{label}</label>
          <span
            className={cn(
              'text-xs font-black tabular-nums px-2 py-0.5 rounded-full',
              metrics[key] === null ? 'bg-secondary text-muted-foreground' : 'bg-ink text-cream'
            )}
          >
            {metrics[key] === null ? '—' : `${val}/10`}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={val}
          onChange={(e) => setMetrics((m) => ({ ...m, [key]: Number(e.target.value) }))}
          className="slider w-full"
          aria-label={label}
        />
        <p className="text-[10px] text-muted-foreground font-semibold hidden sm:block">{hint}</p>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setDate(addDays(date, -1))}
          className="w-8 h-8 rounded-full bg-paper border border-border flex items-center justify-center shadow-sm active:scale-95 transition"
          aria-label="Previous day"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <h1 className="font-black text-base leading-tight">{fmt(date)}</h1>
          {date === today ? (
            <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wide">
              Today
            </span>
          ) : (
            hasEntry && (
              <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wide">
                Logged
              </span>
            )
          )}
        </div>
        <button
          onClick={() => setDate(addDays(date, 1))}
          disabled={date >= today}
          className="w-8 h-8 rounded-full bg-paper border border-border flex items-center justify-center shadow-sm active:scale-95 transition disabled:opacity-30"
          aria-label="Next day"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-[3px] border-border border-t-ink animate-spin" />
        </div>
      ) : (
        <>
          <div className={cn('grid gap-3', protocols.length > 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-2')}>
            {/* Mood */}
            <section className="bg-paper border border-border rounded-3xl p-3 sm:p-4 shadow-sm space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-black text-sm shrink-0">Mood</h2>
                <MoodChip value={mood} />
              </div>
              <MoodPicker value={mood} onChange={setMood} />
            </section>

            {/* Body & rest */}
            <section className="bg-paper border border-border rounded-3xl p-3 sm:p-4 shadow-sm space-y-2.5">
              <h2 className="font-black text-sm">Body & rest</h2>
              {sliderRow('sleep', 'Sleep', '1 = terrible · 10 = deeply rested')}
              {sliderRow('health', 'Health', '1 = sick · 10 = thriving')}
              {sliderRow('pain', 'Pain', '1 = none · 10 = severe')}
            </section>

            {/* Protocols */}
            {protocols.length > 0 && (
              <section className="bg-paper border border-border rounded-3xl p-3 sm:p-4 shadow-sm space-y-2.5">
                <div>
                  <h2 className="font-black text-sm">Protocols</h2>
                  <p className="text-[11px] text-muted-foreground font-semibold">
                    Tap to cycle: unset → done → skipped
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {protocols.map((p) => {
                    const v = checks[p.slug];
                    return (
                      <button
                        key={p.slug}
                        onClick={() => cycle(p.slug)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-extrabold border transition active:scale-95',
                          v === true
                            ? 'bg-ink text-cream border-ink'
                            : v === false
                              ? 'bg-ember-soft text-ember border-ember/40 line-through'
                              : 'bg-background text-muted-foreground border-border'
                        )}
                      >
                        {v === true ? '✓ ' : v === false ? '✕ ' : ''}
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* Save */}
          <div className="flex items-center gap-2">
            <button
              onClick={save}
              disabled={isSaving}
              className="flex-1 bg-ink text-cream font-black py-2.5 rounded-full text-sm shadow-lg active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <span className="w-4 h-4 rounded-full border-2 border-cream/40 border-t-cream animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {saved ? 'Saved' : 'Save day'}
            </button>
            {saved && (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 bg-butter text-ink font-black px-4 py-3 rounded-full text-sm active:scale-[0.98] transition"
              >
                <LineChart className="w-4 h-4" />
                View
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}
