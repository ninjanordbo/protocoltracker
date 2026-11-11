'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Check, LineChart } from 'lucide-react';
import MoodPicker from '@/components/mood-picker';
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
  const [touched, setTouched] = useState<Set<string>>(new Set());
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
    setTouched(new Set());
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

  const activeProtocols = useMemo(() => protocols, [protocols]);
  const hasEntry = logs.some((l) => l.date === date);

  const sliderRow = (key: 'sleep' | 'health' | 'pain', label: string, hint: string) => {
    const val = metrics[key] ?? 5;
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-extrabold">{label}</label>
          <span
            className={cn(
              'text-sm font-black tabular-nums px-2.5 py-0.5 rounded-full',
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
          onChange={(e) => {
            setMetrics((m) => ({ ...m, [key]: Number(e.target.value) }));
            setTouched((t) => new Set(t).add(key));
          }}
          className="slider w-full"
          aria-label={label}
        />
        <p className="text-[11px] text-muted-foreground font-semibold mt-1">{hint}</p>
      </div>
    );
  };

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Date navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setDate(addDays(date, -1))}
          className="w-10 h-10 rounded-full bg-paper border border-border flex items-center justify-center shadow-sm active:scale-95 transition"
          aria-label="Previous day"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <h1 className="font-black text-lg leading-tight">{fmt(date)}</h1>
          {date === today && (
            <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wide">
              Today
            </span>
          )}
          {hasEntry && date !== today && (
            <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wide">
              Logged
            </span>
          )}
        </div>
        <button
          onClick={() => setDate(addDays(date, 1))}
          disabled={date >= today}
          className="w-10 h-10 rounded-full bg-paper border border-border flex items-center justify-center shadow-sm active:scale-95 transition disabled:opacity-30"
          aria-label="Next day"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-[3px] border-border border-t-ink animate-spin" />
        </div>
      ) : (
        <>
          {/* Mood */}
          <section className="bg-paper border border-border rounded-3xl p-5 shadow-sm space-y-4">
            <div>
              <h2 className="font-black">Mood</h2>
              <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                One tap: how pleasant did today feel, and how much energy did you have?
              </p>
            </div>
            <MoodPicker value={mood} onChange={setMood} />
          </section>

          {/* Metrics */}
          <section className="bg-paper border border-border rounded-3xl p-5 shadow-sm space-y-6">
            <h2 className="font-black">Body & rest</h2>
            {sliderRow('sleep', 'Sleep', '1 = terrible · 10 = deeply rested')}
            {sliderRow('health', 'Health', '1 = sick · 10 = thriving')}
            {sliderRow('pain', 'Pain', '1 = none · 10 = severe')}
          </section>

          {/* Protocols */}
          {activeProtocols.length > 0 && (
            <section className="bg-paper border border-border rounded-3xl p-5 shadow-sm space-y-3">
              <h2 className="font-black">Protocols</h2>
              <div className="flex flex-wrap gap-2">
                {activeProtocols.map((p) => {
                  const v = checks[p.slug];
                  return (
                    <button
                      key={p.slug}
                      onClick={() => cycle(p.slug)}
                      className={cn(
                        'px-4 py-2.5 rounded-full text-sm font-extrabold border transition active:scale-95',
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
              <p className="text-[11px] text-muted-foreground font-semibold">
                Tap to cycle: unset → done → skipped. Unset days show as faint dashes on the
                timeline.
              </p>
            </section>
          )}

          {/* Save */}
          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={isSaving}
              className="flex-1 bg-ink text-cream font-black py-4 rounded-full text-sm shadow-lg active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2"
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
                className="inline-flex items-center gap-1.5 bg-butter text-ink font-black px-4 py-4 rounded-full text-sm active:scale-[0.98] transition"
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
