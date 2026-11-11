'use client';

import { moodScore, moodWord } from '@/lib/tracker-types';
import { cn } from '@/lib/utils';

interface MoodPickerProps {
  value: { x: number; y: number } | null; // x: pleasantness 1-10, y: energy 1-10
  onChange: (value: { x: number; y: number }) => void;
}

export function cellColor(x: number, y: number): string {
  const positive = x >= 6;
  const highEnergy = y >= 6;
  if (highEnergy && positive) return '#FBE7B2'; // butter
  if (highEnergy) return '#F6D3C8'; // ember
  if (positive) return '#CFE8DA'; // mint
  return '#D6E3F2'; // sky
}

export function MoodChip({ value }: { value: { x: number; y: number } | null }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1.5 bg-background border border-border rounded-full px-2.5 py-0.5 text-[11px] font-extrabold">
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: cellColor(value.x, value.y) }}
      />
      {moodWord(value.x, value.y)}
      <span className="text-muted-foreground font-bold">· {moodScore(value)}/10</span>
    </span>
  );
}

export default function MoodPicker({ value, onChange }: MoodPickerProps) {
  const rows = Array.from({ length: 10 }, (_, r) => 10 - r); // energy 10..1 top to bottom
  const cols = Array.from({ length: 10 }, (_, c) => c + 1); // pleasantness 1..10

  return (
    <div className="flex gap-2 justify-center">
      {/* Energy axis label */}
      <div className="flex flex-col justify-between py-0.5 text-[9px] font-extrabold text-muted-foreground">
        <span className="rotate-180 [writing-mode:vertical-rl]">High energy</span>
      </div>
      <div className="w-full max-w-[130px] sm:max-w-[200px]">
        <div className="grid grid-cols-10 gap-0.5">
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
                    'aspect-square rounded-[4px] transition-transform duration-100',
                    selected
                      ? 'ring-2 ring-ink ring-offset-1 ring-offset-paper scale-125 z-10'
                      : 'hover:scale-110 active:scale-95'
                  )}
                  style={{ backgroundColor: cellColor(x, y) }}
                />
              );
            })
          )}
        </div>
        <div className="flex justify-between mt-1 text-[9px] font-extrabold text-muted-foreground">
          <span>Negative</span>
          <span>Positive</span>
        </div>
      </div>
    </div>
  );
}
