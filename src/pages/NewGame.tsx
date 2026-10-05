import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Play, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { trackEvent } from '../analytics';
import { Button, ConfirmModal, PlayerDot } from '../components/ui';
import { db, requestPersistence, startGame } from '../db/db';
import { useActiveGame, useKnownNames } from '../db/hooks';
import { uuidv7 } from '../db/ids';
import { MAX_PLAYERS, MIN_PLAYERS } from '../engine/kwatro';
import { fmt, useT } from '../i18n';
import { href, useLang, useRouter } from '../router';

interface Entry {
  id: string;
  name: string;
}

function SortableRow({ entry, index, onRemove }: { entry: Entry; index: number; onRemove: () => void }) {
  const t = useT();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
  });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-3 rounded-2xl border bg-surface p-2 pr-3 ${
        isDragging ? 'z-10 border-primary shadow-lg' : 'border-border'
      }`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={fmt(t.setup.dragHandle, { name: entry.name })}
        className="touch-none cursor-grab rounded-lg p-2 text-muted hover:bg-surface-2 active:cursor-grabbing"
      >
        <GripVertical size={20} />
      </button>
      <PlayerDot player={{ id: entry.id, name: entry.name, colorIndex: index }} size={32} />
      <span className="min-w-0 flex-1 truncate font-semibold">{entry.name}</span>
      {index === 0 && (
        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">{t.setup.starts}</span>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={fmt(t.setup.remove, { name: entry.name })}
        className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-danger"
      >
        <X size={18} />
      </button>
    </li>
  );
}

export function NewGame() {
  const t = useT();
  const lang = useLang();
  const { navigate } = useRouter();
  const known = useKnownNames() ?? [];
  const active = useActiveGame();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [confirmStop, setConfirmStop] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // "Play again": prefill players (same seating order) from ?from=<gameId>.
  useEffect(() => {
    const from = new URLSearchParams(window.location.search).get('from');
    if (!from) return;
    db.games.get(from).then((g) => {
      if (g) setEntries(g.players.map((p) => ({ id: uuidv7(), name: p.name })));
    });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const full = entries.length >= MAX_PLAYERS;
  const taken = new Set(entries.map((e) => e.name.toLowerCase()));
  const suggestions = known.filter((n) => !taken.has(n.toLowerCase())).slice(0, 10);

  function add(raw: string) {
    const n = raw.trim().replace(/\s+/g, ' ').slice(0, 24);
    if (!n) return;
    if (full) return setError(fmt(t.setup.maxReached, { max: MAX_PLAYERS }));
    if (taken.has(n.toLowerCase())) return setError(t.setup.duplicate);
    setEntries((e) => [...e, { id: uuidv7(), name: n }]);
    setName('');
    setError('');
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    add(name);
    inputRef.current?.focus();
  }

  function onDragEnd(e: DragEndEvent) {
    const { active: a, over } = e;
    if (!over || a.id === over.id) return;
    setEntries((list) => {
      const from = list.findIndex((x) => x.id === a.id);
      const to = list.findIndex((x) => x.id === over.id);
      return arrayMove(list, from, to);
    });
  }

  async function start() {
    if (busy) return;
    setBusy(true);
    try {
      const game = await startGame(entries.map((e) => e.name));
      trackEvent('game-started');
      void requestPersistence();
      navigate(href({ key: 'game', lang, id: game.id }), { replace: true });
    } finally {
      setBusy(false);
    }
  }

  const canStart = entries.length >= MIN_PLAYERS;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-3xl font-extrabold tracking-tight">{t.setup.title}</h1>
      <p className="mt-2 mb-6 text-muted">{t.setup.intro}</p>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={entries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          <ol className="grid gap-2" aria-label={t.common.players}>
            {entries.map((entry, i) => (
              <SortableRow
                key={entry.id}
                entry={entry}
                index={i}
                onRemove={() => setEntries((list) => list.filter((x) => x.id !== entry.id))}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      {!full && (
        <form onSubmit={onSubmit} className="mt-3 flex gap-2">
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError('');
            }}
            placeholder={t.setup.addPlaceholder}
            aria-label={t.setup.addPlaceholder}
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="done"
            maxLength={24}
            className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none focus:border-primary"
          />
          <Button type="submit" variant="secondary" disabled={!name.trim()} aria-label={t.setup.add}>
            <Plus size={18} />
            <span className="hidden sm:inline">{t.setup.add}</span>
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}

      {suggestions.length > 0 && !full && (
        <div className="mt-5">
          <h2 className="mb-2 text-sm font-semibold text-muted">{t.setup.suggestions}</h2>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => add(s)}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-semibold hover:bg-surface-2"
              >
                <Plus size={14} />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <Button
          variant="primary"
          className="w-full py-4 text-lg"
          disabled={!canStart || busy}
          onClick={() => (active ? setConfirmStop(true) : start())}
        >
          <Play size={20} />
          {t.setup.start}
        </Button>
        {!canStart && <p className="mt-2 text-center text-sm text-muted">{fmt(t.setup.minPlayers, { min: MIN_PLAYERS })}</p>}
      </div>

      <ConfirmModal
        open={confirmStop}
        title={t.setup.stopActiveTitle}
        body={t.setup.stopActiveBody}
        confirmLabel={t.setup.stopActiveConfirm}
        cancelLabel={t.common.cancel}
        onCancel={() => setConfirmStop(false)}
        onConfirm={() => {
          setConfirmStop(false);
          void start();
        }}
      />
    </div>
  );
}
