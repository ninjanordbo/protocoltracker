
'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface DailyLog {
  id: string;
  date: string;
  energyLevel: number | null;
  sleepQuality: number | null;
  pain: number | null;
  health: number | null;
  mood: number | null;
  protocolLogs: Array<{
    id: string;
    completed: boolean;
    protocol: {
      id: string;
      name: string;
    };
  }>;
}

interface CorrelationGraphProps {
  dailyLogs: DailyLog[];
  protocols: Array<{ id: string; name: string }>;
}

const METRIC_COLORS = {
  energyLevel: '#60B5FF',
  sleepQuality: '#7BA4D9',
  pain: '#FF6363',
  health: '#80D8C3',
  mood: '#FF9149',
};

const METRIC_LABELS = {
  energyLevel: 'Energy',
  sleepQuality: 'Sleep',
  pain: 'Pain',
  health: 'Health',
  mood: 'Mood',
};

const PROTOCOL_COLORS = ['#2D3748', '#4A5568', '#718096', '#A0AEC0'];

export default function CorrelationGraph({ dailyLogs, protocols }: CorrelationGraphProps) {
  const chartData = useMemo(() => {
    return dailyLogs?.map?.((log) => {
      const protocolData: Record<string, boolean> = {};
      log?.protocolLogs?.forEach?.((pLog) => {
        protocolData[pLog?.protocol?.id ?? ''] = pLog?.completed ?? false;
      });

      return {
        date: log?.date ? format(parseISO(log.date), 'MMM dd') : '',
        dayOfWeek: log?.date ? format(parseISO(log.date), 'EEE') : '',
        energyLevel: log?.energyLevel ?? null,
        sleepQuality: log?.sleepQuality ?? null,
        pain: log?.pain ?? null,
        health: log?.health ?? null,
        mood: log?.mood ?? null,
        ...protocolData,
      } as Record<string, any>;
    }) ?? [];
  }, [dailyLogs]);

  if (!dailyLogs || dailyLogs.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <p className="text-gray-500">No data available. Start logging to see correlations!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Wellness Correlations</h2>
        <p className="text-sm text-gray-500">Track how protocols affect your wellness metrics</p>
      </div>

      {/* Graph */}
      <div className="mb-6">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <XAxis
              dataKey="dayOfWeek"
              tickLine={false}
              tick={{ fontSize: 10, fill: '#6B7280' }}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <YAxis
              domain={[0, 6]}
              ticks={[1, 2, 3, 4, 5, 6]}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#6B7280' }}
              axisLine={{ stroke: '#E5E7EB' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                fontSize: '11px',
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ fontSize: 11, paddingBottom: '10px' }}
            />
            <Line
              type="monotone"
              dataKey="energyLevel"
              stroke={METRIC_COLORS.energyLevel}
              strokeWidth={2}
              dot={{ r: 3 }}
              name={METRIC_LABELS.energyLevel}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="sleepQuality"
              stroke={METRIC_COLORS.sleepQuality}
              strokeWidth={2}
              dot={{ r: 3 }}
              name={METRIC_LABELS.sleepQuality}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="health"
              stroke={METRIC_COLORS.health}
              strokeWidth={2}
              dot={{ r: 3 }}
              name={METRIC_LABELS.health}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="mood"
              stroke={METRIC_COLORS.mood}
              strokeWidth={2}
              dot={{ r: 3 }}
              name={METRIC_LABELS.mood}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Protocol Adherence Bars */}
      {protocols && protocols.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Protocol Adherence</h3>
          {protocols.map((protocol, index) => (
            <div key={protocol?.id} className="space-y-1">
              <div className="text-xs font-medium text-gray-600">{protocol?.name}</div>
              <div className="flex gap-1">
                {chartData?.map?.((day, dayIndex) => {
                  const isCompleted = day?.[protocol?.id ?? ''] === true;
                  const color = PROTOCOL_COLORS[index % PROTOCOL_COLORS.length];
                  return (
                    <div
                      key={dayIndex}
                      className="flex-1 h-2 rounded-full transition"
                      style={{
                        backgroundColor: isCompleted ? color : 'transparent',
                        border: `1px ${isCompleted ? 'solid' : 'dashed'} ${color}`,
                        opacity: isCompleted ? 1 : 0.3,
                      }}
                      title={`${day?.dayOfWeek}: ${isCompleted ? 'Completed' : 'Not completed'}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
