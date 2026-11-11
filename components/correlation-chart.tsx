'use client';

import { useMemo, useRef, useState } from 'react';
import { METRICS, MetricKey } from '@/lib/tracker-types';
import type { LifeEvent, Protocol } from '@/lib/tracker-types';

export interface ChartDay {
  date: string; // YYYY-MM-DD
  values: Record<MetricKey, number | null>;
  moodLabel: string | null;
  protocols: Record<string, boolean | null>;
}

interface CorrelationChartProps {
  days: ChartDay[];
  protocols: Protocol[]; // rendered in order; archived ones shown faded
  events: LifeEvent[];
}

// Canvas geometry (viewBox units)
const W = 1000;
const PAD_L = 160; // protocol name gutter
const PAD_R = 16;
const PAD_T = 44; // room for event labels
const CHART_H = 300;
const PAD_B = 30; // x date labels
const BAND_H = 8;
const BAND_GAP = 13;

const GRID = '#EAE3D5';
const GRID_WEEK = '#DDD3BF';
const INK = '#23201B';
const EVENT_COLOR = '#C96B4A';

function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length < 3) {
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

function fmtDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function CorrelationChart({ days, protocols, events }: CorrelationChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverDay, setHoverDay] = useState<number | null>(null);
  const [focusProtocol, setFocusProtocol] = useState<string | null>(null);
  const [hiddenMetrics, setHiddenMetrics] = useState<Set<MetricKey>>(new Set());

  const n = days.length;
  const bandW = n > 0 ? (W - PAD_L - PAD_R) / n : 0;
  const dayX = (i: number) => PAD_L + (i + 0.5) * bandW;
  const valY = (v: number) => PAD_T + CHART_H * (1 - (v - 0.5) / 10);
  const bandsTop = PAD_T + CHART_H + PAD_B;
  const H = bandsTop + protocols.length * (BAND_H + BAND_GAP) + 6;

  const dateIndex = useMemo(() => {
    const map = new Map<string, number>();
    days.forEach((d, i) => map.set(d.date, i));
    return map;
  }, [days]);

  const visibleEvents = useMemo(
    () => events.filter((e) => dateIndex.has(e.date)),
    [events, dateIndex]
  );

  const toggleMetric = (key: MetricKey) => {
    setHiddenMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || n === 0) return;
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round((x - PAD_L) / bandW - 0.5);
    setHoverDay(Math.max(0, Math.min(n - 1, i)));
  };

  const adherence = (slug: string) => {
    let done = 0;
    let logged = 0;
    for (const d of days) {
      const v = d.protocols[slug];
      if (v === true) {
        done++;
        logged++;
      } else if (v === false) {
        logged++;
      }
    }
    return logged === 0 ? null : Math.round((done / days.length) * 100);
  };

  const hover = hoverDay !== null ? days[hoverDay] : null;
  const hoverPct = hoverDay !== null ? ((dayX(hoverDay) - PAD_L) / (W - PAD_L - PAD_R)) * 100 : 0;
  const labelStep = Math.max(1, Math.ceil(n / 10));

  return (
    <div className="select-none">
      {/* Metric legend */}
      <div className="flex flex-wrap gap-2 mb-3">
        {METRICS.map((m) => {
          const hidden = hiddenMetrics.has(m.key);
          return (
            <button
              key={m.key}
              onClick={() => toggleMetric(m.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                hidden
                  ? 'bg-paper/60 border-border text-muted-foreground opacity-50'
                  : 'bg-paper border-border text-foreground shadow-sm'
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: hidden ? '#C9C2B4' : m.color }}
              />
              {m.label}
            </button>
          );
        })}
        {visibleEvents.length > 0 && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-paper border border-border text-foreground shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: EVENT_COLOR }} />
            Events
          </span>
        )}
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto block"
          onMouseMove={onMove}
          onMouseLeave={() => setHoverDay(null)}
        >
          {/* Horizontal gridlines + y labels */}
          {[2, 4, 6, 8, 10].map((v) => (
            <g key={v}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={valY(v)}
                y2={valY(v)}
                stroke={GRID}
                strokeWidth={1}
              />
              <text
                x={PAD_L - 8}
                y={valY(v) + 3.5}
                textAnchor="end"
                fontSize={10.5}
                fill="#9A9284"
                fontWeight={700}
              >
                {v}
              </text>
            </g>
          ))}

          {/* Day gridlines + x labels */}
          {days.map((d, i) => {
            const x = dayX(i);
            const dt = new Date(`${d.date}T00:00:00`);
            const showLabel = i % labelStep === 0;
            return (
              <g key={d.date}>
                <line
                  x1={x}
                  x2={x}
                  y1={PAD_T - 6}
                  y2={bandsTop}
                  stroke={dt.getDay() === 1 ? GRID_WEEK : GRID}
                  strokeWidth={1}
                />
                {showLabel && (
                  <text
                    x={x}
                    y={bandsTop - 8}
                    textAnchor="middle"
                    fontSize={9.5}
                    fill="#9A9284"
                    fontWeight={700}
                  >
                    {dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </text>
                )}
              </g>
            );
          })}

          {/* Focus-protocol wash: make correlation visible at a glance */}
          {focusProtocol !== null &&
            days.map((d, i) =>
              d.protocols[focusProtocol] === true ? (
                <rect
                  key={d.date}
                  x={dayX(i) - bandW / 2}
                  y={PAD_T - 6}
                  width={bandW}
                  height={bandsTop - PAD_T + 6}
                  fill="#F2C14E"
                  opacity={0.14}
                />
              ) : null
            )}

          {/* Event flags */}
          {visibleEvents.map((e, k) => {
            const i = dateIndex.get(e.date)!;
            const x = dayX(i);
            const labelY = PAD_T - 20 + (k % 2) * 12;
            return (
              <g key={e.id}>
                <line
                  x1={x}
                  x2={x}
                  y1={PAD_T - 6}
                  y2={bandsTop}
                  stroke={EVENT_COLOR}
                  strokeWidth={1.4}
                  strokeDasharray="3 3"
                  opacity={0.75}
                />
                <circle cx={x} cy={PAD_T - 6} r={3} fill={EVENT_COLOR} />
                <text
                  x={x + 5}
                  y={labelY + 8}
                  fontSize={9.5}
                  fill={EVENT_COLOR}
                  fontWeight={800}
                >
                  <title>{e.title}</title>
                  {e.title.length > 18 ? `${e.title.slice(0, 17)}…` : e.title}
                </text>
              </g>
            );
          })}

          {/* Metric lines */}
          {METRICS.filter((m) => !hiddenMetrics.has(m.key)).map((m) => {
            const pts: { x: number; y: number }[] = [];
            days.forEach((d, i) => {
              const v = d.values[m.key];
              if (v !== null) pts.push({ x: dayX(i), y: valY(v) });
            });
            if (pts.length === 0) return null;
            return (
              <path
                key={m.key}
                d={smoothPath(pts)}
                fill="none"
                stroke={m.color}
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {/* Metric dots (larger on hover day) */}
          {METRICS.filter((m) => !hiddenMetrics.has(m.key)).map((m) =>
            days.map((d, i) => {
              const v = d.values[m.key];
              if (v === null) return null;
              const active = i === hoverDay;
              return (
                <circle
                  key={`${m.key}-${d.date}`}
                  cx={dayX(i)}
                  cy={valY(v)}
                  r={active ? 4.5 : 2.4}
                  fill="#fff"
                  stroke={m.color}
                  strokeWidth={active ? 2.6 : 1.8}
                />
              );
            })
          )}

          {/* Protocol adherence bands — consecutive done-days merge into streak bars */}
          {protocols.map((p, pi) => {
            const y = bandsTop + pi * (BAND_H + BAND_GAP) + BAND_GAP / 2;
            const focused = focusProtocol === p.slug;
            const pct = adherence(p.slug);
            const color = p.color || INK;

            const inWindow = (i: number) => {
              const d = days[i];
              return d.date >= p.created && (!p.archived || d.date <= p.archived);
            };
            // Merge runs of consecutive done days into single bars
            const runs: { start: number; end: number }[] = [];
            let s = -1;
            days.forEach((d, i) => {
              const done = inWindow(i) && d.protocols[p.slug] === true;
              if (done && s === -1) s = i;
              if (!done && s !== -1) {
                runs.push({ start: s, end: i - 1 });
                s = -1;
              }
            });
            if (s !== -1) runs.push({ start: s, end: days.length - 1 });

            const dimOthers = focusProtocol !== null && !focused;
            const runOpacity = p.archived ? 0.35 : dimOthers ? 0.2 : 0.9;
            const pillOpacity = focusProtocol === null || focused ? 1 : 0.25;
            const toggle = () => setFocusProtocol(focused ? null : p.slug);

            return (
              <g key={p.slug}>
                <circle
                  cx={10}
                  cy={y + BAND_H / 2}
                  r={3.5}
                  fill={color}
                  opacity={p.archived ? 0.4 : 1}
                />
                <text
                  x={PAD_L - 10}
                  y={y + BAND_H / 2 + 4}
                  textAnchor="end"
                  fontSize={12}
                  fontWeight={focused ? 900 : 800}
                  fill={p.archived ? '#B4AC9C' : focused ? INK : '#5C564B'}
                  className="cursor-pointer"
                  onClick={toggle}
                >
                  {p.name.length > 24 ? `${p.name.slice(0, 23)}…` : p.name}
                  {p.archived ? ' (archived)' : ''}
                  {pct !== null && (
                    <tspan fill="#B4AC9C" fontWeight={700} fontSize={10}>
                      {`  ${pct}%`}
                    </tspan>
                  )}
                </text>
                {/* Streak bars */}
                {runs.map((r) => (
                  <rect
                    key={`run-${r.start}`}
                    x={dayX(r.start) - bandW * 0.42}
                    y={y}
                    width={dayX(r.end) - dayX(r.start) + bandW * 0.84}
                    height={BAND_H}
                    rx={BAND_H / 2}
                    fill={color}
                    opacity={runOpacity}
                    className="cursor-pointer"
                    onClick={toggle}
                  />
                ))}
                {/* Skipped / unlogged days stay as individual dashed pills */}
                {days.map((d, i) => {
                  if (!inWindow(i) || d.protocols[p.slug] === true) return null;
                  const v = d.protocols[p.slug];
                  return (
                    <rect
                      key={d.date}
                      x={dayX(i) - bandW * 0.42}
                      y={y + 1.5}
                      width={bandW * 0.84}
                      height={BAND_H - 3}
                      rx={(BAND_H - 3) / 2}
                      fill="none"
                      stroke={v === false ? '#A39A89' : '#CFC7B7'}
                      strokeWidth={1.2}
                      strokeDasharray="3 3"
                      opacity={v === false ? 0.8 * pillOpacity : 0.55 * pillOpacity}
                      className="cursor-pointer"
                      onClick={toggle}
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Hover crosshair */}
          {hoverDay !== null && (
            <line
              x1={dayX(hoverDay)}
              x2={dayX(hoverDay)}
              y1={PAD_T - 6}
              y2={bandsTop}
              stroke={INK}
              strokeWidth={1}
              opacity={0.35}
            />
          )}
        </svg>

        {/* Hover tooltip */}
        {hover && (
          <div
            className="absolute z-20 pointer-events-none bg-ink text-cream rounded-2xl px-3.5 py-3 shadow-xl text-xs min-w-[150px]"
            style={{
              left: `${Math.max(8, Math.min(92, hoverPct))}%`,
              top: 0,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="font-black mb-1.5">{fmtDate(hover.date)}</div>
            {METRICS.map((m) => {
              const v = hover.values[m.key];
              if (v === null) return null;
              return (
                <div key={m.key} className="flex items-center gap-1.5 py-0.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                  <span className="text-cream/70 w-12">{m.label}</span>
                  <span className="font-extrabold ml-auto pl-3 tabular-nums">
                    {v}
                    {m.key === 'mood' && hover.moodLabel ? (
                      <span className="font-bold text-cream/60"> · {hover.moodLabel}</span>
                    ) : null}
                  </span>
                </div>
              );
            })}
            {protocols.length > 0 && (
              <div className="mt-1.5 pt-1.5 border-t border-cream/15 space-y-0.5">
                {protocols.map((p) => {
                  const v = hover.protocols[p.slug];
                  if (v === undefined || v === null) return null;
                  return (
                    <div key={p.slug} className="flex items-center gap-1.5 py-0.5">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${v ? 'bg-cream' : 'bg-cream/25'}`}
                      />
                      <span className={v ? '' : 'text-cream/45 line-through'}>{p.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
        Tap a protocol name to highlight the days it was done — compare the shaded columns against
        the lines above. Solid bar = done, dashed = skipped, faint = not logged.
      </p>
    </div>
  );
}
