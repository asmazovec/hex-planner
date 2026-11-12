import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { strategyCards } from '../../data/loadPack';
import { CARD, STATUS_TOKENS } from '../../domain/strategy';
import { tacticalNumbers } from '../../domain/route';
import { gameAs, playersOf } from '../../domain/players';
import { standing } from '../../domain/project';
import type { DataPack, Entry, EntryBody, Game, GameState, Phase, Round, Warning } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { useReorderDrag } from '../common/useReorderDrag';
import { shortName } from '../players/names';
import { EntrySteps } from './EntrySteps';
import { actLines, insideCard } from './actLines';
import { GainsBlock } from './blocks/GainsBlock';
import { agendaOf } from './editors/AdjustmentEditor';
import { HexRemove, RowIcon } from '../primitives/Icon';
import { Stepper } from '../primitives/Stepper';
import { systemTitle } from '../map/systemName';
import { TokenTiles } from './blocks/TokenTiles';
import { flightOf } from '../feedback/warningPlaces';
import { WarningList } from '../feedback/WarningText';
import { SectionTitle } from '../primitives/SectionTitle';
import { playerStyle } from '../primitives/player';

const PHASES: Phase[] = ['strategy', 'action', 'status', 'agenda'];

export interface EntryListProps {
  game: Game;
  pack: DataPack;
  round: Round;
  /** The state just before an entry, for what its steps read out; defaults to the forecast. */
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
  /** Adds an agenda that was resolved to the agenda phase and opens it. */
  onAddAgenda?: () => void;
  /** Stands in the strategy section in place of its title and line. */
  strategy?: ReactNode;
  /** The add button of the action section, kept in view while its list is long. */
  addAction?: ReactNode;
}

// TODO(P2-349) #ws:ui-nesting #type:ui #needs:prototype — жетоны статуса раскрываются внутри строки записи (5 уровней); отдельное меню на месте списка, как Strategy и Adjustment
/**
 * The status entry: the tokens taken this round, the points each player gains with their running total, and what the
 * phase brings: the action card drawn (81.3), whichever it is, has a button of its own.
 */
function StatusFields({ entry, game, pack, state, before, warnings }: {
  entry: Extract<Entry, { type: 'statusTokens' }>; game: Game; pack: DataPack; state: GameState; before?: GameState; warnings: Warning[];
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
      <SectionTitle as="h5" className="status-points">{t('plan.entries.roundPoints')}</SectionTitle>
      {playersOf(game).map((player, index) => {
        const me = index === 0;
        return (
          <div key={player.id} className="status-player" style={playerStyle('--player', player.color)}>
            <Stepper
              name={shortName(pack, player.faction, t('players.player', { n: index + 1 }))}
              note={t('plan.entries.pointsTotal', { n: me ? state.vp : state.opponentVp[player.id] ?? player.vp })}
              value={me ? entry.vp ?? 0 : gains[player.id] ?? 0} min={0}
              onChange={value => updateEntry(entry.id, me ? { vp: value } : { opponentVp: { ...gains, [player.id]: value } })}
            />
          </div>
        );
      })}
      <p className="muted status-reminder">{t('plan.entries.planetsRefresh')}</p>
      {/* Last: a card taken stands under its buttons and moves nothing above. */}
      <GainsBlock entry={entry} pack={pack} before={before} lead="actionCard" onChange={patch => updateEntry(entry.id, patch as Partial<EntryBody>)} />
    </>
  );
}

const cardName = (game: Game, card: number | undefined): string | undefined =>
  strategyCards(game.expansions).find(c => c.initiative === card)?.name;

/** An opponent's entry says whose it is before what it is. */
function entryLabel(entry: Entry, game: Game, pack: DataPack, t: (key: string) => string): string {
  const faction = game.opponents.find(o => o.id === entry.owner)?.faction ?? '';
  const name = bareLabel(entry, game, pack, t);
  return pack.factions[faction] ? `${shortName(pack, faction, '')}: ${name}` : name;
}

function bareLabel(entry: Entry, game: Game, pack: DataPack, t: (key: string) => string): string {
  switch (entry.type) {
    case 'tactical':
      return `${entry.free ? `${cardName(game, CARD.warfare)}: ` : ''}${t('plan.menu.tactical')} · ${entry.systemId === null ? t('plan.entries.noSystem') : systemTitle(game, pack, entry.systemId, t)}`;
    case 'strategic':
    case 'secondary': {
      const name = cardName(game, entry.card);
      return `${t(`plan.entries.${entry.type}`)}${name ? `: ${name}` : ''}${entry.forToken ? ` · ${t('plan.entries.forToken')}` : ''}`;
    }
    case 'adjustment':
      // In the agenda phase the entry is the agenda that was resolved.
      if (entry.phase === 'agenda') return [t('plan.agenda.title'), agendaOf(entry, pack)?.name ?? entry.label].filter(Boolean).join(': ');
      if (entry.kind) return `${t(`plan.entries.kind.${entry.kind}`)} · ${systemTitle(game, pack, entry.delta.units?.systemId ?? '', t)}`;
      return entry.label ? `${t('plan.menu.adjustment')}: ${entry.label}` : t('plan.menu.adjustment');
    case 'component':
      return entry.note ? `${t('plan.menu.component')}: ${entry.note}` : t('plan.menu.component');
    case 'statusTokens':
      return t('plan.entries.statusTokens');
    default:
      return t(`plan.menu.${entry.type}`);
  }
}

// TODO(P2-352) #ws:ui-containers #type:dup #size:s — бейдж номера нарисован третий раз (HexMap, MapLegend); один компонент — P2 note: the map and the legend now share RouteBadge; this one is an HTML number over a 12-wide hexagon in the row's own colours, and drawing the map's SVG badge here changes how the row looks: needs prototype
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
  game, pack, round, stateBefore, warnings, state, openId, onOpen, shownId = null, onShow, onDone, onStatusAdded, onAddAgenda, strategy, addAction,
}: EntryListProps) {
  const { t } = useTranslation();
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
        // Warfare's free tactical action is drawn inside its card's row.
        const entries = round.entries.filter(e => e.phase === phase && !insideCard(e, round));
        return (
          <section key={phase} className="phase" aria-label={t(`plan.phases.${phase}`)}>
            {phase === 'strategy' && strategy ? strategy : <SectionTitle as="h4" className="phase-title">{t(`plan.phases.${phase}`)}</SectionTitle>}
            {entries.length === 0 && !(phase === 'strategy' && strategy) && <p className="muted phase-auto">{t(`plan.phases.${phase}Empty`)}</p>}
            <ul className="entry-list">
              {entries.map(entry => {
                const label = entryLabel(entry, game, pack, t);
                // The round has one status entry, so there is nothing to move it past.
                const movable = entry.type !== 'statusTokens';
                const rival = game.opponents.find(o => o.id === entry.owner);
                // A card speaks for Warfare's free action too: its warnings mark the card's row.
                const free = entry.type === 'strategic' ? round.entries.find(e => e.type === 'tactical' && e.fromCard === entry.id) : undefined;
                const list = [...(warnings[entry.id] ?? []), ...(free ? warnings[free.id] ?? [] : [])];
                const shown = entry.id === shownId;
                // The steps of a shown action say what goes wrong with a flight by that flight; the row keeps the rest.
                const inSteps = (w: Warning) => flightOf(w, gameAs(game, entry.owner), pack, entry) !== undefined;
                // Open fields show the warnings in their own blocks; otherwise the row says it stands for them.
                const fieldsOpen = entry.id === openId && entry.type === 'statusTokens';
                const cls = ['entry', shown && 'entry-shown', entry.status === 'done' && 'entry-done', standing(list).length > 0 && 'entry-warned', rival && 'entry-rival', drag.draggingId === entry.id && 'entry-dragging'].filter(Boolean).join(' ');
                return (
                  <li key={entry.id} className={cls} style={rival ? { ...drag.styleOf(entry.id), ...playerStyle('--owner', rival.color) } : drag.styleOf(entry.id)} data-entry-id={entry.id} aria-label={label}>
                    <div className="entry-main">
                      {movable && <button type="button" className="entry-handle" aria-label={t('plan.entries.drag')} {...drag.handlers(entry.id)}><RowIcon name="grip" /></button>}
                      {/* The number is part of the name: one button, one background under the pointer. */}
                      <button type="button" className="entry-label" aria-label={label} aria-expanded={entry.type === 'pass' ? undefined : shown} onClick={() => onShow?.(entry)}>
                        {numbers[entry.id] !== undefined && <OrderHex number={numbers[entry.id]} label={t('plan.entries.number', { n: numbers[entry.id] })} />}
                        <span className="entry-name">
                          <span className="entry-title">{label}</span>
                          {/* What the turn holds beside its action, each a line of its own. */}
                          {actLines(entry, round, game, pack, t).map(line => <small key={line} className="entry-brief entry-act">{line}</small>)}
                        </span>
                      </button>
                      <button type="button" className="icon-button" aria-label={t('plan.entries.edit', { name: label })} onClick={() => onOpen(entry)}><RowIcon name="edit" /></button>
                      <label className="icon-button entry-check">
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
                    {!fieldsOpen && <WarningList variant="row" warnings={shown ? list.filter(w => !inSteps(w)) : list} game={game} pack={pack} />}
                    {shown && <EntrySteps entry={entry} game={gameAs(game, entry.owner)} pack={pack} before={stateBefore ? stateBefore(entry.id) : state} warnings={list.filter(inSteps)} />}
                    {entry.id === openId && entry.type === 'statusTokens' && (
                      <div className="entry-details">
                        <StatusFields entry={entry} game={game} pack={pack} state={state} before={stateBefore?.(entry.id)} warnings={list} />
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
            {/* Each agenda of the phase is an entry of its own: the button stays for the next one. */}
            {phase === 'agenda' && onAddAgenda && <button type="button" onClick={onAddAgenda}>{t('plan.agenda.add')}</button>}
          </section>
        );
      })}
    </div>
  );
}
