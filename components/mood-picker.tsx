'use client';

import { moodScore, moodWord } from '@/lib/tracker-types';
import { cn } from '@/lib/utils';

interface MoodPickerProps {
  value: { x: number; y: number } | null; // x: pleasantness 1-10, y: energy 1-10
  onChange: (value: { x: number; y: number }) => void;
}

function cellColor(x: number, y: number): string {
  const positive = x >= 6;
  const highEnergy = y >= 6;
  if (highEnergy && positive) return '#FBE7B2'; // butter
  if (highEnergy) return '#F6D3C8'; // ember
  if (positive) return '#CFE8DA'; // mint
  return '#D6E3F2'; // sky
}

export default function MoodPicker({ value, onChange }: MoodPickerProps) {
  const rows = Array.from({ length: 10 }, (_, r) => 10 - r); // energy 10..1 top to bottom
  const cols = Array.from({ length: 10 }, (_, c) => c + 1); // pleasantness 1..10

  return (
    <div>
      <div className="flex gap-4">
        {/* Energy axis label */}
        <div className="flex flex-col justify-between py-1 text-[10px] font-extrabold text-muted-foreground">
          <span className="rotate-180 [writing-mode:vertical-rl]">High energy</span>
        </div>
        <div className="flex-1">
          <div className="grid grid-cols-10 gap-1">
            {rows.map((y) =>
              cols.map((x) => {
                const selected = value?.x === x && value?.y === y;
                return (
                  <button
                    key={`${x}-${y}`}
                    type="button"
                    aria-label={`Pleasantness ${x}, energy ${y}`}
                    onClick={() => onChange({ x, y })}
                    className={cn(
                      'aspect-square rounded-lg transition-transform duration-100',
                      selected
                        ? 'ring-[3px] ring-ink ring-offset-2 ring-offset-background scale-110 z-10'
                        : 'hover:scale-110 active:scale-95'
                    )}
                    style={{ backgroundColor: cellColor(x, y) }}
                  />
                );
              })
            )}
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] font-extrabold text-muted-foreground">
            <span>Negative</span>
            <span>Positive</span>
          </div>
        </div>
      </div>
      {value && (
        <div className="mt-2 text-center">
          <span className="inline-flex items-center gap-2 bg-paper border border-border rounded-full px-4 py-1.5 text-sm font-extrabold shadow-sm">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: cellColor(value.x, value.y) }}
            />
            {moodWord(value.x, value.y)}
            <span className="text-muted-foreground font-bold">· {moodScore(value)}/10</span>
          </span>
        </div>
      )}
    </div>
  );
}
