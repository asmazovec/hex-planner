import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { strategyCards } from '../../domain/cards';
import { CARD, STATUS_TOKENS } from '../../domain/strategy';
import { tacticalNumbers } from '../../domain/route';
import { gameAs, playersOf } from '../../domain/players';
import type { DataPack, Entry, Game, GameState, Phase, Plan, Round, Warning } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { useReorderDrag } from '../common/useReorderDrag';
import { factionShortName } from '../players/factionName';
import { EntrySteps } from './EntrySteps';
import { ExpeditionEditor } from './ExpeditionEditor';
import { sliceOwners } from './ExpeditionWidget';
import { HexRemove, RowIcon } from './RowIcon';
import { Stepper } from './Stepper';
import { systemName } from './tactical';
import { TokenTiles } from './TokenTiles';
import { WarningList, WarningText } from './WarningText';

const PHASES: Phase[] = ['strategy', 'action', 'status', 'agenda'];

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

// TODO(P2-348) #ws:ui-structure #type:arch #size:s — NoteField — примитив поля, спрятан в списке записей (импорт из AdjustmentEditor, GameScreen); в ui/primitives
/** A text field that writes to the plan when it is left, so typing leaves one undo step. */
export function NoteField({ label, value, disabled, onCommit }: { label: string; value: string; disabled?: boolean; onCommit: (value: string) => void }) {
  const [text, setText] = useState(value);
  return (
    <label className="field">
      {label}
      <input
        type="text" value={text} disabled={disabled} onChange={e => setText(e.target.value)} onBlur={() => onCommit(text)}
        onKeyDown={e => { if (e.key === 'Enter') onCommit(text); }}
      />
    </label>
  );
}

// TODO(P2-349) #ws:ui-nesting #type:ui #needs:prototype — жетоны статуса раскрываются внутри строки записи (5 уровней); отдельное меню на месте списка, как Strategy и Adjustment
/** The status entry: the tokens taken this round, the points each player gains with their running total. */
function StatusFields({ entry, game, pack, state, warnings }: {
  entry: Extract<Entry, { type: 'statusTokens' }>; game: Game; pack: DataPack; state: GameState; warnings: Warning[];
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
      <WarningList warnings={warnings} game={game} pack={pack} />
      <h5 className="status-points">{t('plan.entries.roundPoints')}</h5>
      {playersOf(game).map((player, index) => {
        const faction = pack.factions[player.faction];
        // TODO(P2-350) #ws:ui-containers #type:ui #size:s — цвет игрока inline-стилем var(--player-…) в .status-player ниже; PlayerDot / data-player / playerVar()
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

// TODO(P2-351) #ws:ui-structure #type:dup #size:s #names — имя соперника через factionShortName, а opponentName (map/opponentName.ts) даёт полное; два модуля имён игроков, свести в ui/names.ts
/** An opponent's entry says whose it is before what it is. */
function entryLabel(entry: Entry, game: Game, pack: DataPack, t: (key: string) => string): string {
  const faction = pack.factions[game.opponents.find(o => o.id === entry.owner)?.faction ?? ''];
  const name = bareLabel(entry, game, pack, t);
  return faction ? `${factionShortName(faction.id, faction.name)}: ${name}` : name;
}

function bareLabel(entry: Entry, game: Game, pack: DataPack, t: (key: string) => string): string {
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

// TODO(P2-352) #ws:ui-containers #type:dup #size:s — бейдж номера нарисован третий раз (HexMap, MapLegend); один компонент
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

/** A round's four phases, always shown. Entries move by the handle within a phase, get marked done or deleted. */
export function EntryList({
  game, pack, round, plan, stateBefore, warnings, state, openId, onOpen, shownId = null, onShow, onDone, onStatusAdded, strategy, addAction,
}: EntryListProps) {
  const { t } = useTranslation();
  const updateEntry = useGame(s => s.updateEntry);
  const moveEntry = useGame(s => s.moveEntry);
  const removeEntry = useGame(s => s.removeEntry);
  const setEntryStatus = useGame(s => s.setEntryStatus);
  const addStatusEntry = useGame(s => s.addStatusEntry);
  const listRef = useRef<HTMLDivElement>(null);
  // An entry removed mid-drag (undo, another tab) ends the drag. Entries move within their phase.
  const drag = useReorderDrag({
    axis: 'y',
    element: id => listRef.current?.querySelector(`[data-entry-id="${id}"]`),
    siblings: id => {
      const phase = round.entries.find(e => e.id === id)?.phase;
      return round.entries.filter(e => e.phase === phase).map(e => e.id);
    },
    exists: id => round.entries.some(e => e.id === id),
    onDrop: (id, toIndex) => {
      const phase = round.entries.find(e => e.id === id)?.phase;
      if (phase) moveEntry(id, phase, toIndex);
    },
  });
  const numbers = tacticalNumbers(round.entries);

  return (
    <div className="plan-entries" ref={listRef}>
      {PHASES.map(phase => {
        const entries = round.entries.filter(e => e.phase === phase);
        return (
          <section key={phase} className="phase" aria-label={t(`plan.phases.${phase}`)}>
            {phase === 'strategy' && strategy ? strategy : <h4 className="phase-title">{t(`plan.phases.${phase}`)}</h4>}
            {entries.length === 0 && !(phase === 'strategy' && strategy) && <p className="muted phase-auto">{t(`plan.phases.${phase}Empty`)}</p>}
            <ul className="entry-list">
              {entries.map(entry => {
                const label = entryLabel(entry, game, pack, t);
                // The round has one status entry, so there is nothing to move it past.
                const movable = entry.type !== 'statusTokens';
                const rival = game.opponents.find(o => o.id === entry.owner);
                const list = warnings[entry.id] ?? [];
                const shown = entry.id === shownId;
                // Open fields show the warnings in their own blocks; otherwise the row says it stands for them.
                const fieldsOpen = entry.id === openId && (entry.type === 'statusTokens' || entry.type === 'expedition');
                const cls = ['entry', shown && 'entry-shown', entry.status === 'done' && 'entry-done', list.length > 0 && 'entry-warned', rival && 'entry-rival', drag.draggingId === entry.id && 'entry-dragging'].filter(Boolean).join(' ');
                // TODO(P2-353) #ws:ui-containers #type:ui #size:s #dep:P2-350 — --owner inline-стилем var(--player-…) у строки ниже; data-player / playerVar()
                return (
                  <li key={entry.id} className={cls} style={rival ? { ...drag.styleOf(entry.id), '--owner': `var(--player-${rival.color})` } as CSSProperties : drag.styleOf(entry.id)} data-entry-id={entry.id} aria-label={label}>
                    <div className="entry-main">
                      {movable && <button type="button" className="entry-handle" aria-label={t('plan.entries.drag')} {...drag.handlers(entry.id)}><RowIcon name="grip" /></button>}
                      {numbers[entry.id] !== undefined && <OrderHex number={numbers[entry.id]} label={t('plan.entries.number', { n: numbers[entry.id] })} />}
                      <button type="button" className="entry-label" aria-expanded={entry.type === 'pass' ? undefined : shown} onClick={() => onShow?.(entry)}>{label}</button>
                      {entry.type !== 'pass' && <button type="button" className="hex-button" aria-label={t('plan.entries.edit', { name: label })} onClick={() => onOpen(entry)}><RowIcon name="edit" /></button>}
                      <label className="hex-button entry-check">
                        <span className="visually-hidden">{t('plan.entries.done')}</span>
                        <input
                          type="checkbox" checked={entry.status === 'done'}
                          onChange={e => {
                            setEntryStatus(entry.id, e.target.checked ? 'done' : 'planned');
                            if (e.target.checked) onDone?.(entry);
                          }}
                        />
                        <RowIcon name="done" />
                      </label>
                      <HexRemove label={t('plan.entries.delete')} onClick={() => removeEntry(entry.id)} />
                    </div>
                    {/* TODO(P2-354) #ws:ui-warnings #type:ui #size:s #warning-channel — своя ul.warning-list мимо WarningList; WarningList variant="row" */}
                    {list.length > 0 && !fieldsOpen && (
                      <ul className="warning-list">
                        {list.map((warning, i) => <li key={i}><WarningText warning={warning} game={game} pack={pack} /></li>)}
                      </ul>
                    )}
                    {shown && <EntrySteps entry={entry} game={gameAs(game, entry.owner)} pack={pack} before={stateBefore ? stateBefore(entry.id) : state} />}
                    {entry.id === openId && entry.type === 'statusTokens' && (
                      <div className="entry-details">
                        <StatusFields entry={entry} game={game} pack={pack} state={state} warnings={list} />
                      </div>
                    )}
                    {entry.id === openId && entry.type === 'component' && (
                      <div className="entry-details">
                        <NoteField label={t('plan.entries.note')} value={entry.note} onCommit={note => updateEntry(entry.id, { note })} />
                      </div>
                    )}
                    {/* TODO(P2-355) #ws:ui-nesting #type:ui #needs:prototype #dep:P2-349 — экспедиция раскрывается внутри строки (5 уровней); отдельное меню, как жетоны статуса */}
                    {/* TODO(P2-368) #ws:ui-logic-to-domain #type:arch #size:s #dep:P2-369 — без plan владельцы частей берутся сырыми game.expedition.slices с приведением типа и без частей из плана; всегда sliceOwners (plan обязателен) */}
                    {entry.id === openId && entry.type === 'expedition' && (
                      <div className="entry-details">
                        <ExpeditionEditor
                          game={game} pack={pack} sliceId={entry.sliceId} payment={entry.payment}
                          owners={plan ? sliceOwners(game, plan) : game.expedition.slices as Record<string, 'me' | 'other'>}
                          before={stateBefore ? stateBefore(entry.id) : state} warnings={list}
                          onChange={patch => updateEntry(entry.id, patch)}
                        />
                      </div>
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
