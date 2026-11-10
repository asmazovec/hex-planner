import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadPack } from '../../data/loadPack';
import { emptySlots } from '../../domain/mapBuilder';
import { blockersOf } from '../../domain/movement';
import { newEntryBody, tacticalBody, tacticalOwner } from '../../domain/newEntry';
import { EXPEDITION_SLICES } from '../../domain/payment';
import { isOnMap, projectionAtRound, systemSlots } from '../../domain/project';
import { timelineOf } from '../../state/projection';
import { cardTargets } from '../../domain/replay/cards/targets';
import { pausedPath, tacticalNumbers, tapStep, type RouteDraft } from '../../domain/route';
import { focusRect } from '../map/geometry';
import { cardChange, withSystem } from '../../domain/strategy';
import { entrySystems, hasUnits, isUntouched, isValidSource, routeHint, sourceSystems, sourcesOf, tileSystems, viaOf, withRoute, withoutEmptySources, type TacticalEntry } from '../../domain/tactical';
import { sliceOwners, validThundersEdgeSlot } from '../../domain/thundersEdge';
import { holdingCount, holdingRounds, upgradesOf } from '../../domain/holdings';
import { entryUpgradeRounds } from '../../domain/unitStats';
import type { Act, AdjustmentKind, CardEffects, Entry, EntryBody } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { lastView } from '../common/preferences';
import { Drawer, DrawerTab } from '../overlays/Drawer';
import { HexMap } from '../map/HexMap';
import { HexStage, type StageMode } from '../map/stage/HexStage';
import { cardPurchases } from '../map/stage/purchases';
import { MapLegend } from '../drawers/MapLegend';
import { ThundersEdgePanel } from '../drawers/ThundersEdgePanel';
import { ComponentsPanel } from '../drawers/ComponentsPanel';
import { useArrowDrag } from '../map/useArrowDrag';
import type { ActionType } from '../plan/ActionMenu';
import { ActionMenu } from '../plan/ActionMenu';
import { gameAs, opponentsBySeat } from '../../domain/players';
import { playerName, shortName } from '../players/names';
import { AdjustmentEditor } from '../plan/editors/AdjustmentEditor';
import { ExpeditionEditor } from '../plan/editors/ExpeditionEditor';
import { TransactionStep } from '../plan/editors/TransactionStep';
import { TurnEditor } from '../plan/editors/TurnEditor';
import { GainsBlock } from '../plan/blocks/GainsBlock';
import { TurnActs } from '../plan/blocks/TurnActs';
import { flightWarnings, UnitPicker } from '../plan/editors/UnitPicker';
import { EditorFrame } from '../primitives/EditorFrame';
import { EntryList } from '../plan/EntryList';
import { PlanName, PlanTabs } from '../plan/PlanTabs';
import { PlayerList } from '../players/PlayerList';
import { StrategyCards } from '../plan/StrategyCards';
import { StrategyEditor } from '../plan/editors/StrategyEditor';
import { SummaryBar } from '../plan/SummaryBar';
import { systemName } from '../map/systemName';
import { playerColour } from '../units/sprites';
import { TacticalEditor } from '../plan/editors/TacticalEditor';
import { mapHighlights, planArrows, shownSystemsOf } from './plan/mapMarks';
import { adjustmentIn, backFrom, cardIn, choosesForTe, hintKey, IDLE, LIST, resolvePick, slotOf, START, tacticalIn, type PickState, type Slot } from './plan/pick';
import { useBoards } from './plan/useBoards';
import { useDrawers } from './plan/useDrawers';
import { useFlightLoop } from './plan/useFlightLoop';
import { PlayerChoice, PlayerDot, playerStyle, playerTag } from '../primitives/player';

/** A source with nothing chosen goes when the editor closes. Works on the store, for it runs on unmount too. */
function pruneEmptySources(entryId: string | undefined) {
  const { game, updateEntry } = useGame.getState();
  if (!game || !entryId) return;
  const found = game.plans.find(p => p.id === game.activePlanId)?.rounds.flatMap(r => r.entries).find(e => e.id === entryId);
  if (found?.type !== 'tactical') return;
  const kept = withoutEmptySources(game, loadPack(game.expansions), found.moves);
  if (kept.length !== found.moves.length) updateEntry(entryId, { moves: kept });
}

const STAGE_MODE: Record<AdjustmentKind, StageMode> = { setup: 'setup', losses: 'battle', build: 'build' };

export interface PlanScreenProps {
  /** Goes to the game screen, where the map is built. */
  onFinishMap?: () => void;
}

/** Map on the left, plan on the right, tabs and totals on top. */
export function PlanScreen({ onFinishMap }: PlanScreenProps) {
  const { t, i18n } = useTranslation();
  const game = useGame(s => s.game);
  const addEntry = useGame(s => s.addEntry);
  const updateEntry = useGame(s => s.updateEntry);
  const toggleIngress = useGame(s => s.toggleIngress);
  const setThundersEdge = useGame(s => s.setThundersEdge);
  const addRound = useGame(s => s.addRound);
  const removeEntry = useGame(s => s.removeEntry);
  const deleteRound = useGame(s => s.deleteRound);
  const deletePlan = useGame(s => s.deletePlan);
  const pack = useMemo(() => loadPack(game?.expansions ?? []), [game?.expansions]);

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
  const boards = useBoards(game, plan, pack);

  /** A finished route keeps the earlier ones: it adds its source, or gives a known source a new way. */
  const openRoute = ({ from, via }: RouteDraft) => {
    if (!game || !entry || !isOnMap(game, from)) return;
    const known = sourcesOf(game, pack, entry).includes(from);
    if (!known || viaOf(entry, from).join() !== via.join()) updateEntry(entry.id, { moves: withRoute(game, pack, entry.moves, from, via) });
    update(state => (state.panel.kind === 'tactical' ? { ...state, panel: { ...state.panel, pickerFrom: from }, next: IDLE } : state));
    setView('plan');
  };

  const arrow = useArrowDrag({
    activeSystem, onComplete: openRoute, onCancel: () => undefined, isSystem: slot => game !== null && isOnMap(game, slot),
    onPause: path => update(state => ({ ...state, next: { kind: 'route', path: pausedPath(path, activeSystem ?? '') } })),
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
  const now = projectionAtRound(timelineOf(game, plan, 'now', pack), round.number);
  const forecast = projectionAtRound(timelineOf(game, plan, 'forecast', pack), round.number);

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
  /** Whose action stands in an editor now; a new tactical action is the card's owner's or the one it is added for. */
  const handOwner = picking ? tacticalOwner(round, tactical?.fromCard, actor) : (entry ?? cardEntry ?? adjustmentEntry)?.owner;

  const onPick = (type: ActionType) => {
    flight.stop();
    if (type === 'tactical') {
      drawers.closeRight();
      update(state => ({ ...state, panel: { kind: 'tactical', entryId: null, pickerFrom: null }, next: IDLE }));
      setView('map');
      return;
    }
    const id = addEntry(round.number, newEntryBody(type, round, game.playerCount, actor), 'action', actor);
    if (type === 'strategic') {
      drawers.closeTe();
      update(state => ({ ...state, panel: { kind: 'card', entryId: id }, next: IDLE }));
      setView('plan');
    } else if (type === 'adjustment') {
      update(state => ({ ...state, panel: { kind: type, entryId: id }, next: IDLE }));
    } else {
      update(state => ({ ...state, panel: LIST, next: IDLE, openId: id }));
    }
  };

  const owners = sliceOwners(game, plan);
  const suitable = (slot: string): boolean => validThundersEdgeSlot(game, slot, pack);

  /** A tap on the map does what the state chooses it for; with nothing to choose, what the panel does by default. */
  const onTileTap = (slot: string) => {
    const onMap = isOnMap(game, slot);
    switch (next.kind) {
      case 'adjustmentSystem':
        if (!adjustPick || !onMap) return;
        updateEntry(adjustPick.id, { delta: { ...adjustPick.delta, units: { systemId: slot, units: adjustPick.delta.units?.units ?? {} } } });
        update(state => ({ ...state, next: IDLE, stage: { slot, mode: 'setup', only: 'units', for: { kind: 'adjustment', id: adjustPick.id } } }));
        setView('plan');
        return;
      case 'card': {
        if (!cardEntry || !onMap) return;
        const target = next.pick;
        if (target !== 'dock') updateEntry(cardEntry.id, { effects: withSystem(cardEntry, slot, game.expansions) });
        update(state => ({
          ...state, next: IDLE,
          stage: target === 'system' ? state.stage : { slot, mode: 'build', only: target === 'build' ? 'build' : 'units', for: { kind: 'card' } },
        }));
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
      if (!onMap) return;
      if (tactical.entryId === null) {
        const id = addEntry(round.number, tacticalBody(slot, tactical.fromCard), 'action', handOwner);
        update(state => ({ ...state, panel: { kind: 'tactical', entryId: id, pickerFrom: null, card: tactical.card }, next: IDLE }));
        setView('plan');
        return;
      }
      if (!entry) return;
      if (next.kind === 'choose') {
        update(state => ({ ...state, next: next.what === 'source' && slot !== entry.systemId ? { kind: 'route', path: [slot] } : IDLE }));
        if (slot === entry.systemId) return;
        if (next.what === 'system') {
          updateEntry(entry.id, { systemId: slot });
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
        if (isUntouched(entry)) {
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
    if (!onMap) return;
    flight.stop();
    update(state => ({ ...state, panel: state.panel.kind === 'list' ? LIST : state.panel, stage: { slot, mode: 'control', for: { kind: 'map' } } }));
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
    if (opening && entrySystems(game, pack, tapped).length === 0) setViewResets(n => n + 1);
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
  const shownState = shownFilter === 'forecast' ? forecast.state : now.state;
  // A type an entry upgrades cannot be toggled by hand, even if the baseline holds it too: a tap would change nothing.
  const planSoFar = { ...plan, rounds: plan.rounds.filter(r => r.number <= round.number) };
  const lockedUpgrades = entryUpgradeRounds(planSoFar, shownFilter, pack);
  const holdingSources = holdingRounds(planSoFar, shownFilter);
  const shownUpgrades = upgradesOf(shownState.holdings, pack);
  const rivalUpgraded = Object.fromEntries(Object.entries(shownState.rivals ?? {}).map(([id, rival]) => [id, upgradesOf(rival.holdings, pack)]));
  const heldCount = holdingCount(shownState.holdings);
  const tacticals = round.entries.filter((e): e is Entry & TacticalEntry => e.type === 'tactical');
  /** The action the map speaks of: the one being edited or read. */
  const focusId = entry?.id ?? shownEntry?.id ?? flight.flying?.entryId;
  const arrows = planArrows(game, pack, tacticals, tacticalNumbers(round.entries), focusId, tactical !== null || mapMode !== 'now');

  /** The action in hand, as its owner plays it. */
  const entryGame = gameAs(game, entry?.owner);
  const entryBefore = entry ? boards.before(entry.id) : undefined;
  const draft = tactical && entry ? arrow.preview ?? (tapPath && { path: tapPath }) : null;
  // The route under way: how far the fastest ship of its source still flies from the last hex. Other players' ships
  // stand as the plan has them just before this action, mine among them for an opponent's.
  const route = draft && entry && entryBefore && !arrow.preview?.reverse
    ? routeHint(entryGame, draft.path, entryBefore, activeSystem, pack, () => {
      const board = boards.board(entry.id);
      return blockersOf(game, board, entry.owner && board.rivals?.[entry.owner] ? entry.owner : undefined, pack);
    })
    : null;
  // A source without ships has no speed to compare, and the distance is still worth saying.
  const speedNote = !route ? null
    : route.speed !== null ? t('plan.tactical.speedHint', { speed: route.speed, steps: route.steps, left: route.left })
    : route.steps > 0 ? t('plan.tactical.distance', { n: route.steps }) : null;

  const cardBefore = cardEntry ? boards.before(cardEntry.id) : undefined;
  const cardGame = gameAs(game, cardEntry?.owner);
  const highlights = mapHighlights(game, pack, {
    choice: cardPick && cardEntry && cardBefore ? cardTargets(game, pack, cardEntry, cardPick, cardBefore, forecast.state)
      : adjustPick ? tileSystems(game, pack)
        : next.kind === 'placeTe' ? systemSlots(game).filter(suitable) : [],
    shownSystems: shownSystemsOf(game, pack, shownEntry),
    focused: tacticals.find(item => item.id === focusId),
    path: draft?.path ?? [],
    reach: route?.reach ?? [],
    // Any system can be chosen; for a source those with ships are the ones lit.
    options: !choosing || !entryBefore ? [] : choosing === 'system' ? tileSystems(game, pack) : sourceSystems(game, pack, entryBefore),
  });
  const { mapState, layer: flightLayer } = flight.scene(tacticals, shownState, arrows);
  const shownArea = shownEntry ? focusRect(entrySystems(game, pack, shownEntry)) : null;

  /** In the tactical editor a drag from the active system or a system with my units draws an arrow, a route under way goes on from its last hex; any other drag moves the map. */
  const startsArrow = (slot: string): boolean => {
    if (activeSystem === null || !entryBefore || choosing !== null) return false;
    if (tapPath !== null) return slot === tapPath.at(-1);
    if (slot === activeSystem) return true;
    return isValidSource(game, pack, entryBefore, slot);
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
  const toggleTe = () => {
    // While the panel stands aside for the map, the button brings it back.
    if (teChoosing) stopTeChoice();
    else toggleDrawer('te');
  };

  /** The opponent whose action stands in an editor now: the panel says so in their colour. */
  const inHand = game.opponents.find(o => o.id === handOwner);
  /** A card's purchases on the big hex change its effects, paid anew unless paid by hand. */
  const onCardEffects = (effects: CardEffects) => {
    if (cardEntry && cardBefore) updateEntry(cardEntry.id, cardChange(cardEntry, { effects }, cardBefore, cardGame.faction, pack, manualPayments.includes(cardEntry.id)));
  };
  const stageFor = stage?.for;

  /** Back to the list, or to the card a tactical action was opened from. */
  const toList = () => update(state => ({ ...state, panel: state.panel.kind === 'tactical' ? backFrom(state.panel) : LIST, next: IDLE }));
  /** The cross of an editor's head: the entry goes and the panel returns. */
  const removeEdited = (id: string) => {
    removeEntry(id);
    toList();
  };
  const toPicker = (source: string | null) => update(state => (state.panel.kind === 'tactical' ? { ...state, panel: { ...state.panel, pickerFrom: source } } : state));

  /** The acts of a turn entry, written back without an empty list. */
  const setActs = (entry: Entry, acts: Act[]) => updateEntry(entry.id, { acts: acts.length > 0 ? acts : undefined } as Partial<EntryBody>);
  /** «В этом ходу» of a turn: each act opens as a step of this editor, and Back returns here. */
  const turnActsOf = (entry: Entry) => (
    <>
      <TurnActs
        game={gameAs(game, entry.owner)} pack={pack} entry={entry} warnings={forecast.warningsByEntry[entry.id] ?? []} owners={owners}
        onChange={acts => setActs(entry, acts)}
        onOpen={index => update(state => ({ ...state, panel: { kind: 'act', entryId: entry.id, index, back: state.panel }, next: IDLE }))}
      />
      {/* What the turn gained and gave stands with what else it holds. */}
      <GainsBlock entry={entry} pack={pack} onChange={patch => updateEntry(entry.id, patch as Partial<EntryBody>)} />
    </>
  );

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
          <UnitPicker
            game={entryGame} pack={pack} before={boards.before(flown.id)} entry={flown} source={slot.source}
            warnings={flightWarnings(forecast.warningsByEntry[flown.id] ?? [], entryGame, pack, flown, slot.source)}
            onChange={moves => updateEntry(flown.id, { moves })} onClose={() => toPicker(null)}
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
          <TacticalEditor
            game={entryGame} pack={pack} entry={edited} before={boards.before(edited.id)} board={boards.board(edited.id)} table={game}
            warnings={forecast.warningsByEntry[edited.id] ?? []}
            manualPayment={manualPayment} choosing={choosing}
            onChoose={what => { update(state => ({ ...state, next: what ? { kind: 'choose', what } : IDLE })); if (what) { drawers.closeRight(); setView('map'); } }}
            onUpdate={patch => updateEntry(edited.id, patch)}
            onOpenPicker={toPicker}
            onManualPayment={open => toggleManualPayment(edited.id, open)}
            onOpenShop={() => { if (systemId !== null) update(state => ({ ...state, stage: { slot: systemId, mode: 'build', only: 'units', for: { kind: 'tactical', id: edited.id } } })); }}
            onOpenBattle={() => { if (systemId !== null) update(state => ({ ...state, stage: { slot: systemId, mode: 'battle', for: { kind: 'tactical', id: edited.id } } })); }}
            onOpenFleet={() => { if (systemId !== null) update(state => ({ ...state, stage: { slot: systemId, mode: 'fleet', for: { kind: 'tactical', id: edited.id } } })); }}
            onDone={leaveEditor}
            onRemove={() => removeEdited(edited.id)}
            turnActs={edited.fromCard ? undefined : turnActsOf(edited)}
          />
        );
      }
      case 'card': {
        const played = slot.entry;
        return (
          <StrategyEditor
            game={cardGame} pack={pack} round={round} entry={played} before={boards.before(played.id)}
            warnings={forecast.warningsByEntry[played.id] ?? []} manualPayment={manualPayments.includes(played.id)} picking={cardPick}
            onUpdate={patch => updateEntry(played.id, patch)}
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
            turnActs={turnActsOf(played)}
          />
        );
      }
      case 'adjustment': {
        const adjusted = slot.entry;
        return (
          <AdjustmentEditor
            key={adjusted.id} game={gameAs(game, adjusted.owner)} pack={pack} entry={adjusted} warnings={forecast.warningsByEntry[adjusted.id] ?? []}
            picking={adjustPick !== undefined}
            onPickSystem={() => { if (!adjustPick) drawers.closeRight(); update(state => ({ ...state, next: adjustPick ? IDLE : { kind: 'adjustmentSystem' } })); setView('map'); }}
            onOpenHex={at => update(state => ({ ...state, stage: { slot: at, mode: 'setup', only: 'units', for: { kind: 'adjustment', id: adjusted.id } } }))}
            onUpdate={patch => updateEntry(adjusted.id, patch)}
            onDone={toList}
            onRemove={() => removeEdited(adjusted.id)}
          />
        );
      }
      case 'turn': {
        const turn = slot.entry;
        return (
          <TurnEditor
            key={turn.id} entry={turn} game={gameAs(game, turn.owner)} pack={pack} board={boards.board(turn.id)} warnings={forecast.warningsByEntry[turn.id] ?? []} turnActs={turnActsOf(turn)}
            onNote={note => updateEntry(turn.id, { note })} onComponent={componentId => updateEntry(turn.id, { componentId })} onDone={toList} onRemove={() => removeEdited(turn.id)}
          />
        );
      }
      case 'act': {
        const { entry: host, index, act, back } = slot;
        const acts = 'acts' in host && host.acts ? host.acts : [];
        const backTo = () => update(state => ({ ...state, panel: back, next: IDLE }));
        const replace = (next: Act) => setActs(host, acts.map((a, i) => (i === index ? next : a)));
        const drop = () => { setActs(host, acts.filter((_, i) => i !== index)); backTo(); };
        const hostGame = gameAs(game, host.owner);
        const all = forecast.warningsByEntry[host.id] ?? [];
        if (act.kind === 'transaction') {
          return (
            <TransactionStep
              key={`${host.id}-${index}`} game={hostGame} pack={pack} act={act} owner={host.owner ?? 'me'}
              warnings={all.filter(w => w.step === 'transaction')} onChange={replace} onBack={backTo} onRemove={drop}
            />
          );
        }
        // Its own part is not counted against it.
        const { [act.sliceId ?? '']: own, ...othersOwners } = owners;
        void own;
        const paymentKey = `${host.id}#${index}`;
        return (
          <ExpeditionEditor
            key={paymentKey} game={hostGame} pack={pack} sliceId={act.sliceId} payment={act.payment}
            owners={act.sliceId && !game.expedition.slices[act.sliceId] ? othersOwners : owners} before={boards.before(host.id)}
            warnings={all.filter(w => w.step === 'expedition')}
            manualPayment={manualPayments.includes(paymentKey)} onManualPayment={open => toggleManualPayment(paymentKey, open)}
            onChange={patch => replace({ ...act, ...patch })}
            onDone={backTo}
            onRemove={drop}
          />
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
        <SummaryBar now={now.state} forecast={forecast.state} pack={pack} factOnly={shownFilter === 'now'} />
      </header>
      <div className="plan-body">
        <Drawer open={leftOpen} className={`drawer-left drawer-${leftDrawer}`} onDismiss={closeDrawer}>
          <div key={leftDrawer} className="drawer-swap">
            {leftDrawer === 'players'
              ? (
                <div className="players-panel">
                  <PlayerList
                    live={{ upgraded: shownUpgrades, rivalUpgraded, locked: lockedUpgrades, points: { me: shownState.vp, ...shownState.opponentVp } }}
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
            game={game} state={mapState} pack={pack} highlights={highlights} arrows={arrows}
            arrowPreview={draft} focusRect={shownArea} resetSignal={viewResets} onTileTap={onTileTap}
            overlay={flightLayer} still={flight.still} animateOnly={flight.animated}
            onTilePointerDown={(slot, e) => { if (startsArrow(slot)) arrow.onTilePointerDown(slot, e, tapPath ?? undefined); }} startsArrow={startsArrow}
          />
          {shownArea && <button type="button" className="map-home" onClick={closeShown}>{t('map.home')}</button>}
          {hint && (
            <div className="map-hint">
              <span role="status">{hint}</span>
              {teChoosing && <button type="button" onClick={toggleTe}>{t('thundersEdge.back')}</button>}
              {mapHint && onFinishMap && <button type="button" onClick={onFinishMap}>{t('plan.finishMap')}</button>}
            </div>
          )}
          <div className={`drawer-rail drawer-rail-right${rightOpen ? ' drawer-rail-open' : ''}`} role="group" aria-label={t('plan.drawers')}>
            <DrawerTab side="right" open={drawers.open === 'components'} onClick={toggleComponents}>
              {heldCount > 0 ? `${t('components.title')} · ${heldCount}` : t('components.title')}
            </DrawerTab>
            {hasTe && (
              <DrawerTab side="right" open={showTe} onClick={toggleTe} className={takenSlices === totalSlices && placedTe === null ? 'te-ready' : undefined}>
                {placedTe === null
                  ? t('thundersEdge.taken', { n: takenSlices, total: totalSlices })
                  : t('thundersEdge.placed', { system: systemName(game, pack, placedTe) })}
              </DrawerTab>
            )}
          </div>
          <Drawer open={rightOpen} className="drawer-under">
            <div key={rightDrawer} className="drawer-swap">
              {rightDrawer === 'components'
                ? <ComponentsPanel game={game} pack={pack} state={shownState} rounds={holdingSources} />
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
                  game={game} pack={pack} round={round}
                  stateBefore={id => boards.before(id)} warnings={forecast.warningsByEntry} state={forecast.state}
                  openId={openId} onOpen={onOpenEntry} shownId={shownEntry?.id ?? null} onShow={onShowEntry}
                  onStatusAdded={id => update(state => ({ ...state, openId: id }))}
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
          owner={stageFor.kind === 'card' ? cardEntry?.owner : undefined}
          onPurchase={stageFor.kind === 'card' && cardEntry && cardBefore ? cardPurchases(cardGame, pack, cardEntry, stage.slot, cardBefore, onCardEffects) : undefined}
          manualPayments={manualPayments}
          tacticalId={stageFor.kind === 'tactical' ? stageFor.id : undefined} adjustmentId={stageFor.kind === 'adjustment' ? stageFor.id : undefined}
          shownState={shownState} onClose={closeStage}
        />
      )}
      <div className="plan-switch" role="group" aria-label={t('plan.views')}>
        <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}>{t('plan.mobileMap')}</button>
        <button type="button" aria-pressed={view === 'plan'} onClick={() => setView('plan')}>{t('plan.mobilePlan')}</button>
      </div>
    </section>
  );
}
