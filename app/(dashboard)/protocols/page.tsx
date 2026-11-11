'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Check, X, Archive, RotateCcw, Trash2 } from 'lucide-react';
import { Protocol } from '@/lib/tracker-types';
import { cn } from '@/lib/utils';

export default function ProtocolsPage() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchProtocols = async () => {
    try {
      const res = await fetch('/api/protocols');
      if (res.ok) setProtocols(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProtocols();
  }, []);

  const add = async () => {
    const name = newName.trim();
    if (!name) return;
    setError(null);
    const res = await fetch('/api/protocols', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      setNewName('');
      fetchProtocols();
    } else {
      setError('Could not add protocol');
    }
  };

  const rename = async (slug: string) => {
    const name = editName.trim();
    if (!name) return;
    await fetch(`/api/protocols/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setEditingSlug(null);
    fetchProtocols();
  };

  const setArchived = async (slug: string, archived: boolean) => {
    await fetch(`/api/protocols/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archived: archived ? new Date().toISOString().slice(0, 10) : null }),
    });
    fetchProtocols();
  };

  const remove = async (slug: string) => {
    await fetch(`/api/protocols/${slug}`, { method: 'DELETE' });
    setConfirmDelete(null);
    fetchProtocols();
  };

  const active = protocols.filter((p) => !p.archived);
  const archived = protocols.filter((p) => p.archived);

  const row = (p: Protocol, isArchived: boolean) => (
    <li
      key={p.slug}
      className={cn(
        'flex items-center gap-2 bg-paper border border-border rounded-2xl px-4 py-3 shadow-sm',
        isArchived && 'opacity-60'
      )}
    >
      {editingSlug === p.slug ? (
        <>
          <input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') rename(p.slug);
              if (e.key === 'Escape') setEditingSlug(null);
            }}
            className="flex-1 min-w-0 bg-background border border-border rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 ring-butter"
          />
          <button
            onClick={() => rename(p.slug)}
            className="w-9 h-9 rounded-full bg-ink text-cream flex items-center justify-center shrink-0"
            aria-label="Save name"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => setEditingSlug(null)}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0"
            aria-label="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 min-w-0 truncate font-extrabold text-sm">
            {p.name}
            {isArchived && (
              <span className="ml-2 text-[10px] font-black uppercase text-muted-foreground">
                archived {p.archived}
              </span>
            )}
          </span>
          {!isArchived && (
            <button
              onClick={() => {
                setEditingSlug(p.slug);
                setEditName(p.name);
              }}
              className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition"
              aria-label={`Rename ${p.name}`}
            >
              <Pencil className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          {isArchived ? (
            <>
              <button
                onClick={() => setArchived(p.slug, false)}
                className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition"
                aria-label={`Restore ${p.name}`}
              >
                <RotateCcw className="w-4 h-4 text-muted-foreground" />
              </button>
              {confirmDelete === p.slug ? (
                <button
                  onClick={() => remove(p.slug)}
                  className="h-9 px-3 rounded-full bg-ember text-white text-xs font-black flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" /> Sure?
                </button>
              ) : (
                <button
                  onClick={() => setConfirmDelete(p.slug)}
                  className="w-9 h-9 rounded-full hover:bg-ember-soft flex items-center justify-center transition"
                  aria-label={`Delete ${p.name} permanently`}
                >
                  <Trash2 className="w-4 h-4 text-ember" />
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => setArchived(p.slug, true)}
              className="w-9 h-9 rounded-full hover:bg-secondary flex items-center justify-center transition"
              aria-label={`Archive ${p.name}`}
            >
              <Archive className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </>
      )}
    </li>
  );

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Protocols</h1>
        <p className="text-sm text-muted-foreground font-semibold mt-0.5">
          The routines and experiments you track against your metrics
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
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New protocol — e.g. Morning Meditation"
          className="flex-1 min-w-0 bg-paper border border-border rounded-full px-5 py-3 text-sm font-bold shadow-sm outline-none focus:ring-2 ring-butter placeholder:text-muted-foreground/60 placeholder:font-semibold"
        />
        <button
          type="submit"
          disabled={!newName.trim()}
          className="w-12 h-12 rounded-full bg-ink text-cream flex items-center justify-center shadow-lg active:scale-95 transition disabled:opacity-40 shrink-0"
          aria-label="Add protocol"
        >
          <Plus className="w-5 h-5" />
        </button>
      </form>
      {error && <p className="text-xs font-bold text-ember">{error}</p>}

      {isLoading ? (
        <div className="h-40 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-[3px] border-border border-t-ink animate-spin" />
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {active.length === 0 && (
              <li className="text-sm text-muted-foreground font-semibold bg-paper border border-dashed border-border rounded-2xl px-4 py-6 text-center">
                No active protocols yet — add your first one above.
              </li>
            )}
            {active.map((p) => row(p, false))}
          </ul>

          {archived.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-xs font-black uppercase tracking-wide text-muted-foreground">
                Archived — history stays on the dashboard
              </h2>
              <ul className="space-y-2">{archived.map((p) => row(p, true))}</ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
