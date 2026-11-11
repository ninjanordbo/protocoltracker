'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PenLine } from 'lucide-react';
import CorrelationChart, { ChartDay } from '@/components/correlation-chart';
import { moodScore, moodWord, todayStr, DayLog, LifeEvent, Protocol, MetricKey } from '@/lib/tracker-types';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const [days, setDays] = useState(30);
  const [logs, setLogs] = useState<DayLog[]>([]);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async (n: number) => {
    setIsLoading(true);
    try {
      const [logsRes, protocolsRes, eventsRes] = await Promise.all([
        fetch(`/api/daily-logs?days=${n}`),
        fetch('/api/protocols'),
        fetch('/api/events'),
      ]);
      if (logsRes.ok) setLogs(await logsRes.json());
      if (protocolsRes.ok) setProtocols(await protocolsRes.json());
      if (eventsRes.ok) setEvents(await eventsRes.json());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(days);
  }, [days, fetchAll]);

  const chartDays: ChartDay[] = useMemo(() => {
    const byDate = new Map(logs.map((l) => [l.date, l]));
    const out: ChartDay[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = todayStr(d);
      const log = byDate.get(date);
      const values = { mood: null, sleep: null, health: null, pain: null } as Record<MetricKey, number | null>;
      let label: string | null = null;
      if (log) {
        values.mood = moodScore(log);
        values.sleep = log.sleep;
        values.health = log.health;
        values.pain = log.pain;
        if (log.moodX !== null && log.moodY !== null) label = moodWord(log.moodX, log.moodY);
      }
      out.push({ date, values, moodLabel: label, protocols: log?.protocols ?? {} });
    }
    return out;
  }, [logs, days]);

  const orderedProtocols = useMemo(
    () => [...protocols].sort((a, b) => Number(!!a.archived) - Number(!!b.archived) || a.created.localeCompare(b.created)),
    [protocols]
  );

  const hasAnyData = logs.length > 0;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Correlation Dashboard</h1>
          <p className="text-sm text-muted-foreground font-semibold mt-0.5">
            Protocols layered on your wellness timeline
          </p>
        </div>
        <div className="flex bg-paper border border-border rounded-full p-1 shadow-sm">
          {[30, 90].map((n) => (
            <button
              key={n}
              onClick={() => setDays(n)}
              className={cn(
                'px-4 py-1.5 rounded-full text-[13px] font-extrabold transition',
                days === n ? 'bg-ink text-cream' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {n} days
            </button>
          ))}
        </div>
      </div>

      <div className="bg-paper border border-border rounded-3xl p-4 sm:p-6 shadow-sm">
        {isLoading ? (
          <div className="h-72 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-[3px] border-border border-t-ink animate-spin" />
          </div>
        ) : !hasAnyData ? (
          <div className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-butter-soft flex items-center justify-center mx-auto mb-4">
              <PenLine className="w-7 h-7 text-ink" />
            </div>
            <h3 className="font-black text-lg mb-1">No data yet</h3>
            <p className="text-sm text-muted-foreground font-semibold mb-6 max-w-sm mx-auto">
              Log your first day to start seeing how your protocols and life events line up with
              how you feel.
            </p>
            <Link
              href="/log"
              className="inline-flex items-center gap-2 bg-ink text-cream font-extrabold px-6 py-3 rounded-full text-sm"
            >
              <PenLine className="w-4 h-4" />
              Log today
            </Link>
          </div>
        ) : (
          <CorrelationChart days={chartDays} protocols={orderedProtocols} events={events} />
        )}
      </div>
    </div>
  );
}
