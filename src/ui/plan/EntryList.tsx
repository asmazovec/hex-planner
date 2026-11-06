import { useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { strategyCards } from '../../domain/cards';
import { CARD, STATUS_TOKENS } from '../../domain/strategy';
import { tacticalNumbers } from '../../domain/route';
import { playersOf } from '../../domain/players';
import type { AdjustmentDelta, DataPack, Entry, Game, GameState, Phase, Plan, Round, UnitId, Warning } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { factionShortName } from '../players/factionName';
import { UNIT_ORDER } from '../units/unitOrder';
import { EntrySteps } from './EntrySteps';
import { ExpeditionEditor } from './ExpeditionEditor';
import { sliceOwners } from './ExpeditionWidget';
import { Stepper } from './Stepper';
import { systemName } from './tactical';
import { TokenTiles } from './TokenTiles';
import { WarningText } from './WarningText';

const PHASES: Phase[] = ['strategy', 'action', 'status', 'agenda'];
const DELTA_FIELDS = ['tradeGoods', 'tactic', 'fleet', 'strategy', 'vp'] as const;

export interface EntryListProps {
  game: Game;
  pack: DataPack;
  round: Round;
  /** The plan the round belongs to: the expedition parts held by all its entries. */
  plan?: Plan;
  /** The state just before an entry, for the payment of an expedition part; defaults to the forecast. */
  stateBefore?: (entryId: string) => GameState;
  warnings: Record<string, Warning[]>;
  /** The forecast, for the systems a manual adjustment can change. */
  state: GameState;
  /** The entry whose fields are shown. */
  openId: string | null;
  /** The pencil: opens the entry's editor. */
  onOpen: (entry: Entry) => void;
  /** The entry being read: its steps stand under its row. */
  shownId?: string | null;
  /** The entry the round's playback has reached. */
  playingId?: string | null;
  /** A tap on the row shows the entry, a second tap closes it. */
  onShow?: (entry: Entry) => void;
  /** The entry was just marked as done. */
  onDone?: (entry: Entry) => void;
  /** The status entry was added; it opens for its tokens and points. */
  onStatusAdded?: (id: string) => void;
  /** Stands in the strategy section in place of its title and line. */
  strategy?: ReactNode;
  /** The add button of the action section, kept in view while its list is long. */
  addAction?: ReactNode;
}

/** A text field that writes to the plan when it is left, so typing leaves one undo step. */
function NoteField({ label, value, onCommit }: { label: string; value: string; onCommit: (value: string) => void }) {
  const [text, setText] = useState(value);
  return (
    <label className="field">
      {label}
      <input
        type="text" value={text} onChange={e => setText(e.target.value)} onBlur={() => onCommit(text)}
        onKeyDown={e => { if (e.key === 'Enter') onCommit(text); }}
      />
    </label>
  );
}

function AdjustmentFields({ entry, game, pack, state }: {
  entry: Extract<Entry, { type: 'adjustment' }>; game: Game; pack: DataPack; state: GameState;
}) {
  const { t } = useTranslation();
  const updateEntry = useGame(s => s.updateEntry);
  const { delta } = entry;
  const setDelta = (patch: Partial<AdjustmentDelta>) => updateEntry(entry.id, { delta: { ...delta, ...patch } });
  const systemId = delta.units?.systemId ?? '';
  const changes = delta.units?.units ?? {};
  const held = state.systems[systemId] ?? {};
  const unitIds: UnitId[] = UNIT_ORDER.filter(u => pack.units[u]);
  const systems = Object.keys(game.map).filter(slot => pack.tiles[game.map[slot].split('@')[0]]);
  return (
    <>
      <NoteField label={t('plan.entries.label')} value={entry.label} onCommit={label => updateEntry(entry.id, { label })} />
      {DELTA_FIELDS.map(field => (
        <Stepper
          key={field} name={t(`plan.summary.${field}`)} value={delta[field] ?? 0}
          onChange={value => setDelta({ [field]: value })}
        />
      ))}
      <label className="field">
        {t('plan.entries.system')}
        <select
          value={systemId}
          onChange={e => setDelta({ units: e.target.value ? { systemId: e.target.value, units: changes } : undefined })}
        >
          <option value="">{t('plan.entries.noneSystem')}</option>
          {systems.map(slot => <option key={slot} value={slot}>{systemName(game, pack, slot)}</option>)}
        </select>
      </label>
      {systemId && unitIds.map(unit => (
        <Stepper
          key={unit} name={t(`unit.${unit}`)} value={changes[unit] ?? 0} of={held[unit] ?? 0}
          onChange={value => setDelta({ units: { systemId, units: { ...changes, [unit]: value } } })}
        />
      ))}
    </>
  );
}

/** The status entry: the tokens taken this round, the points each player gains with their running total. */
function StatusFields({ entry, game, pack, state }: {
  entry: Extract<Entry, { type: 'statusTokens' }>; game: Game; pack: DataPack; state: GameState;
}) {
  const { t } = useTranslation();
  const updateEntry = useGame(s => s.updateEntry);
  const gains = entry.opponentVp ?? {};
  return (
    <>
      <TokenTiles
        free={STATUS_TOKENS} values={{ tactic: entry.tactic, fleet: entry.fleet, strategy: entry.strategy }}
        onChange={values => updateEntry(entry.id, values)}
      />
      <h5 className="status-points">{t('plan.entries.roundPoints')}</h5>
      {playersOf(game).map((player, index) => {
        const faction = pack.factions[player.faction];
        const me = index === 0;
        return (
          <div key={player.id} className="status-player" style={{ '--player': `var(--player-${player.color})` } as React.CSSProperties}>
            <Stepper
              name={faction ? factionShortName(faction.id, faction.name) : t('players.player', { n: index + 1 })}
              note={t('plan.entries.pointsTotal', { n: me ? state.vp : state.opponentVp[player.id] ?? player.vp })}
              value={me ? entry.vp ?? 0 : gains[player.id] ?? 0} min={0}
              onChange={value => updateEntry(entry.id, me ? { vp: value } : { opponentVp: { ...gains, [player.id]: value } })}
            />
          </div>
        );
      })}
      <p className="muted status-reminder">{t('plan.entries.planetsRefresh')}</p>
    </>
  );
}

const cardName = (game: Game, card: number | undefined): string | undefined =>
  strategyCards(game.expansions).find(c => c.initiative === card)?.name;

function entryLabel(entry: Entry, game: Game, pack: DataPack, t: (key: string) => string): string {
  switch (entry.type) {
    case 'tactical':
      return `${entry.free ? `${cardName(game, CARD.warfare)}: ` : ''}${t('plan.menu.tactical')} · ${entry.systemId === null ? t('plan.entries.noSystem') : systemName(game, pack, entry.systemId)}`;
    case 'strategic':
    case 'secondary': {
      const name = cardName(game, entry.card);
      return `${t(`plan.entries.${entry.type}`)}${name ? `: ${name}` : ''}${entry.forToken ? ` · ${t('plan.entries.forToken')}` : ''}`;
    }
    case 'adjustment':
      if (entry.kind) return `${t(`plan.entries.kind.${entry.kind}`)} · ${systemName(game, pack, entry.delta.units?.systemId ?? '')}`;
      return entry.label ? `${t('plan.menu.adjustment')}: ${entry.label}` : t('plan.menu.adjustment');
    case 'component':
      return entry.note ? `${t('plan.menu.component')}: ${entry.note}` : t('plan.menu.component');
    case 'statusTokens':
      return t('plan.entries.statusTokens');
    default:
      return t(`plan.menu.${entry.type}`);
  }
}

/** The number of a tactical action, in the same hexagon as on its arrows. */
function OrderHex({ number, label }: { number: number; label: string }) {
  return (
    <span className="order-hex" role="img" aria-label={label}>
      <svg viewBox="-13 -11.5 26 23" width="26" height="23" aria-hidden="true">
        <polygon points="12,0 6,10.4 -6,10.4 -12,0 -6,-10.4 6,-10.4" />
      </svg>
      <b aria-hidden="true">{number}</b>
    </span>
  );
}

/** A round's four phases, always shown. Entries move by the handle or the arrows within a phase, get marked done or deleted. */
export function EntryList({
  game, pack, round, plan, stateBefore, warnings, state, openId, onOpen, shownId = null, playingId = null, onShow, onDone, onStatusAdded, strategy, addAction,
}: EntryListProps) {
  const { t } = useTranslation();
  const updateEntry = useGame(s => s.updateEntry);
  const moveEntry = useGame(s => s.moveEntry);
  const removeEntry = useGame(s => s.removeEntry);
  const setEntryStatus = useGame(s => s.setEntryStatus);
  const addStatusEntry = useGame(s => s.addStatusEntry);
  const listRef = useRef<HTMLDivElement>(null);
  const [rawDrag, setDrag] = useState<{ id: string; pointerId: number; index: number } | null>(null);
  // An entry removed mid-drag (undo, another tab) must not keep the drag, and with it every new one, from starting.
  const drag = rawDrag && round.entries.some(e => e.id === rawDrag.id) ? rawDrag : null;
  const numbers = tacticalNumbers(round.entries);

  const dropIndex = (entry: Entry, clientY: number): number => {
    const others = round.entries.filter(e => e.phase === entry.phase && e.id !== entry.id);
    const rows = others.map(e => listRef.current?.querySelector(`[data-entry-id="${e.id}"]`)?.getBoundingClientRect());
    return rows.filter(rect => rect && rect.top + rect.height / 2 < clientY).length;
  };

  const handlers = (entry: Entry, index: number) => ({
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (drag) return;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      setDrag({ id: entry.id, pointerId: e.pointerId, index });
    },
    onPointerMove: (e: PointerEvent) => {
      if (drag?.id === entry.id && drag.pointerId === e.pointerId) setDrag({ ...drag, index: dropIndex(entry, e.clientY) });
    },
    onPointerUp: (e: PointerEvent) => {
      if (drag?.id !== entry.id || drag.pointerId !== e.pointerId) return;
      setDrag(null);
      moveEntry(entry.id, entry.phase, dropIndex(entry, e.clientY));
    },
    onPointerCancel: () => setDrag(null),
  });

  return (
    <div className="plan-entries" ref={listRef}>
      {PHASES.map(phase => {
        const entries = round.entries.filter(e => e.phase === phase);
        const others = entries.filter(e => e.id !== drag?.id);
        const dragging = drag !== null && entries.some(e => e.id === drag.id);
        return (
          <section key={phase} className="phase" aria-label={t(`plan.phases.${phase}`)}>
            {phase === 'strategy' && strategy ? strategy : <h4 className="phase-title">{t(`plan.phases.${phase}`)}</h4>}
            {entries.length === 0 && !(phase === 'strategy' && strategy) && <p className="muted phase-auto">{t(`plan.phases.${phase}Empty`)}</p>}
            <ul className="entry-list">
              {entries.map((entry, index) => {
                const label = entryLabel(entry, game, pack, t);
                // The round has one status entry, so there is nothing to move it past.
                const movable = entry.type !== 'statusTokens';
                const list = warnings[entry.id] ?? [];
                const before = dragging && others[drag.index]?.id === entry.id;
                const after = dragging && drag.index === others.length && others.at(-1)?.id === entry.id;
                const shown = entry.id === shownId;
                const cls = ['entry', shown && 'entry-shown', entry.id === playingId && 'entry-playing', entry.status === 'done' && 'entry-done', list.length > 0 && 'entry-warned', drag?.id === entry.id && 'entry-dragging',
                  before && 'entry-drop-before', after && 'entry-drop-after'].filter(Boolean).join(' ');
                return (
                  <li key={entry.id} className={cls} data-entry-id={entry.id} aria-label={label}>
                    <div className="entry-main">
                      {movable && <button type="button" className="entry-handle" aria-label={t('plan.entries.drag')} {...handlers(entry, index)}>⠿</button>}
                      {numbers[entry.id] !== undefined && <OrderHex number={numbers[entry.id]} label={t('plan.entries.number', { n: numbers[entry.id] })} />}
                      <button type="button" className="entry-label" aria-expanded={entry.type === 'pass' ? undefined : shown} onClick={() => onShow?.(entry)}>{label}</button>
                      {entry.type !== 'pass' && <button type="button" aria-label={t('plan.entries.edit', { name: label })} onClick={() => onOpen(entry)}>✎</button>}
                      <label className="check entry-check">
                        <span className="visually-hidden">{t('plan.entries.done')}</span>
                        <input
                          type="checkbox" checked={entry.status === 'done'}
                          onChange={e => {
                            setEntryStatus(entry.id, e.target.checked ? 'done' : 'planned');
                            if (e.target.checked) onDone?.(entry);
                          }}
                        />
                      </label>
                      {movable && (
                        <>
                          <button
                            type="button" aria-label={t('plan.entries.up')} disabled={index === 0}
                            onClick={() => moveEntry(entry.id, phase, index - 1)}
                          >
                            ↑
                          </button>
                          <button
                            type="button" aria-label={t('plan.entries.down')} disabled={index === entries.length - 1}
                            onClick={() => moveEntry(entry.id, phase, index + 1)}
                          >
                            ↓
                          </button>
                        </>
                      )}
                      <button type="button" aria-label={t('plan.entries.delete')} onClick={() => removeEntry(entry.id)}>✕</button>
                    </div>
                    {shown && <EntrySteps entry={entry} game={game} pack={pack} before={stateBefore ? stateBefore(entry.id) : state} />}
                    {entry.id === openId && entry.type === 'statusTokens' && (
                      <div className="entry-details">
                        <StatusFields entry={entry} game={game} pack={pack} state={state} />
                      </div>
                    )}
                    {entry.id === openId && entry.type === 'component' && (
                      <div className="entry-details">
                        <NoteField label={t('plan.entries.note')} value={entry.note} onCommit={note => updateEntry(entry.id, { note })} />
                      </div>
                    )}
                    {entry.id === openId && entry.type === 'expedition' && (
                      <div className="entry-details">
                        <ExpeditionEditor
                          game={game} pack={pack} sliceId={entry.sliceId} payment={entry.payment}
                          owners={plan ? sliceOwners(game, plan) : game.expedition.slices as Record<string, 'me' | 'other'>}
                          before={stateBefore ? stateBefore(entry.id) : state}
                          onChange={patch => updateEntry(entry.id, patch)}
                        />
                      </div>
                    )}
                    {entry.id === openId && entry.type === 'adjustment' && !entry.kind && (
                      <div className="entry-details">
                        <AdjustmentFields entry={entry} game={game} pack={pack} state={state} />
                      </div>
                    )}
                    {list.length > 0 && (
                      <ul className="warning-list">
                        {list.map((warning, i) => <li key={i}><WarningText warning={warning} game={game} pack={pack} /></li>)}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
            {phase === 'action' && addAction && <div className="phase-add">{addAction}</div>}
            {phase === 'status' && !entries.some(e => e.type === 'statusTokens') && (
              <button type="button" onClick={() => onStatusAdded?.(addStatusEntry(round.number))}>{t('plan.entries.statusTokens')}</button>
            )}
          </section>
        );
      })}
    </div>
  );
}
