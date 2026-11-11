'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Check, X, Trash2, Flag } from 'lucide-react';
import { LifeEvent, todayStr } from '@/lib/tracker-types';

export default function EventsPage() {
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [date, setDate] = useState(todayStr());
  const [title, setTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const fetchEvents = async () => {
    try {
      const res = await fetch('/api/events');
      if (res.ok) setEvents(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const add = async () => {
    const t = title.trim();
    if (!t || !date) return;
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, title: t }),
    });
    if (res.ok) {
      setTitle('');
      fetchEvents();
    }
  };

  const saveEdit = async (id: string) => {
    await fetch(`/api/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle.trim(), date: editDate }),
    });
    setEditingId(null);
    fetchEvents();
  };

  const remove = async (id: string) => {
    await fetch(`/api/events/${id}`, { method: 'DELETE' });
    setConfirmDelete(null);
    fetchEvents();
  };

  const fmt = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Life Events</h1>
        <p className="text-sm text-muted-foreground font-semibold mt-0.5">
          Mark the things that throw your metrics off — flu, travel, deadlines — so they show up
          on the timeline
        </p>
      </div>

      {/* Add form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex gap-2"
      >
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-paper border border-border rounded-full px-4 py-3 text-sm font-bold shadow-sm outline-none focus:ring-2 ring-butter shrink-0"
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What happened?"
          className="flex-1 min-w-0 bg-paper border border-border rounded-full px-5 py-3 text-sm font-bold shadow-sm outline-none focus:ring-2 ring-butter placeholder:text-muted-foreground/60 placeholder:font-semibold"
        />
        <button
          type="submit"
          disabled={!title.trim()}
          className="w-12 h-12 rounded-full bg-ink text-cream flex items-center justify-center shadow-lg active:scale-95 transition disabled:opacity-40 shrink-0"
          aria-label="Add event"
        >
          <Plus className="w-5 h-5" />
        </button>
      </form>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-[3px] border-border border-t-ink animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-sm text-muted-foreground font-semibold bg-paper border border-dashed border-border rounded-2xl px-4 py-6 text-center">
          No events yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {events.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-3 bg-paper border border-border rounded-2xl px-4 py-3 shadow-sm"
            >
              <span className="w-9 h-9 rounded-full bg-ember-soft flex items-center justify-center shrink-0">
                <Flag className="w-4 h-4 text-ember" />
              </span>
              {editingId === e.id ? (
                <>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(ev) => setEditDate(ev.target.value)}
                    className="bg-background border border-border rounded-xl px-2 py-1.5 text-xs font-bold outline-none"
                  />
                  <input
                    autoFocus
                    value={editTitle}
                    onChange={(ev) => setEditTitle(ev.target.value)}
                    onKeyDown={(ev) => {
                      if (ev.key === 'Enter') saveEdit(e.id);
                      if (ev.key === 'Escape') setEditingId(null);
                    }}
                    className="flex-1 min-w-0 bg-background border border-border rounded-xl px-3 py-1.5 text-sm font-bold outline-none focus:ring-2 ring-butter"
                  />
                  <button
                    onClick={() => saveEdit(e.id)}
                    className="w-9 h-9 rounded-full bg-ink text-cream flex items-center justify-center shrink-0"
                    aria-label="Save event"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0"
                    aria-label="Cancel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-extrabold text-sm">{e.title}</div>
                    <div className="text-[11px] font-bold text-muted-foreground">{fmt(e.date)}</div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingId(e.id);
                      setEditTitle(e.title);
                      setEditDate(e.date);
                    }}
                    className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition"
                    aria-label={`Edit ${e.title}`}
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </button>
                  {confirmDelete === e.id ? (
                    <button
                      onClick={() => remove(e.id)}
                      className="h-9 px-3 rounded-full bg-ember text-white text-xs font-black flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Sure?
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(e.id)}
                      className="w-9 h-9 rounded-full hover:bg-ember-soft flex items-center justify-center transition"
                      aria-label={`Delete ${e.title}`}
                    >
                      <Trash2 className="w-4 h-4 text-ember" />
                    </button>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
