import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { emptySlots } from '../../domain/mapBuilder';
import { EXPEDITION_SLICES } from '../../domain/payment';
import { isOnMap, systemSlots } from '../../domain/project';
import { shownOf } from '../../game/shelf';
import { warningsByTurn } from '../../game/rowWarnings';
import { boardAtRound, tacticalEntries, tacticalNumbers, timelineOf, turnOfEntry } from '../../state/projection';
import { cardTargetsOn } from '../../game/planQueries';
import { tacticalOwner } from '../../game/edit/new';
import { legacyKey, playerOfKey } from '../../game/keys';
import { pausedPath, tapStep, type RouteDraft } from '../../domain/route';
import { focusRect } from '../map/geometry';
import { placeOffMap } from '../map/offMapHomes';
import { hasUnits, type TacticalEntry } from '../../domain/tactical';
import { emptySources, isUntouched, sourcesOf, tacticalOf, viaOf, withRoute, withSystem as withActiveSystem, type At } from '../../game/edit/tactical';
import { atOf, sourceSystemsOn, systemsOfTurn, tileSystemsOn } from '../../game/edit/tacticalRead';
import { routeHintOn } from '../../game/flight';
import { blockersOf } from '../../game/space';
import { addTactical, addTurn, pruneEmptySources, writeTurn } from '../../state/turnBridge';
import type { Turn } from '../../game/actions';
import type { PlayerId } from '../../game/types';
import { sliceOwners, validThundersEdgeSlot } from '../../domain/thundersEdge';
import { emptyHoldings, groupCounts, holdingCount, holdingRounds, upgradesOf, type ComponentGroup } from '../../domain/holdings';
import { entryUpgradeRounds } from '../../domain/unitStats';
import type { AdjustmentKind, Entry } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { componentsTab, lastView } from '../common/preferences';
import { usePack } from '../common/usePack';
import { Drawer, DrawerTab } from '../overlays/Drawer';
import { HexMap } from '../map/HexMap';
import { HexStage, type StageMode } from '../map/stage/HexStage';
import { componentPurchases, turnPurchases } from '../map/stage/turnPurchases';
import { MapLegend } from '../drawers/MapLegend';
import { ThundersEdgePanel } from '../drawers/ThundersEdgePanel';
import { ComponentsPanel } from '../drawers/ComponentsPanel';
import { ComponentTabs } from '../drawers/ComponentTabs';
import type { MapPan } from '../map/edgePan';
import { useArrowDrag } from '../map/useArrowDrag';
import type { ActionType } from '../plan/ActionMenu';
import { ActionMenu } from '../plan/ActionMenu';
import { opponentsBySeat } from '../../domain/players';
import { playerName, shortName } from '../players/names';
import { AdjustmentEditor } from '../plan/editors/AdjustmentEditor';
import { ExpeditionEditor } from '../plan/editors/ExpeditionEditor';
import { TransactionStep } from '../plan/editors/TransactionStep';
import { TurnEditor } from '../plan/editors/TurnEditor';
import { TurnHost } from '../plan/editors/TurnHost';
import { withDeltaSystem, withoutAct, withUsesRepriced } from '../../game/edit/turn';
import { withChosenSystem } from '../../game/edit/strategic';
import { GainsBlock } from '../plan/blocks/GainsBlock';
import { UsesBlock } from '../plan/blocks/UsesBlock';
import { TurnActs } from '../plan/blocks/TurnActs';
import { UnitPickerHost } from '../plan/editors/UnitPickerHost';
import { EditorFrame } from '../primitives/EditorFrame';
import { EntryList } from '../plan/EntryList';
import { PlanName, PlanTabs } from '../plan/PlanTabs';
import { PlayerList } from '../players/PlayerList';
import { StrategyCards } from '../plan/StrategyCards';
import { StrategyEditorHost } from '../plan/editors/StrategyEditorHost';
import { SummaryBar } from '../plan/SummaryBar';
import { systemName } from '../map/systemName';
import { playerColour } from '../units/sprites';
import { playerOfEntry } from '../plan/kernelView';
import { TacticalEditorHost } from '../plan/editors/TacticalEditorHost';
import { mapHighlights, planArrows } from './plan/mapMarks';
import { adjustmentIn, backFrom, cardIn, choosesForTe, hintKey, IDLE, LIST, resolvePick, slotOf, START, tacticalIn, turnIn, type PickState, type Slot } from './plan/pick';
import { useBoards } from './plan/useBoards';
import { useDrawers } from './plan/useDrawers';
import { useFlightLoop } from './plan/useFlightLoop';
import { leaveKey, useLeavingSources } from './plan/useLeavingSources';
import { StepHints } from '../feedback/StepHints';
import { EditorPart } from '../primitives/EditorPart';
import { PlayerChoice, PlayerDot, playerStyle, playerTag } from '../primitives/player';

const STAGE_MODE: Record<AdjustmentKind, StageMode> = { setup: 'setup', losses: 'battle', build: 'build' };

export interface PlanScreenProps {
  /** Goes to the game screen, where the map is built. */
  onFinishMap?: () => void;
}

/** Map on the left, plan on the right, tabs and totals on top. */
export function PlanScreen({ onFinishMap }: PlanScreenProps) {
  const { t, i18n } = useTranslation();
  const game = useGame(s => s.game);
  const toggleIngress = useGame(s => s.toggleIngress);
  const setThundersEdge = useGame(s => s.setThundersEdge);
  const addRound = useGame(s => s.addRound);
  const removeEntry = useGame(s => s.removeEntry);
  const deleteRound = useGame(s => s.deleteRound);
  const deletePlan = useGame(s => s.deletePlan);
  const pack = usePack(game?.expansions);

  const [roundNo, setRoundNo] = useState<number | null>(() => (game ? lastView.read(game.id)?.round ?? null : null));
  useEffect(() => { if (game?.id) lastView.write(game.id, { round: roundNo }); }, [game?.id, roundNo]);
  const [mapMode, setMapMode] = useState<'forecast' | 'now'>('forecast');
  /** Counts the times an entry with no place on the map was opened: the camera goes to the whole map. */
  const [viewResets, setViewResets] = useState(0);
  const [manualPayments, setManualPayments] = useState<string[]>([]);
  const [view, setView] = useState<'map' | 'plan'>('map');
  /** The opponent whose expected actions are being added; null for my own. */
  const [actingAs, setActingAs] = useState<string | null>(null);
  /** What the panel holds, what the next tap on the map chooses and the big hex. */
  const [rawPick, setPick] = useState<PickState>(START);

  const plan = game?.plans.find(p => p.id === game.activePlanId);
  const round = plan?.rounds.find(r => r.number === roundNo) ?? plan?.rounds.at(-1);
  // Undo can remove the entry an editor holds: the state falls back as the round now has it.
  const pick = resolvePick(rawPick, round);
  const update = (change: (state: PickState) => PickState) => setPick(previous => change(resolvePick(previous, round)));
  const { panel, next, stage, openId } = pick;
  const tactical = panel.kind === 'tactical' ? panel : null;
  const entry = tacticalIn(round, tactical?.entryId);
  const picking = tactical?.entryId === null;
  const activeSystem = entry?.systemId ?? null;
  const cardEntry = panel.kind === 'card' ? cardIn(round, panel.entryId) : cardIn(round, tactical?.card);
  const cardPick = panel.kind === 'card' && next.kind === 'card' ? next.pick : null;
  const adjustmentEntry = panel.kind === 'adjustment' ? adjustmentIn(round, panel.entryId) : undefined;
  const adjustPick = next.kind === 'adjustmentSystem' ? adjustmentEntry : undefined;
  const tapPath = next.kind === 'route' ? next.path : null;
  const choosing = next.kind === 'choose' ? next.what : null;
  const shown = panel.kind === 'list' ? panel.shown : null;
  const shownEntry = round?.entries.find(e => e.id === shown?.id);
  // A tap in the plan panel away from the actions folds the open one back to its compact row.
  const unfolded = panel.kind === 'list' && (shown !== null || openId !== null);
  useEffect(() => {
    if (!unfolded) return undefined;
    // On the finished tap, not on the press: folding moves the layout, and a press that moved its target is no click.
    const away = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (!target?.closest('.plan-panel') || target.closest('.entry')) return;
      update(state => (state.panel.kind === 'list' ? { ...state, panel: LIST, openId: null } : state));
    };
    window.addEventListener('click', away, { capture: true });
    return () => window.removeEventListener('click', away, { capture: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `update` is a fresh closure each render over the same setter.
  }, [unfolded]);
  const hasTe = game?.expansions.includes('te') ?? false;
  const drawers = useDrawers(hasTe, choosesForTe(next));
  const [componentGroup, setComponentGroup] = useState(componentsTab.read);
  /** Whose components the drawer shows: an opponent's id, null for mine. */
  const [componentsOf, setComponentsOf] = useState<string | null>(null);
  const boards = useBoards(game, plan, pack);
  const leavers = useLeavingSources();

  /** An edit of the turn of an entry, written back through the bridge: the turn and the places of the board just before it. */
  const editTurn = (entryId: string, change: (turn: Turn, at: At) => Turn) => {
    if (!game) return;
    const view = boards.view(entryId);
    const write = writeTurn(view.table, game, entryId, pack);
    if (write) write.update(change(write.turn, atOf(view.table, view.board, pack)));
  };

  /** A finished route keeps the earlier ones: it adds its source, or gives a known source a new way. */
  const openRoute = ({ from, via }: RouteDraft) => {
    if (!game || !entry || !onBoard(from)) return;
    editTurn(entry.id, (turn, at) => {
      const known = sourcesOf(at, tacticalOf(turn)).includes(from);
      return !known || viaOf(tacticalOf(turn), from).join() !== via.join() ? withRoute(at, turn, from, via) : turn;
    });
    // A source drawn again while it was on its way out stays; the one whose flight step this route replaces goes if nothing was chosen there.
    leavers.keep(entry.id, from);
    if (tactical?.pickerFrom && tactical.pickerFrom !== from) leavers.leave(entry.id, tactical.pickerFrom);
    update(state => (state.panel.kind === 'tactical' ? { ...state, panel: { ...state.panel, pickerFrom: from }, next: IDLE } : state));
    setView('plan');
  };

  /** The map under a route being drawn: a finger near the edge of its area moves it. */
  const mapPan = useRef<MapPan>(null);
  const arrow = useArrowDrag({
    activeSystem, onComplete: openRoute, onCancel: () => undefined, isSystem: slot => game !== null && onBoard(slot),
    onPause: path => update(state => ({ ...state, next: { kind: 'route', path: pausedPath(path, activeSystem ?? '') } })),
    pan: mapPan,
  });

  const onPlayed = useCallback(() => setPick(state => (state.panel.kind === 'list' && state.panel.shown
    ? { ...state, panel: { ...state.panel, shown: { ...state.panel.shown, plays: state.panel.shown.plays + 1 } } } : state)), []);
  const flight = useFlightLoop({ game, plan, pack: pack, boards, shown, shownEntry, onPlayed });

  /** What the editor holds on leaving the screen, whichever way: the menu has no way to ask. */
  const editedId = useRef<string | undefined>(undefined);
  useEffect(() => { editedId.current = entry?.id; }, [entry?.id]);
  useEffect(() => () => pruneEmptySources(editedId.current), []);

  const closeStage = useCallback(() => setPick(state => ({ ...state, stage: null })), []);

  if (!game || !plan || !round) {
    return <section className="screen"><p className="muted">{t('plan.noGame')}</p></section>;
  }

  // Totals and map show the end of the chosen round: later rounds would ready planets and clear its tokens.
  const forecastKernel = timelineOf(game, plan, 'forecast', pack).kernel;
  const rowWarnings = warningsByTurn(forecastKernel);

  const closeShown = () => {
    update(state => (state.panel.kind === 'list' ? { ...state, panel: LIST } : state));
    flight.stop();
  };

  const leaveEditor = () => {
    pruneEmptySources(entry?.id);
    update(state => ({ ...state, panel: state.panel.kind === 'tactical' ? backFrom(state.panel) : state.panel, next: IDLE }));
  };

  /** Everything back to the list: editors, what the map chooses, the read entry and its flight. */
  const closePanels = () => {
    drawers.closeTe();
    flight.stop();
    pruneEmptySources(entry?.id);
    update(state => ({ ...state, panel: LIST, next: IDLE, openId: null }));
  };

  /** Who the next entry belongs to, while that opponent is still in the game. */
  const actor = game.opponents.some(o => o.id === actingAs) ? actingAs ?? undefined : undefined;
  const { table: planTable } = forecastKernel;
  const keyed = (key: string | undefined): PlayerId => (key === undefined ? undefined : playerOfKey(planTable, key)) ?? planTable.viewer;
  /** Whose action stands in an editor now; a new tactical action is the card's owner's or the one it is added for. */
  const handOwner: PlayerId | undefined = picking
    ? tacticalOwner(forecastKernel.rounds.find(r => r.number === round.number) ?? { number: round.number, strategyCard: null, backupCard: null, held: [], turns: [] }, tactical?.fromCard, keyed(actor))
    : keyed((entry ?? cardEntry ?? adjustmentEntry)?.owner);

  const onPick = (type: ActionType) => {
    flight.stop();
    if (type === 'tactical') {
      drawers.closeRight();
      update(state => ({ ...state, panel: { kind: 'tactical', entryId: null, pickerFrom: null }, next: IDLE }));
      setView('map');
      return;
    }
    const id = addTurn(planTable, round.number, type, actor);
    if (type === 'strategic') {
      drawers.closeTe();
      update(state => ({ ...state, panel: { kind: 'card', entryId: id }, next: IDLE }));
      setView('plan');
    } else if (type === 'adjustment') {
      update(state => ({ ...state, panel: { kind: type, entryId: id }, next: IDLE }));
    } else {
      // A component action and a pass open as every action does: what the turn holds is in the editor, not in the row.
      update(state => ({ ...state, panel: { kind: 'turn', entryId: id, fresh: true }, next: IDLE }));
    }
  };

  /** An agenda that was resolved: an entry of the agenda phase, opened to choose the card. */
  const onAddAgenda = () => {
    flight.stop();
    const id = addTurn(planTable, round.number, 'adjustment', undefined, 'agenda');
    update(state => ({ ...state, panel: { kind: 'adjustment', entryId: id }, next: IDLE }));
  };

  const owners = sliceOwners(game, plan);
  const suitable = (slot: string): boolean => validThundersEdgeSlot(game, slot, pack);

  /** A tap on the map does what the state chooses it for; with nothing to choose, what the panel does by default. */
  const onTileTap = (slot: string) => {
    const onMap = isOnMap(game, slot);
    switch (next.kind) {
      case 'adjustmentSystem':
        if (!adjustPick || !onBoard(slot)) return;
        editTurn(adjustPick.id, turn => withDeltaSystem(turn, slot));
        update(state => ({ ...state, next: IDLE, stage: { slot, mode: 'setup', only: 'units', for: { kind: 'adjustment', id: adjustPick.id } } }));
        setView('plan');
        return;
      case 'card': {
        if (!cardEntry || !onMap) return;
        const target = next.pick;
        if (target !== 'dock') editTurn(cardEntry.id, turn => withChosenSystem(planTable, turn, slot));
        update(state => ({
          ...state, next: IDLE,
          stage: target === 'system' ? state.stage : { slot, mode: 'build', only: target === 'build' ? 'build' : 'units', for: { kind: 'card' } },
        }));
        setView('plan');
        return;
      }
      case 'produce': {
        const turn = turnIn(round, panel.kind === 'turn' ? panel.entryId : undefined);
        if (!turn || !onMap) return;
        update(state => ({ ...state, next: IDLE, stage: { slot, mode: 'build', only: 'units', for: { kind: 'component', id: turn.id } } }));
        setView('plan');
        return;
      }
      case 'markIngress':
        toggleIngress(slot);
        return;
      case 'placeTe':
        if (suitable(slot)) {
          setThundersEdge(slot);
          update(state => ({ ...state, next: IDLE }));
        }
        return;
      default:
        break;
    }
    if (tactical) {
      if (!onBoard(slot)) return;
      if (tactical.entryId === null) {
        const id = addTactical(planTable, round.number, slot, handOwner === undefined || handOwner === planTable.viewer ? undefined : legacyKey(planTable, handOwner), tactical.fromCard);
        update(state => ({ ...state, panel: { kind: 'tactical', entryId: id, pickerFrom: null, card: tactical.card }, next: IDLE }));
        setView('plan');
        return;
      }
      if (!entry) return;
      if (next.kind === 'choose') {
        update(state => ({ ...state, next: next.what === 'source' && slot !== entry.systemId ? { kind: 'route', path: [slot] } : IDLE }));
        if (slot === entry.systemId) return;
        if (next.what === 'system') {
          editTurn(entry.id, turn => withActiveSystem(turn, slot));
          setView('plan');
        } else {
          // The source only starts the route: it is recorded when the route reaches the active system.
          update(state => (state.panel.kind === 'tactical' ? { ...state, panel: { ...state.panel, pickerFrom: null } } : state));
        }
        return;
      }
      const step = tapStep(tapPath, slot, entry.systemId ?? '');
      if (step.onActive) {
        // The wrong system: while nothing of the action is filled in a tap takes it back and returns to choosing.
        if (isUntouched(writeTurn(forecastKernel.table, game, entry.id, pack)!.turn)) {
          removeEntry(entry.id);
          update(state => ({
            ...state, next: IDLE,
            panel: { kind: 'tactical', entryId: null, pickerFrom: null, ...(entry.fromCard ? { fromCard: entry.fromCard } : {}), card: tactical.card },
          }));
        }
        return;
      }
      update(state => ({ ...state, next: step.path ? { kind: 'route', path: step.path } : IDLE }));
      if (step.route) openRoute(step.route);
      return;
    }
    if (!onBoard(slot)) return;
    flight.stop();
    update(state => ({ ...state, panel: state.panel.kind === 'list' ? LIST : state.panel, stage: { slot, mode: 'control', for: { kind: 'map' } } }));
  };

  /** The systems an entry touches, as the kernel reads its turn on the board just before it. */
  const systemsOf = (of: Entry) => {
    const at = boards.view(of.id);
    return systemsOfTurn(at.table, at.board, pack, turnOfEntry(at.table, of, pack));
  };
  const onShowEntry = (tapped: Entry) => {
    if (tapped.type === 'pass') return;
    flight.stop();
    // A second tap folds the row whole: the steps and the fields open in it (the status tokens, a note).
    const opening = shown?.id !== tapped.id && openId !== tapped.id;
    update(state => ({
      ...state,
      openId: state.openId === tapped.id ? null : state.openId,
      panel: { kind: 'list', shown: opening ? { id: tapped.id, plays: 0 } : null },
    }));
    if (opening && systemsOf(tapped).length === 0) setViewResets(n => n + 1);
  };

  const onOpenEntry = (opened: Entry) => {
    flight.stop();
    const opening = (state: PickState): PickState => ({ ...state, panel: state.panel.kind === 'list' ? LIST : state.panel, next: IDLE });
    if (opened.type === 'adjustment' && opened.kind && opened.delta.units) {
      const { systemId } = opened.delta.units;
      const mode = STAGE_MODE[opened.kind];
      update(state => ({ ...opening(state), stage: { slot: systemId, mode, for: { kind: 'map' } } }));
    } else if (opened.type === 'adjustment') {
      update(state => ({ ...opening(state), panel: { kind: 'adjustment', entryId: opened.id } }));
    } else if (opened.type === 'tactical') {
      drawers.closeRight();
      update(state => ({ ...opening(state), panel: { kind: 'tactical', entryId: opened.id, pickerFrom: null } }));
    } else if (opened.type === 'strategic' || opened.type === 'secondary') {
      drawers.closeTe();
      update(state => ({ ...opening(state), panel: { kind: 'card', entryId: opened.id } }));
    } else if (opened.type === 'component' || opened.type === 'pass') {
      update(state => ({ ...opening(state), panel: { kind: 'turn', entryId: opened.id } }));
    } else {
      update(state => ({ ...opening(state), openId: state.openId === opened.id ? null : opened.id }));
    }
  };

  const toggleManualPayment = (id: string, open: boolean) => setManualPayments(ids => (open ? [...ids, id] : ids.filter(other => other !== id)));

  const shownFilter = tactical || cardEntry || mapMode === 'forecast' ? 'forecast' : 'now';
  const shownLine = timelineOf(game, plan, shownFilter, pack);
  const shownTable = shownLine.kernel.table;
  const shownBoard = boardAtRound(shownLine, round.number);
  // A type an entry upgrades cannot be toggled by hand, even if the baseline holds it too: a tap would change nothing.
  const planSoFar = { ...plan, rounds: plan.rounds.filter(r => r.number <= round.number) };
  const lockedUpgrades = entryUpgradeRounds(planSoFar, shownFilter, pack);
  const holdingSources = holdingRounds(planSoFar, shownFilter);
  // What the players hold and have on the board, read from the board the map shows.
  const seen = shownOf(shownTable, shownBoard, pack);
  const shownUpgrades = upgradesOf(seen.players.me.shelf, pack);
  const structures = Object.fromEntries(Object.entries(seen.players).map(([id, p]) => [id, p.structures]));
  const rivalUpgraded = Object.fromEntries(Object.entries(seen.players).filter(([id]) => id !== 'me').map(([id, p]) => [id, upgradesOf(p.shelf, pack)]));
  const heldCount = holdingCount(seen.players.me.shelf);
  // Warfare's free action has its card's status: the card marked done turns its arrow done.
  const tacticals: (Entry & TacticalEntry)[] = tacticalEntries(game, round, pack);
  /** The action the map speaks of: the one being edited or read. */
  const focusId = entry?.id ?? shownEntry?.id ?? flight.flying?.entryId;
  // Lines and flights need to know where the off-map homes stand before the map draws them.
  const offMap = placeOffMap(shownTable, shownBoard, pack);
  /** A system ships can be in: a tile of the map or an off-map home beside it. */
  const onBoard = (slot: string): boolean => slot in offMap || isOnMap(game, slot);
  const arrows = planArrows(shownTable, shownBoard, pack, tacticals, tacticalNumbers(game, round, pack), focusId, tactical !== null || mapMode !== 'now', leavers.leaving);

  /** The action in hand, as its owner plays it. */
  const entryView = entry ? boards.view(entry.id) : undefined;
  const draft = tactical && entry ? arrow.preview ?? (tapPath && { path: tapPath }) : null;
  // The route under way: how far the fastest ship of its source still flies from the last hex. Other players' ships
  // stand as the plan has them just before this action, mine among them for an opponent's.
  const route = draft && entry && entryView && !arrow.preview?.reverse
    ? routeHintOn(entryView.table, entryView.board, pack, playerOfEntry(entryView, entry.owner), draft.path, activeSystem, () => blockersOf(entryView.table, entryView.board, playerOfEntry(entryView, entry.owner), pack))
    : null;
  // A route can start anywhere. Where no ships stand there is no speed to compare and no reach to light: the hint says
  // so, and the distance is still worth saying.
  const speedNote = !route ? null
    : route.speed !== null ? t('plan.tactical.speedHint', { speed: route.speed, steps: route.steps, left: route.left })
    : [t('plan.tactical.noShipsAtStart'), route.steps > 0 ? t('plan.tactical.distance', { n: route.steps }) : null].filter(Boolean).join(' ');

  const cardBefore = cardEntry ? boards.before(cardEntry.id) : undefined;
  /** What the big hex buys for a card goes into its turn through the kernel; the old state is read only for what the shop still shows of it. */
  const cardTarget = (entryId: string, slot: string, before: NonNullable<typeof cardBefore>) => {
    const view = boards.view(entryId);
    const write = writeTurn(view.table, game, entryId, pack);
    return write && turnPurchases(view, pack, write, slot, manualPayments.includes(entryId), { before, holdings: before.holdings });
  };
  /** What the big hex buys for a component action goes into its turn through the kernel too. */
  const componentTarget = (entryId: string, slot: string, before: NonNullable<typeof cardBefore>) => {
    const at = boards.view(entryId);
    const write = writeTurn(at.table, game, entryId, pack);
    return write && componentPurchases(at, pack, write, slot, manualPayments.includes(entryId), { before, holdings: before.holdings });
  };
  const highlights = mapHighlights(shownTable, shownBoard, pack, {
    choice: cardPick && cardEntry ? cardTargetsOn(shownTable, boards.boardOf(cardEntry.id), shownBoard, pack, playerOfEntry(boards.view(cardEntry.id), cardEntry.owner), cardEntry, cardPick)
      : adjustPick ? tileSystemsOn(shownTable, shownBoard, pack)
        : next.kind === 'placeTe' ? systemSlots(game).filter(suitable) : [],
    shownSystems: shownEntry && shownEntry.type !== 'tactical' ? systemsOf(shownEntry) : [],
    focused: tacticals.find(item => item.id === focusId),
    path: draft?.path ?? [],
    reach: route?.reach ?? [],
    // Any system can be chosen; for a source those with ships are the ones lit.
    options: !choosing || !entryView ? [] : choosing === 'system' ? tileSystemsOn(entryView.table, entryView.board, pack) : sourceSystemsOn(entryView.table, entryView.board, pack, playerOfEntry(entryView, entry?.owner)),
  });
  const { mapBoard, layer: flightLayer } = flight.scene(tacticals, shownBoard, arrows);
  const shownArea = shownEntry ? focusRect(systemsOf(shownEntry)) : null;

  /**
   * In the tactical editor a drag from any system of the map draws an arrow, with ships of mine there or without: nothing
   * is forbidden. A route under way goes on from its last hex only, and any other drag moves the map.
   */
  const startsArrow = (slot: string): boolean => {
    if (activeSystem === null || !entryView || choosing !== null) return false;
    if (tapPath !== null) return slot === tapPath.at(-1);
    return onBoard(slot);
  };

  const key = hintKey(pick);
  const choiceHint = key === 'plan.tactical.tapHint' ? [t(key), speedNote].filter(Boolean).join(' ')
    : key ? t(key) : speedNote;
  // The map is built on the game screen; an unfinished one says so while nothing else is asked of the map.
  const emptyCount = emptySlots(game, pack).length;
  const mapHint = !choiceHint && emptyCount > 0;
  const hint = mapHint ? t('plan.mapIncomplete', { count: emptyCount }) : choiceHint;
  const manualPayment = entry !== undefined && manualPayments.includes(entry.id);
  const totalSlices = EXPEDITION_SLICES.length;
  const takenSlices = Object.keys(owners).length;
  const placedTe = game.expedition.thundersEdgeSystem;
  const showTe = drawers.open === 'te';
  const teChoosing = choosesForTe(next);
  const { leftOpen, rightOpen, left: leftDrawer, right: rightDrawer, toggle: toggleDrawer, close: closeDrawer } = drawers;
  const stopTeChoice = () => update(state => (choosesForTe(state.next) ? { ...state, next: IDLE } : state));
  const toggleComponents = () => {
    stopTeChoice();
    toggleDrawer('components');
  };
  const componentsOpen = drawers.open === 'components';
  /** The stack opens on my components; a tab of the fan changes the group, and the tab of the open group folds the fan. */
  const openComponents = () => {
    setComponentsOf(null);
    toggleComponents();
  };
  const pickComponentGroup = (group: ComponentGroup) => {
    if (group === componentGroup) return toggleComponents();
    componentsTab.write(group);
    setComponentGroup(group);
  };
  const shownHoldings = (game.opponents.some(o => o.id === componentsOf) ? seen.players[componentsOf ?? '']?.shelf : seen.players.me.shelf) ?? emptyHoldings();
  const toggleTe = () => {
    // While the panel stands aside for the map, the button brings it back.
    if (teChoosing) stopTeChoice();
    else toggleDrawer('te');
  };

  /** The opponent whose action stands in an editor now: the panel says so in their colour. */
  const inHand = handOwner === undefined || handOwner === planTable.viewer ? undefined : planTable.players.find(p => p.id === handOwner);
  const stageFor = stage?.for;
  const stagedTurn = stageFor?.kind === 'component' ? turnIn(round, stageFor.id) : undefined;

  /** Back to the list, or to the card a tactical action was opened from. */
  const toList = () => update(state => ({ ...state, panel: state.panel.kind === 'tactical' ? backFrom(state.panel) : LIST, next: IDLE }));
  /** The cross of an editor's head: the entry goes and the panel returns. */
  const removeEdited = (id: string) => {
    removeEntry(id);
    toList();
  };
  const toPicker = (source: string | null) => update(state => (state.panel.kind === 'tactical' ? { ...state, panel: { ...state.panel, pickerFrom: source } } : state));
  /** Back from a flight step: a source with nothing chosen does not stay in the action, it leaves the editor as it returns. */
  const closePicker = (flown: TacticalEntry, source: string) => {
    toPicker(null);
    const view = boards.view(flown.id);
    const write = writeTurn(view.table, game, flown.id, pack);
    if (write && emptySources(atOf(view.table, view.board, pack), tacticalOf(write.turn)).includes(source)) leavers.leave(flown.id, source);
  };

  /**
   * The common part of every editor, the last one, under its own heading. A turn of the active player holds its acts,
   * each opening as a step of this editor with Back returning here, and what it took and discarded. A secondary is
   * played in another player's turn and a manual adjustment is no turn: a transaction is the active player's (94.1),
   * so theirs holds only what was taken and discarded.
   */
  const commonOf = (entry: Entry) => {
    const isTurn = entry.type === 'tactical' || entry.type === 'strategic' || entry.type === 'component' || entry.type === 'pass';
    const view = boards.view(entry.id);
    return (
      <EditorPart title={t(entry.type === 'adjustment' ? 'plan.acts.titleEntry' : 'plan.acts.title')}>
        <TurnHost entryId={entry.id} view={view} pack={pack}>
          {({ turn, update: change }) => (
            <>
              {isTurn && (
                <TurnActs
                  pack={pack} view={view} turn={turn} warnings={rowWarnings[entry.id] ?? []} owners={owners}
                  onChange={change}
                  // Back from a step returns to the editor as it stands, not as it was first opened.
                  onOpen={index => update(state => ({ ...state, panel: { kind: 'act', entryId: entry.id, index, back: state.panel.kind === 'turn' ? { kind: 'turn', entryId: entry.id } : state.panel }, next: IDLE }))}
                />
              )}
              {/* The reminders of the round: what its player holds ready that speaks of the round as a whole, stated in every turn. */}
              {isTurn && <StepHints pack={pack} table={view.table} board={view.board} step="round" players={[entry.owner ?? 'me']} />}
              {/* What the entry gained and gave stands with what else it holds. */}
              <GainsBlock turn={turn} pack={pack} view={view} onChange={change} />
              {/* What the entry used beside its action: what it allows is marked among the entry's warnings. */}
              <UsesBlock turn={turn} pack={pack} view={view} warnings={rowWarnings[entry.id] ?? []} onChange={next => change(withUsesRepriced(view.table, view.board, pack, turn, next, manualPayments.includes(entry.id)))} />
            </>
          )}
        </TurnHost>
      </EditorPart>
    );
  };

  /** The one slot of the panel: an editor, a step of one, or the choice of a system; the list stands there otherwise. */
  const editorIn = (slot: Exclude<Slot, { kind: 'list' }>) => {
    switch (slot.kind) {
      case 'pickSystem':
        return (
          <EditorFrame title={t('plan.tactical.title')} removeLabel={t('plan.tactical.cancel')} onRemove={toList}>
            <span className="muted">{t(slot.fromCard ? 'plan.tactical.freePickHint' : 'plan.tactical.pickHint')}</span>
          </EditorFrame>
        );
      case 'flight': {
        const flown = slot.entry;
        return (
          <UnitPickerHost
            entryId={flown.id} pack={pack} view={boards.view(flown.id)} source={slot.source}
            warnings={rowWarnings[flown.id] ?? []}
            onClose={() => closePicker(flown, slot.source)}
            onFly={() => {
              toPicker(null);
              flight.start(flown.id);
              setView('map');
            }}
          />
        );
      }
      case 'tactical': {
        const edited = slot.entry;
        const systemId = edited.systemId;
        return (
          <TacticalEditorHost
            entryId={edited.id} pack={pack} view={boards.view(edited.id)}
            warnings={rowWarnings[edited.id] ?? []}
            manualPayment={manualPayment} choosing={choosing}
            onChoose={what => { update(state => ({ ...state, next: what ? { kind: 'choose', what } : IDLE })); if (what) { drawers.closeRight(); setView('map'); } }}
            onOpenPicker={toPicker}
            leaving={sourcesOf(atOf(boards.view(edited.id).table, boards.view(edited.id).board, pack), tacticalOf(writeTurn(boards.view(edited.id).table, game, edited.id, pack)!.turn)).filter(source => leavers.leaving.includes(leaveKey(edited.id, source)))}
            onLeft={source => leavers.finish(edited.id, source)}
            onManualPayment={open => toggleManualPayment(edited.id, open)}
            onOpenShop={() => { if (systemId !== null) update(state => ({ ...state, stage: { slot: systemId, mode: 'build', only: 'units', for: { kind: 'tactical', id: edited.id } } })); }}
            onOpenBattle={() => { if (systemId !== null) update(state => ({ ...state, stage: { slot: systemId, mode: 'battle', for: { kind: 'tactical', id: edited.id } } })); }}
            onOpenFleet={() => { if (systemId !== null) update(state => ({ ...state, stage: { slot: systemId, mode: 'fleet', for: { kind: 'tactical', id: edited.id } } })); }}
            onDone={leaveEditor}
            onRemove={() => removeEdited(edited.id)}
            common={edited.fromCard ? undefined : commonOf(edited)}
          />
        );
      }
      case 'card': {
        const played = slot.entry;
        return (
          <StrategyEditorHost
            key={played.id} entryId={played.id} roundNumber={round.number} pack={pack} view={boards.view(played.id)}
            warnings={rowWarnings[played.id] ?? []} manualPayment={manualPayments.includes(played.id)} picking={cardPick}
            onManualPayment={open => toggleManualPayment(played.id, open)}
            onPick={target => { update(state => ({ ...state, next: target ? { kind: 'card', pick: target } : IDLE })); if (target) { drawers.closeRight(); setView('map'); } }}
            onOpenShop={(at, only) => update(state => ({ ...state, stage: { slot: at, mode: 'build', only, for: { kind: 'card' } } }))}
            onStartTactical={() => {
              drawers.closeRight();
              update(state => ({ ...state, panel: { kind: 'tactical', entryId: null, pickerFrom: null, fromCard: played.id, card: played.id }, next: IDLE }));
              setView('map');
            }}
            onOpenTactical={id => { drawers.closeRight(); update(state => ({ ...state, panel: { kind: 'tactical', entryId: id, pickerFrom: null, card: played.id }, next: IDLE })); }}
            onDone={toList}
            onRemove={() => removeEdited(played.id)}
            common={commonOf(played)}
          />
        );
      }
      case 'adjustment': {
        const adjusted = slot.entry;
        return (
          <TurnHost key={adjusted.id} entryId={adjusted.id} view={boards.view(adjusted.id)} pack={pack}>
            {({ turn, update: change }) => (
              <AdjustmentEditor
                pack={pack} view={boards.view(adjusted.id)} turn={turn} warnings={rowWarnings[adjusted.id] ?? []}
                picking={adjustPick !== undefined} common={commonOf(adjusted)}
                onPickSystem={() => { if (!adjustPick) drawers.closeRight(); update(state => ({ ...state, next: adjustPick ? IDLE : { kind: 'adjustmentSystem' } })); setView('map'); }}
                onOpenHex={at => update(state => ({ ...state, stage: { slot: at, mode: 'setup', only: 'units', for: { kind: 'adjustment', id: adjusted.id } } }))}
                onChange={change}
                onDone={toList}
                onRemove={() => removeEdited(adjusted.id)}
              />
            )}
          </TurnHost>
        );
      }
      case 'turn': {
        const turn = slot.entry;
        return (
          <TurnHost key={turn.id} entryId={turn.id} view={boards.view(turn.id)} pack={pack}>
            {({ turn: played, update: change }) => (
              <TurnEditor
                turn={played} pack={pack} view={boards.view(turn.id)} warnings={rowWarnings[turn.id] ?? []} common={commonOf(turn)} pickFirst={panel.kind === 'turn' && panel.fresh}
                onChange={change}
                production={{
                  picking: next.kind === 'produce',
                  onPick: () => { update(state => ({ ...state, next: state.next.kind === 'produce' ? IDLE : { kind: 'produce' } })); if (next.kind !== 'produce') { drawers.closeRight(); setView('map'); } },
                  onOpenShop: at => update(state => ({ ...state, stage: { slot: at, mode: 'build', only: 'units', for: { kind: 'component', id: turn.id } } })),
                  manual: manualPayments.includes(turn.id),
                  onManual: open => toggleManualPayment(turn.id, open),
                }}
                onDone={toList} onRemove={() => removeEdited(turn.id)}
              />
            )}
          </TurnHost>
        );
      }
      case 'act': {
        const { entry: host, index, act, back } = slot;
        const backTo = () => update(state => ({ ...state, panel: back, next: IDLE }));
        const all = rowWarnings[host.id] ?? [];
        const view = boards.view(host.id);
        const paymentKey = `${host.id}#${index}`;
        return (
          <TurnHost key={act.kind === 'transaction' ? `${host.id}-${index}` : paymentKey} entryId={host.id} view={view} pack={pack}>
            {({ turn, update: change }) => {
              const drop = () => { change(withoutAct(turn, index)); backTo(); };
              if (act.kind === 'transaction') {
                return (
                  <TransactionStep
                    pack={pack} view={view} turn={turn} index={index}
                    warnings={all.filter(w => w.step === 'transaction')} onChange={change} onBack={backTo} onRemove={drop}
                  />
                );
              }
              // Its own part is not counted against it.
              const { [act.sliceId ?? '']: own, ...othersOwners } = owners;
              void own;
              return (
                <ExpeditionEditor
                  pack={pack} view={view} turn={turn} index={index}
                  owners={act.sliceId && !game.expedition.slices[act.sliceId] ? othersOwners : owners}
                  warnings={all.filter(w => w.step === 'expedition')}
                  manualPayment={manualPayments.includes(paymentKey)} onManualPayment={open => toggleManualPayment(paymentKey, open)}
                  onChange={change}
                  onDone={backTo}
                  onRemove={drop}
                />
              );
            }}
          </TurnHost>
        );
      }
    }
  };
  const slot = slotOf(pick, round);

  return (
    <section className="plan-screen" data-view={view}>
      <header className="plan-header">
        <PlanTabs
          game={game} roundNo={round.number} onSelectPlan={closePanels}
          onSelectRound={number => { closePanels(); setRoundNo(number); }}
          onAddRound={() => {
            closePanels();
            addRound();
            setRoundNo(Math.max(...plan.rounds.map(r => r.number)) + 1);
          }}
          onDeleteRound={() => { closePanels(); deleteRound(round.number); }}
          onDeletePlan={() => { closePanels(); deletePlan(plan.id); setRoundNo(null); }}
          afterRounds={(
            <div className="map-mode" role="group" aria-label={t('plan.mapShows')}>
              {(['forecast', 'now'] as const).map(mode => (
                <button key={mode} type="button" aria-pressed={mapMode === mode} disabled={tactical !== null || cardEntry !== undefined} onClick={() => setMapMode(mode)}>
                  {t(`plan.${mode}`)}
                </button>
              ))}
            </div>
          )}
        />
        <SummaryBar table={shownTable} now={boardAtRound(timelineOf(game, plan, 'now', pack), round.number)} forecast={boardAtRound(timelineOf(game, plan, 'forecast', pack), round.number)} pack={pack} factOnly={shownFilter === 'now'} />
      </header>
      <div className="plan-body">
        <Drawer open={leftOpen} className={`drawer-left drawer-${leftDrawer}`} onDismiss={closeDrawer}>
          <div key={leftDrawer} className="drawer-swap">
            {leftDrawer === 'players'
              ? (
                <div className="players-panel">
                  <PlayerList
                    live={{ upgraded: shownUpgrades, rivalUpgraded, structures, locked: lockedUpgrades, points: Object.fromEntries(Object.entries(seen.players).map(([id, p]) => [id, p.vp])) }}
                  />
                </div>
              )
              : <MapLegend colour={playerColour(game.color)} pack={pack} />}
          </div>
        </Drawer>
        {/* Beside the map, not in it: it stands over the scrim and rides on the edge of its drawer. */}
        <div className={`drawer-rail drawer-rail-left${leftOpen ? ` drawer-rail-open-${leftDrawer}` : ''}`} role="group" aria-label={t('plan.drawers')}>
          <DrawerTab side="left" open={drawers.open === 'players'} onClick={() => toggleDrawer('players')}>{t('players.open')}</DrawerTab>
          <DrawerTab side="left" open={drawers.open === 'legend'} onClick={() => toggleDrawer('legend')}>{t('map.legend.tab')}</DrawerTab>
        </div>
        <div className="plan-map">
          <HexMap
            table={shownTable} board={mapBoard} pack={pack} highlights={highlights} arrows={arrows}
            arrowPreview={draft} focusRect={shownArea} resetSignal={viewResets} onTileTap={onTileTap}
            overlay={flightLayer} still={flight.still} quietAll={flight.quiet} animateOnly={flight.animated}
            onTilePointerDown={(slot, e) => { if (startsArrow(slot)) arrow.onTilePointerDown(slot, e, tapPath ?? undefined); }} startsArrow={startsArrow} panRef={mapPan}
          />
          {shownArea && <button type="button" className="map-home" onClick={closeShown}>{t('map.home')}</button>}
          {hint && (
            <div className="map-hint">
              <span role="status">{hint}</span>
              {teChoosing && <button type="button" onClick={toggleTe}>{t('thundersEdge.back')}</button>}
              {mapHint && onFinishMap && <button type="button" onClick={onFinishMap}>{t('plan.finishMap')}</button>}
            </div>
          )}
          {/* The fan of the components stays at the edge of the map, beside its sheet; the tab of Thunder's Edge rides on the edge of its own. */}
          <div className={`drawer-rail drawer-rail-right${rightOpen ? ' drawer-rail-open' : ''}`} role="group" aria-label={t('plan.drawers')}>
            <ComponentTabs
              open={componentsOpen} group={componentGroup} counts={groupCounts(shownHoldings, seen.laws)} total={heldCount}
              onOpen={openComponents} onGroup={pickComponentGroup}
            />
            {hasTe && (
              <DrawerTab side="right" open={showTe} aside={componentsOpen} onClick={toggleTe} className={takenSlices === totalSlices && placedTe === null ? 'te-ready' : undefined}>
                {placedTe === null
                  ? t('thundersEdge.taken', { n: takenSlices, total: totalSlices })
                  : t('thundersEdge.placed', { system: systemName(game, pack, placedTe) })}
              </DrawerTab>
            )}
          </div>
          <Drawer open={rightOpen} className="drawer-under">
            <div key={rightDrawer} className="drawer-swap">
              {rightDrawer === 'components'
                ? <ComponentsPanel game={game} pack={pack} table={shownTable} board={shownBoard} rounds={holdingSources} group={componentGroup} chosen={componentsOf} onChoose={setComponentsOf} />
                : (
                  <ThundersEdgePanel
                    game={game} pack={pack} owners={owners}
                    onPlace={() => update(state => ({ ...state, next: { kind: 'placeTe' } }))} onMark={() => update(state => ({ ...state, next: { kind: 'markIngress' } }))}
                  />
                )}
            </div>
          </Drawer>
        </div>
        <div className="plan-panel">
          <div className="plan-scroll">
            {inHand && (
              <div className="acting-as" style={playerStyle('--owner', inHand.color)}>
                <PlayerDot color={inHand.color} />
                {t('plan.actingFor', { name: playerName(pack, inHand.faction, inHand.seat, t) })}
              </div>
            )}
            {slot.kind !== 'list' ? editorIn(slot) : (
              <>
                <PlanName key={`${plan.id}:${plan.name}:${i18n.language}`} plan={plan} />
                <EntryList
                  pack={pack} viewOf={id => boards.view(id)} round={round} turns={forecastKernel.rounds.find(r => r.number === round.number)?.turns ?? []}
                  warnings={rowWarnings} end={{ table: forecastKernel.table, board: boardAtRound(timelineOf(game, plan, 'forecast', pack), round.number) }}
                  openId={openId} onOpen={onOpenEntry} shownId={shownEntry?.id ?? null} onShow={onShowEntry}
                  onStatusAdded={id => update(state => ({ ...state, openId: id }))} onAddAgenda={onAddAgenda}
                  onDone={done => { if (done.type === 'tactical' && done.moves.some(m => hasUnits(m.units))) flight.start(done.id, shownFilter); }}
                  strategy={<StrategyCards key={`${plan.id}:${round.number}`} expansions={game.expansions} playerCount={game.playerCount} round={round} />}
                  addAction={(
                    <ActionMenu
                      onPick={onPick}
                      lead={(
                        <PlayerChoice
                          label={t('plan.actingLabel')}
                          chosen={value => (value === null ? !actor : actor === value)} onPick={value => setActingAs(value)}
                          options={[
                            { value: null, label: t('plan.mine'), color: game.color },
                            ...opponentsBySeat(game).map(o => {
                              const name = shortName(pack, o.faction, t('players.player', { n: o.seat }));
                              return { value: o.id, label: name, color: o.color, tag: playerTag(name, Boolean(pack.factions[o.faction]), o.seat) };
                            }),
                          ]}
                        />
                      )}
                    />
                  )}
                />
              </>
            )}
          </div>
        </div>
      </div>
      {stage && stageFor && (
        <HexStage
          key={stage.slot} slot={stage.slot} roundNo={round.number} pack={pack} initialMode={stage.mode} only={stage.only}
          owner={stageFor.kind === 'card' ? cardEntry?.owner : stageFor.kind === 'component' ? stagedTurn?.owner : undefined}
          onPurchase={stageFor.kind === 'card' && cardEntry && cardBefore ? cardTarget(cardEntry.id, stage.slot, cardBefore)
            : stageFor.kind === 'component' && stagedTurn ? componentTarget(stagedTurn.id, stage.slot, boards.before(stagedTurn.id)) : undefined}
          manualPayments={manualPayments}
          tacticalId={stageFor.kind === 'tactical' ? stageFor.id : undefined} adjustmentId={stageFor.kind === 'adjustment' ? stageFor.id : undefined}
          shownBoard={shownBoard} onClose={closeStage}
        />
      )}
      <div className="plan-switch" role="group" aria-label={t('plan.views')}>
        <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}>{t('plan.mobileMap')}</button>
        <button type="button" aria-pressed={view === 'plan'} onClick={() => setView('plan')}>{t('plan.mobilePlan')}</button>
      </div>
    </section>
  );
}
