import { useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { strategyCards } from '../../data/loadPack';
import { componentById } from '../../domain/components';
import { CARD } from '../../domain/strategy';
import { standing } from '../../domain/replay';
import type { Turn } from '../../game/actions';
import { turnNumbers } from '../../game/numbering';
import { mapSource } from '../../game/space';
import type { DataPack, Phase, Warning } from '../../domain/types';
import { addStatusTurn, moveTurn, removeTurn, setStatus } from '../../state/turnBridge';
import { useReorderDrag } from '../common/useReorderDrag';
import { shortName } from '../players/names';
import { EntrySteps } from './EntrySteps';
import { StatusFields } from './StatusFields';
import { TurnHost } from './editors/TurnHost';
import { actLines } from './actLines';
import type { KernelView } from './kernelView';
import { agendaOf } from './editors/AdjustmentEditor';
import { HexRemove, RowIcon } from '../primitives/Icon';
import { systemTitle } from '../map/systemName';
import { flightOfTurn } from '../feedback/warningPlaces';
import { WarningList } from '../feedback/WarningText';
import { SectionTitle } from '../primitives/SectionTitle';
import { playerStyle } from '../primitives/player';

const PHASES: Phase[] = ['strategy', 'action', 'status', 'agenda'];

export interface EntryListProps {
  pack: DataPack;
  /** The table and the board just before an entry, as the kernel keeps them. */
  viewOf: (entryId: string) => KernelView;
  /** The number of the round of the open plan. */
  roundNo: number;
  /** The round as the kernel plays it: its turns are the rows. */
  turns: readonly Turn[];
  warnings: Record<string, Warning[]>;
  /** The table and the board at the end of the round, as the forecast has it: the points a status turn brings are added to them. */
  end: KernelView;
  /** The entry whose fields are shown. */
  openId: string | null;
  /** The pencil: opens the entry's editor. */
  onOpen: (entry: Turn) => void;
  /** The entry being read: its steps stand under its row. */
  shownId?: string | null;
  /** A tap on the row shows the entry, a second tap closes it. */
  onShow?: (entry: Turn) => void;
  /** The entry was just marked as done. */
  onDone?: (entry: Turn) => void;
  /** The status entry was added; it opens for its tokens and points. */
  onStatusAdded?: (id: string) => void;
  /** Adds an agenda that was resolved to the agenda phase and opens it. */
  onAddAgenda?: () => void;
  /** Stands in the strategy section in place of its title and line. */
  strategy?: ReactNode;
  /** The add button of the action section, kept in view while its list is long. */
  addAction?: ReactNode;
}

const cardName = (view: KernelView, card: number | undefined): string | undefined =>
  strategyCards(view.table.expansions).find(c => c.initiative === card)?.name;

/** A turn of a rival says whose it is before what it is. */
function entryLabel(turn: Turn, view: KernelView, pack: DataPack, t: (key: string) => string): string {
  const faction = turn.player === view.table.viewer ? '' : view.table.players.find(p => p.id === turn.player)?.faction ?? '';
  const name = bareLabel(turn, view, pack, t);
  return pack.factions[faction] ? `${shortName(pack, faction, '')}: ${name}` : name;
}

function bareLabel(turn: Turn, view: KernelView, pack: DataPack, t: (key: string) => string): string {
  const action = turn.action;
  const map = mapSource(view.table, view.board);
  switch (action.kind) {
    case 'tactical':
      return `${action.free ? `${cardName(view, CARD.warfare)}: ` : ''}${t('plan.menu.tactical')} · ${action.system === null ? t('plan.entries.noSystem') : systemTitle(map, pack, action.system, t)}`;
    case 'strategic':
    case 'secondary': {
      const name = cardName(view, action.card);
      return `${t(`plan.entries.${action.kind}`)}${name ? `: ${name}` : ''}${action.kind === 'strategic' && action.forToken ? ` · ${t('plan.entries.forToken')}` : ''}`;
    }
    case 'agenda':
      // In the agenda phase the entry is the agenda that was resolved.
      return [t('plan.agenda.title'), agendaOf(turn, pack)?.name ?? action.label].filter(Boolean).join(': ');
    case 'correction':
      if (action.purpose) return `${t(`plan.entries.kind.${action.purpose}`)} · ${systemTitle(map, pack, action.delta.units?.systemId ?? '', t)}`;
      return action.label ? `${t('plan.menu.adjustment')}: ${action.label}` : t('plan.menu.adjustment');
    case 'component':
      // The component it plays names the entry, so that several actions of a round can be told apart; the note comes second.
      return [t('plan.menu.component'), (action.component ? componentById(pack, action.component)?.name : undefined) ?? action.note].filter(Boolean).join(': ');
    case 'status':
      return t('plan.entries.statusTokens');
    default:
      return t(`plan.menu.${action.kind}`);
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
  pack, viewOf, roundNo, turns, warnings, end, openId, onOpen, shownId = null, onShow, onDone, onStatusAdded, onAddAgenda, strategy, addAction,
}: EntryListProps) {
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement>(null);
  // An entry removed mid-drag (undo, another tab) ends the drag. Entries move within their phase.
  const drag = useReorderDrag({
    axis: 'y',
    element: id => listRef.current?.querySelector(`[data-entry-id="${id}"]`),
    siblings: id => {
      const phase = turns.find(e => e.id === id)?.phase ?? 'action';
      return turns.filter(e => (e.phase ?? 'action') === phase).map(e => e.id);
    },
    exists: id => turns.some(e => e.id === id),
    onDrop: (id, toIndex) => {
      const found = turns.find(e => e.id === id);
      if (found) moveTurn(id, found.phase ?? 'action', toIndex);
    },
  });
  const numbers = turnNumbers(turns);

  return (
    <div className="plan-entries" ref={listRef}>
      {PHASES.map(phase => {
        // Warfare's free tactical action is drawn inside its card's row: it is no turn of its own.
        const inPhase = turns.filter(turn => (turn.phase ?? 'action') === phase);
        return (
          <section key={phase} className="phase" aria-label={t(`plan.phases.${phase}`)}>
            {phase === 'strategy' && strategy ? strategy : <SectionTitle as="h4" className="phase-title">{t(`plan.phases.${phase}`)}</SectionTitle>}
            {inPhase.length === 0 && !(phase === 'strategy' && strategy) && <p className="muted phase-auto">{t(`plan.phases.${phase}Empty`)}</p>}
            <ul className="entry-list">
              {inPhase.map(entry => {
                const view = viewOf(entry.id);
                const label = entryLabel(entry, view, pack, t);
                // The round has one status entry, so there is nothing to move it past.
                const movable = entry.action.kind !== 'status';
                const rival = entry.player === view.table.viewer ? undefined : view.table.players.find(p => p.id === entry.player);
                // A card speaks for Warfare's free action too: its warnings mark the card's row.
                const free = entry.action.kind === 'strategic' ? entry.action.nested?.[0] : undefined;
                const list = [...(warnings[entry.id] ?? []), ...(free ? warnings[free.id] ?? [] : [])];
                // The card's row carries the number of its free action, as the arrow of that action does on the map.
                const number = numbers[entry.id] ?? (free ? numbers[free.id] : undefined);
                const shown = entry.id === shownId;
                // The steps of a shown action say what goes wrong with a flight by that flight; the row keeps the rest.
                const inSteps = (w: Warning) => flightOfTurn(w, view.table, view.board, pack, entry) !== undefined;
                // Open fields show the warnings in their own blocks; otherwise the row says it stands for them.
                const fieldsOpen = entry.id === openId && entry.action.kind === 'status';
                const cls = ['entry', shown && 'entry-shown', entry.status === 'done' && 'entry-done', standing(list).length > 0 && 'entry-warned', rival && 'entry-rival', drag.draggingId === entry.id && 'entry-dragging'].filter(Boolean).join(' ');
                return (
                  <li key={entry.id} className={cls} style={rival ? { ...drag.styleOf(entry.id), ...playerStyle('--owner', rival.color) } : drag.styleOf(entry.id)} data-entry-id={entry.id} aria-label={label}>
                    <div className="entry-main">
                      {movable && <button type="button" className="entry-handle" aria-label={t('plan.entries.drag')} {...drag.handlers(entry.id)}><RowIcon name="grip" /></button>}
                      {/* The number is part of the name: one button, one background under the pointer. */}
                      <button type="button" className="entry-label" aria-label={label} aria-expanded={entry.action.kind === 'pass' ? undefined : shown} onClick={() => onShow?.(entry)}>
                        {number !== undefined && <OrderHex number={number} label={t('plan.entries.number', { n: number })} />}
                        <span className="entry-name">
                          <span className="entry-title">{label}</span>
                          {/* What the turn holds beside its action, each a line of its own. */}
                          {actLines(entry, view, pack, t).map(line => <small key={line} className="entry-brief entry-act">{line}</small>)}
                        </span>
                      </button>
                      <button type="button" className="icon-button" aria-label={t('plan.entries.edit', { name: label })} onClick={() => onOpen(entry)}><RowIcon name="edit" /></button>
                      <label className="icon-button entry-check">
                        <span className="visually-hidden">{t('plan.entries.done')}</span>
                        <input
                          type="checkbox" checked={entry.status === 'done'}
                          onChange={e => {
                            setStatus(entry.id, e.target.checked ? 'done' : 'planned');
                            if (e.target.checked) onDone?.(entry);
                          }}
                        />
                        <RowIcon name="done" />
                      </label>
                      <HexRemove label={t('plan.entries.delete')} onClick={() => removeTurn(entry.id)} />
                    </div>
                    {!fieldsOpen && <WarningList variant="row" warnings={shown ? list.filter(w => !inSteps(w)) : list} table={view.table} board={view.board} pack={pack} />}
                    {shown && <EntrySteps turn={entry} pack={pack} view={view} warnings={list.filter(inSteps)} />}
                    {entry.id === openId && entry.action.kind === 'status' && (
                      <div className="entry-details">
                        <TurnHost entryId={entry.id} view={view} pack={pack}>
                          {({ turn, update }) => <StatusFields turn={turn} pack={pack} view={view} end={end} warnings={list} onChange={update} />}
                        </TurnHost>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            {phase === 'action' && addAction && <div className="phase-add">{addAction}</div>}
            {phase === 'status' && !inPhase.some(e => e.action.kind === 'status') && (
              <button type="button" onClick={() => onStatusAdded?.(addStatusTurn(roundNo))}>{t('plan.entries.statusTokens')}</button>
            )}
            {/* Each agenda of the phase is an entry of its own: the button stays for the next one. */}
            {phase === 'agenda' && onAddAgenda && <button type="button" onClick={onAddAgenda}>{t('plan.agenda.add')}</button>}
          </section>
        );
      })}
    </div>
  );
}
