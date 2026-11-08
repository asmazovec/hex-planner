import { useCallback, useEffect, useMemo, useRef, useState , type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { loadPack } from '../../data/loadPack';
import { duplicateTiles, mapIsEmpty } from '../../domain/mapBuilder';
import { EXPEDITION_SLICES } from '../../domain/payment';
import { fleetSpeed, isOnMap, project, routeMove, routeReach, routeSteps, stateAfterEntry, stateBeforeEntry, systemPlanets, systemsAdjacent, systemSlots, tileIdOf } from '../../domain/project';
import { focusRect, pausedPath, routeShapes, tacticalNumbers, tapStep, type RouteDraft } from '../../domain/route';
import { MECATOL_PLANETS } from '../../domain/mecatol';
import { CARD, cardChange, plannedCard, withSystem, type CardEntry } from '../../domain/strategy';
import { validThundersEdgeSystem } from '../../domain/thundersEdge';
import { entryUpgradeRounds, hasLevelTwo, SHIP_KINDS } from '../../domain/unitStats';
import type { AdjustmentKind, Entry, EntryBody, Game, Plan } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { flightLoopOn } from '../common/flightLoop';
import { Drawer, DrawerTab } from '../map/Drawer';
import { FlightLayer } from '../map/FlightLayer';
import { HexMap, type Arrow } from '../map/HexMap';
import { HexStage, type StageMode } from '../map/HexStage';
import { MapBuilderPanel } from '../map/MapBuilderPanel';
import { MapLegend } from '../map/MapLegend';
import { MapStringImport } from '../map/MapStringImport';
import { ThundersEdgePanel } from '../map/ThundersEdgePanel';
import { UpgradesPanel } from '../map/UpgradesPanel';
import type { Highlight } from '../map/TileView';
import { useArrowDrag } from '../map/useArrowDrag';
// TODO(P2-412) #ws:ui-structure #type:arch #size:s #dep:P2-448 #preferences — reducedMotion берётся из жеста карты: импортировать из common/motion.ts
import { reducedMotion } from '../map/usePanZoom';
import type { ActionType } from '../plan/ActionMenu';
import { ActionMenu } from '../plan/ActionMenu';
import { gameAs, opponentsBySeat } from '../../domain/players';
import { factionShortName } from '../players/factionName';
import { AdjustmentEditor } from '../plan/AdjustmentEditor';
import { EntryList } from '../plan/EntryList';
// TODO(P2-410) #ws:ui-logic-to-domain #type:arch #size:s #thunders-edge — владельцы частей экспедиции берутся из виджета plan/: импортировать из domain/thundersEdge.ts после переноса sliceOwners
import { sliceOwners } from '../plan/ExpeditionWidget';
import { PlanTabs, planDisplayName } from '../plan/PlanTabs';
// TODO(P2-413) #ws:ui-structure #type:arch #size:s #dep:P2-471 #primitives — RowIcon из фичевой папки plan/: импортировать из primitives/
import { RowIcon } from '../plan/RowIcon';
import { PlayerList } from '../players/PlayerList';
import { StrategyCards } from '../plan/StrategyCards';
import { cardPurchases, StrategyEditor, type MapPick } from '../plan/StrategyEditor';
import { SummaryBar } from '../plan/SummaryBar';
import { arrowsOf, entrySystems, flies, flightRoutes, hasUnits, isUntouched, sourcePools, sourcesOf, stateInFlight, systemName, viaOf, withRoute, withoutEmptySources, type TacticalEntry } from '../plan/tactical';
import { playerColour } from '../units/sprites';
import { TacticalEditor } from '../plan/TacticalEditor';

/** How many rivals still fit on the line of whose action with their whole names. */
// TODO(P2-431) #ws:ui-structure #type:dup #size:s #dep:P2-456 #names — своё правило короткого имени (3 буквы) рядом с factionShortName: короткое имя из одного модуля имён
const FULL_NAMES_UP_TO = 3;
const SHORT_TAG = 3;

// TODO(P2-402) #ws:ui-plan-screen #type:doc #size:s — комментарий про Editing стоит над DrawerName: перенести к интерфейсу Editing
/** `entryId` is null while a new action waits for its system: the next tile tap creates the entry; `fromCard` makes that one Warfare's free action. */
type DrawerName = 'players' | 'legend' | 'upgrades' | 'te';

interface Editing { entryId: string | null; pickerFrom: string | null; fromCard?: string }

/** A flight under way: it ends when the game it started from changes. `passed` holds the moves already taken on board on the way; `filter` is the replay its map stands on. */
interface Flight { entryId: string; run: number; game: Game; passed: number[]; filter: 'now' | 'forecast' }

/** The pause before a shown action first flies, and between its flights. */
const LOOP_START_MS = 380;
const LOOP_PAUSE_MS = 750;

/** A source with nothing chosen goes when the editor closes. Works on the store, for it runs on unmount too. */
function pruneEmptySources(entryId: string | undefined) {
  const { game, updateEntry } = useGame.getState();
  if (!game || !entryId) return;
  const found = game.plans.find(p => p.id === game.activePlanId)?.rounds.flatMap(r => r.entries).find(e => e.id === entryId);
  if (found?.type !== 'tactical') return;
  const kept = withoutEmptySources(game, loadPack(game.expansions), found.moves);
  if (kept.length !== found.moves.length) updateEntry(entryId, { moves: kept });
}

const EMPTY_PAYMENT = { planets: [], tradeGoods: 0 };

const STAGE_MODE: Record<AdjustmentKind, StageMode> = { setup: 'setup', losses: 'battle', build: 'build' };

// TODO(P2-406) #ws:ui-logic-to-domain #type:arch #size:s #new-entry #duplicate-of-domain — тела новых записей собраны в экране (здесь и тактическое в onTileTap): фабрика domain/newEntry.ts по типу действия
const SIMPLE_BODIES: Record<Exclude<ActionType, 'tactical' | 'strategic'>, EntryBody> = {
  component: { type: 'component', note: '' },
  expedition: { type: 'expedition', sliceId: null, payment: EMPTY_PAYMENT },
  pass: { type: 'pass' },
  adjustment: { type: 'adjustment', label: '', delta: {} },
};

// TODO(P2-433) #ws:ui-structure #type:arch #size:s — поле имени плана живёт в экране: перенести к PlanTabs в plan/
function PlanName({ plan }: { plan: Plan }) {
  const { t } = useTranslation();
  const renamePlan = useGame(s => s.renamePlan);
  const shown = planDisplayName(plan.name, t);
  const [text, setText] = useState(shown);
  const commit = () => {
    if (text.trim() === '') {
      // The store falls back to the default name; the field must show a name again even if that changes nothing.
      renamePlan('');
      setText(shown);
    } else if (text !== shown) {
      renamePlan(text);
    }
  };
  return (
    <input
      type="text" aria-label={t('plan.name')} value={text} onChange={e => setText(e.target.value)} onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); }}
    />
  );
}

// TODO(P2-434) #ws:ui-structure #type:arch #size:s #tests — тест этого экрана лежит в plan/PlanScreen.test.tsx: перенести в screens/
/** Map on the left, plan on the right, tabs and totals on top. */
export function PlanScreen() {
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

  const [roundNo, setRoundNo] = useState<number | null>(null);
  const [mapMode, setMapMode] = useState<'forecast' | 'now'>('forecast');
  // TODO(P2-400) #ws:ui-plan-screen #type:arch #size:l #map-pick #state-machine — 13 состояний режима (editing, choosing, tapPath, mapPick, systemPickFor, placing, marking, sheet, stage, adjustmentId, cardId, openId, shown) допускают невозможные сочетания и сбрасываются вручную: один автомат mapPick, размеченное объединение «что выбирает следующее нажатие» + «что открыто на панели»
  const [sheet, setSheet] = useState<string | null>(null);
  // TODO(P2-401) #ws:ui-plan-screen #type:model #size:s #dep:P2-400 #map-pick — stage с флагами forCard/tacticalId/adjustmentId: размеченное объединение по тому, для кого открыт большой гекс, как часть автомата
  const [stage, setStage] = useState<{ slot: string; mode: StageMode; only?: 'build' | 'units'; forCard?: boolean; tacticalId?: string; adjustmentId?: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const [building, setBuilding] = useState(() => game !== null && mapIsEmpty(game, pack));
  const [editing, setEditing] = useState<Editing | null>(null);
  /** The route under way by taps. */
  const [tapPath, setTapPath] = useState<string[] | null>(null);
  /** What the next tap on the map chooses for the action being edited. */
  const [choosing, setChoosing] = useState<'system' | 'source' | null>(null);
  /** The entry being read, and how many of its flights have started. */
  const [shown, setShown] = useState<{ id: string; plays: number } | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  /** Counts the times an entry with no place on the map was opened: the camera goes to the whole map. */
  const [viewResets, setViewResets] = useState(0);
  const flightRuns = useRef(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [mapPick, setMapPick] = useState<MapPick | null>(null);
  /** The manual adjustment whose system the next tap on the map chooses. */
  const [systemPickFor, setSystemPickFor] = useState<string | null>(null);
  /** The manual adjustment whose menu stands in place of the list. */
  const [adjustmentId, setAdjustmentId] = useState<string | null>(null);
  const [manualPayments, setManualPayments] = useState<string[]>([]);
  const [view, setView] = useState<'map' | 'plan'>('map');
  const [placing, setPlacing] = useState(false);
  const [marking, setMarking] = useState(false);
  /** The opponent whose expected actions are being added; null for my own. */
  const [actingAs, setActingAs] = useState<string | null>(null);
  // TODO(P2-423) #ws:ui-plan-screen #type:arch #size:s #drawer — drawer, rightDrawer, leftDrawer, teOpen и их догон в рендере: хук useDrawers; «шторка уступает карте» при placing/marking — состояние автомата
  /** One drawer at a time. */
  const [drawer, setDrawer] = useState<DrawerName | null>(null);
  /** What the right drawer holds, kept while it slides away. */
  const [rightDrawer, setRightDrawer] = useState<'upgrades' | 'te'>('upgrades');
  const [leftDrawer, setLeftDrawer] = useState<'players' | 'legend'>('players');
  const showTe = drawer === 'te';
  const closeTe = () => setDrawer(open => (open === 'te' ? null : open));
  const toggleDrawer = (name: DrawerName) => setDrawer(open => (open === name ? null : name));

  const plan = game?.plans.find(p => p.id === game.activePlanId);
  const round = plan?.rounds.find(r => r.number === roundNo) ?? plan?.rounds.at(-1);
  const entry = editing?.entryId
    ? round?.entries.find((e): e is Entry & TacticalEntry => e.id === editing.entryId && e.type === 'tactical')
    : undefined;
  // Undo can remove the edited entry, which ends the editing.
  const session = editing && (entry || editing.entryId === null) ? editing : null;
  const picking = session?.entryId === null;
  const activeSystem = session ? entry?.systemId ?? null : null;
  // Undo can remove the card being played too, which ends its editor.
  const cardEntry = round?.entries.find((e): e is CardEntry => e.id === cardId && (e.type === 'strategic' || e.type === 'secondary'));
  const cardPick = cardEntry && !session ? mapPick : null;

  /** A finished route keeps the earlier ones: it adds its source, or gives a known source a new way. */
  const openRoute = ({ from, via }: RouteDraft) => {
    if (!game || !entry || !session || !isOnMap(game, from)) return;
    const known = sourcesOf(game, pack, entry).includes(from);
    if (!known || viaOf(entry, from).join() !== via.join()) updateEntry(entry.id, { moves: withRoute(game, pack, entry.moves, from, via) });
    setEditing({ ...session, pickerFrom: from });
    setTapPath(null);
    setView('plan');
  };

  const arrow = useArrowDrag({
    activeSystem, onComplete: openRoute, onCancel: () => undefined, isSystem: slot => game !== null && isOnMap(game, slot),
    onPause: path => setTapPath(pausedPath(path, activeSystem ?? '')),
  });

  const shownEntry = round?.entries.find(e => e.id === shown?.id);
  // TODO(P2-403) #ws:ui-plan-screen #type:arch #size:s #dep:P2-400 — сброс состояний через setState во время рендера (и ниже rightDrawer/leftDrawer): выводить из game в автомате, а не догонять
  // A change of the game, undo for one, ends what depended on it.
  if (flight && flight.game !== game) setFlight(null);
  if (shown && round && !shownEntry) setShown(null);
  if (tapPath && !entry) setTapPath(null);
  if (choosing && !entry) setChoosing(null);
  const flying = flight?.game === game ? flight : null;
  // Nothing to show in a flight, nothing to repeat: a move whose units are not at the source, for one.
  const loops = shownEntry?.type === 'tactical' && !reducedMotion() && game !== null && plan !== undefined && flies(pack, shownEntry, stateBeforeEntry(game, plan, shownEntry.id, pack));

  // TODO(P2-404) #ws:ui-plan-screen #type:arch #size:m #flight — перелёт и его повтор (startFlight, таймер повтора, loops, resting, inFlight, mapState) разбросаны по экрану: хук useFlightLoop, который отдаёт состояние карты и слой перелёта
  const startFlight = useCallback((entryId: string, filter: 'now' | 'forecast' = 'forecast') => {
    const current = useGame.getState().game;
    if (reducedMotion() || !current) return;
    flightRuns.current += 1;
    setFlight({ entryId, run: flightRuns.current, game: current, passed: [], filter });
  }, []);

  /** What the editor holds on leaving the screen, whichever way: the menu has no way to ask. */
  const editedId = useRef<string | undefined>(undefined);
  useEffect(() => { editedId.current = entry?.id; }, [entry?.id]);
  useEffect(() => () => pruneEmptySources(editedId.current), []);

  useEffect(() => {
    if (!shown || !loops || flying) return undefined;
    // With the loop turned off the details play the flight once.
    if (shown.plays > 0 && !flightLoopOn()) return undefined;
    const timer = setTimeout(() => {
      setShown(s => s && { ...s, plays: s.plays + 1 });
      startFlight(shown.id);
    }, shown.plays === 0 ? LOOP_START_MS : LOOP_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [shown, loops, flying, startFlight]);

  const closeDrawer = useCallback(() => setDrawer(null), []);
  const closeSheet = useCallback(() => setSheet(null), []);
  const closeStage = useCallback(() => setStage(null), []);

  if (!game || !plan || !round) {
    return <section className="screen"><p className="muted">{t('plan.noGame')}</p></section>;
  }

  // Totals and map show the end of the chosen round: later rounds would ready planets and clear its tokens.
  const upToRound = { ...plan, rounds: plan.rounds.filter(r => r.number <= round.number) };
  // TODO(P2-421) #ws:ui-plan-screen #type:arch #size:s #perf — stateBeforeEntry повторяет replay около 10 раз за рендер для одной записи (loops, routeSpeed, choosing, карты, startsArrow, редакторы, HexStage): считать один раз на запись в фокусе
  const now = project(game, upToRound, 'now', pack);
  const forecast = project(game, upToRound, 'forecast', pack);

  const closeShown = () => {
    setShown(null);
    setFlight(null);
  };

  const leaveEditor = () => {
    pruneEmptySources(entry?.id);
    setEditing(null);
    setTapPath(null);
    setChoosing(null);
  };

  // TODO(P2-408) #ws:ui-plan-screen #type:arch #size:s #dep:P2-400 — closePanels, onPick, onOpenEntry, toggleUpgrades сбрасывают по 3-11 флагов вручную, и наборы расходятся: один переход автомата «закрыть всё»
  const closePanels = () => {
    setSystemPickFor(null);
    setAdjustmentId(null);
    setPlacing(false);
    setMarking(false);
    closeTe();
    closeShown();
    leaveEditor();
    setSheet(null);
    setOpenId(null);
    setCardId(null);
    setMapPick(null);
  };

  /** Who the next entry belongs to, while that opponent is still in the game. */
  const actor = game.opponents.some(o => o.id === actingAs) ? actingAs ?? undefined : undefined;

  const onPick = (type: ActionType) => {
    setPlacing(false);
    setMarking(false);
    setTapPath(null);
    closeShown();
    if (type === 'tactical') {
      closeTe();
      setSheet(null);
      setBuilding(false);
      setEditing({ entryId: null, pickerFrom: null });
      setView('map');
      return;
    }
    if (type === 'strategic') {
      const card = actor ? undefined : plannedCard(round, game.playerCount);
      setCardId(addEntry(round.number, card === undefined ? { type } : { type, card }, 'action', actor));
      setMapPick(null);
      closeTe();
      setView('plan');
      return;
    }
    const id = addEntry(round.number, SIMPLE_BODIES[type], 'action', actor);
    if (type === 'adjustment') setAdjustmentId(id);
    else setOpenId(id);
  };

  const hasTe = game.expansions.includes('te');
  // Undo can remove the adjustment, which ends the choice.
  const adjustmentEntry = round.entries.find((e): e is Extract<Entry, { type: 'adjustment' }> => e.id === adjustmentId && e.type === 'adjustment');
  const adjustPick = round.entries.find((e): e is Extract<Entry, { type: 'adjustment' }> => e.id === systemPickFor && e.type === 'adjustment');
  const owners = sliceOwners(game, plan);
  // TODO(P2-409) #ws:ui-logic-to-domain #type:arch #size:s #thunders-edge #duplicate-of-domain — годность системы для Thunder's Edge по слоту решает экран: функция домена от game и слота (validThundersEdgeSystem берёт только тайл)
  const suitable = (slot: string): boolean => {
    const tile = isOnMap(game, slot) ? pack.tiles[tileIdOf(game, slot)] : undefined;
    return tile !== undefined && validThundersEdgeSystem(tile);
  };

  // TODO(P2-411) #ws:ui-plan-screen #type:arch #size:m #dep:P2-400 #map-pick — onTileTap из 8 веток с ранним return, их порядок и есть приоритет режимов: по обработчику на состояние автомата
  const onTileTap = (slot: string) => {
    if (adjustPick) {
      if (!isOnMap(game, slot)) return;
      updateEntry(adjustPick.id, { delta: { ...adjustPick.delta, units: { systemId: slot, units: adjustPick.delta.units?.units ?? {} } } });
      setSystemPickFor(null);
      setView('plan');
      setStage({ slot, mode: 'setup', only: 'units', adjustmentId: adjustPick.id });
      return;
    }
    if (cardPick && cardEntry) {
      if (!isOnMap(game, slot)) return;
      if (cardPick !== 'dock') updateEntry(cardEntry.id, { effects: withSystem(cardEntry, slot, game.expansions) });
      if (cardPick !== 'system') setStage({ slot, mode: 'build', only: cardPick === 'build' ? 'build' : 'units', forCard: true });
      setMapPick(null);
      setView('plan');
      return;
    }
    if (marking) {
      toggleIngress(slot);
      return;
    }
    if (placing) {
      if (suitable(slot)) {
        setThundersEdge(slot);
        setPlacing(false);
      }
      return;
    }
    if (picking) {
      if (!isOnMap(game, slot)) return;
      // TODO(P2-407) #ws:ui-logic-to-domain #type:dup #size:s #dep:P2-406 #new-entry — тело тактической записи и её владелец по fromCard собираются здесь: брать из domain/newEntry.ts
      const id = addEntry(round.number, {
        type: 'tactical', systemId: slot, moves: [], landings: [], production: {}, payment: EMPTY_PAYMENT,
        ...(session?.fromCard ? { free: true, fromCard: session.fromCard } : {}),
      }, 'action', session?.fromCard ? round.entries.find(e => e.id === session.fromCard)?.owner : actor);
      setEditing({ entryId: id, pickerFrom: null });
      setView('plan');
      return;
    }
    if (session && entry) {
      if (!isOnMap(game, slot)) return;
      if (choosing) {
        setChoosing(null);
        if (slot === entry.systemId) return;
        if (choosing === 'system') {
          updateEntry(entry.id, { systemId: slot });
          setView('plan');
        } else {
          // The source only starts the route: it is recorded when the route reaches the active system.
          setEditing({ ...session, pickerFrom: null });
          setTapPath([slot]);
        }
        return;
      }
      const step = tapStep(tapPath, slot, entry.systemId ?? '');
      if (step.onActive) {
        // The wrong system: while nothing of the action is filled in a tap takes it back and returns to choosing.
        if (isUntouched(entry)) {
          removeEntry(entry.id);
          setEditing({ entryId: null, pickerFrom: null, ...(entry.fromCard ? { fromCard: entry.fromCard } : {}) });
        }
        return;
      }
      setTapPath(step.path);
      if (step.route) openRoute(step.route);
      return;
    }
    if (!building && !isOnMap(game, slot)) return;
    // The Fracture's tiles are fixed: there is nothing to build there.
    if (building && game.fracture.tiles?.[slot]) return;
    closeShown();
    if (building) setSheet(slot);
    else setStage({ slot, mode: 'setup' });
  };

  const toggleBuilding = () => {
    closePanels();
    setImporting(false);
    setBuilding(!building);
  };

  const onShowEntry = (tapped: Entry) => {
    if (tapped.type === 'pass') return;
    setFlight(null);
    const opening = shown?.id !== tapped.id;
    setShown(opening ? { id: tapped.id, plays: 0 } : null);
    if (opening && entrySystems(game, pack, tapped).length === 0) setViewResets(n => n + 1);
  };

  const onOpenEntry = (opened: Entry) => {
    closeShown();
    setPlacing(false);
    setMarking(false);
    setSheet(null);
    if (opened.type === 'adjustment' && opened.kind && opened.delta.units) {
      setStage({ slot: opened.delta.units.systemId, mode: STAGE_MODE[opened.kind] });
    } else if (opened.type === 'adjustment') {
      setAdjustmentId(opened.id);
    } else if (opened.type === 'tactical') {
      closeTe();
      setEditing({ entryId: opened.id, pickerFrom: null });
    } else if (opened.type === 'strategic' || opened.type === 'secondary') {
      closeTe();
      setCardId(opened.id);
      setMapPick(null);
    } else {
      setOpenId(openId === opened.id ? null : opened.id);
    }
  };

  const shownFilter = session || cardEntry || mapMode === 'forecast' ? 'forecast' : 'now';
  const shownState = shownFilter === 'forecast' ? forecast.state : now.state;
  // A type an entry upgrades cannot be toggled by hand, even if the baseline holds it too: a tap would change nothing.
  const lockedUpgrades = entryUpgradeRounds(upToRound, shownFilter);
  const upgradeCount = SHIP_KINDS.filter(kind => shownState.upgrades.includes(kind) && hasLevelTwo(game.faction, kind, pack)).length;
  const tacticals = round.entries.filter((e): e is Entry & TacticalEntry => e.type === 'tactical');
  /** The action the map speaks of: the one being edited or read. */
  const focusId = entry?.id ?? shownEntry?.id ?? flying?.entryId;
  const numbers = tacticalNumbers(round.entries);
  // TODO(P2-414) #ws:ui-plan-screen #type:arch #size:s #dep:P2-415 — отбор и тон стрелок плана (фокус, выполнено, режим «сейчас») перемешаны с рендером: в хук карты вместе с подсветкой
  const drawn = tacticals.filter(item => item.status !== 'cancelled' && (item.id === focusId || item.status === 'done' || session || mapMode !== 'now'))
    .flatMap(item => arrowsOf(game, pack, item).map(a => ({
      ...a, key: `${item.id}:${a.from}`, number: numbers[item.id], player: game.opponents.find(o => o.id === item.owner)?.color, tone: item.id === focusId ? 'active' as const : item.status === 'done' ? 'done' as const : 'planned' as const,
    })));
  const shapes = routeShapes(drawn.map(a => [a.from, ...a.via, a.to]), systemsAdjacent(game));
  const arrows: Arrow[] = drawn.map((a, i) => ({ ...a, shape: shapes[i] }));

  /** The action in hand, as its owner plays it. */
  const entryGame = gameAs(game, entry?.owner);
  const draft = session && entry ? arrow.preview ?? (tapPath && { path: tapPath }) : null;
  // TODO(P2-415) #ws:ui-plan-screen #type:arch #size:m #highlight — подсветку пишут в один объект 8 мест экрана, приоритет задаёт порядок записи и проверки !highlights[slot]: хук useMapHighlights(режим) с явным приоритетом, правила из домена
  const highlights: Record<string, Highlight> = {};
  for (const slot of draft?.path ?? []) highlights[slot] = 'path';
  const focused = tacticals.find(item => item.id === focusId);
  if (focused?.systemId) {
    for (const source of sourcesOf(game, pack, focused)) {
      for (const slot of viaOf(focused, source)) highlights[slot] = 'path';
    }
    for (const source of sourcesOf(game, pack, focused)) highlights[source] = 'source';
    highlights[focused.systemId] = 'active';
  }

  // Any other entry being read lights the systems it speaks of: the camera alone does not say which ones.
  if (shownEntry && shownEntry.type !== 'tactical') {
    for (const slot of entrySystems(game, pack, shownEntry)) highlights[slot] = 'active';
  }

  // TODO(P2-405) #ws:ui-plan-screen #type:arch #size:s #dep:P2-404 #flight — состояние карты во время перелёта и между повторами считается посреди рендера: часть useFlightLoop
  const flyingEntry = flying ? tacticals.find(item => item.id === flying.entryId) : undefined;
  const beforeFlight = flying && flyingEntry ? stateBeforeEntry(game, plan, flyingEntry.id, pack, flying.filter) : null;
  const inFlight = flying && flyingEntry && beforeFlight ? stateInFlight(pack, flyingEntry, beforeFlight, flying.passed) : null;
  // Between the repeats the map stays right after the action: what comes later in the plan would blink in and out on every round.
  const resting = !flying && shown && shownEntry && loops && shown.plays > 0 && flightLoopOn() ? shownEntry : undefined;
  const heldState = inFlight ?? (resting ? stateAfterEntry(game, plan, resting.id, pack) : null);
  const heldOwner = (flyingEntry ?? resting)?.owner;
  const mapState = !heldState ? shownState
    : heldOwner ? { ...shownState, rivals: { ...shownState.rivals, [heldOwner]: heldState } } : heldState;
  const flyingGame = gameAs(game, flyingEntry?.owner);
  const shownArea = shownEntry ? focusRect(entrySystems(game, pack, shownEntry)) : null;

  if (placing) {
    for (const slot of systemSlots(game)) if (suitable(slot)) highlights[slot] = 'valid';
  }

  if (adjustPick) {
    for (const slot of systemSlots(game)) if (pack.tiles[tileIdOf(game, slot)]) highlights[slot] = 'valid';
  }

  // The route under way: how far the fastest ship of its source still flies from the last hex.
  // TODO(P2-419) #ws:ui-logic-to-domain #type:arch #size:s #route-hint — скорость, шаги и остаток хода считает экран, а IIFE ещё и пишет подсветку побочным эффектом: domain routeHint(draft, before) → {speed, steps, left, reach}
  const routeSpeed = (() => {
    if (!draft || !entry || arrow.preview?.reverse) return null;
    const before = stateBeforeEntry(game, plan, entry.id, pack);
    const fastest = fleetSpeed(entryGame, before.systems[draft.path[0]] ?? {}, before.upgrades, pack);
    const steps = routeSteps(game, draft.path, pack);
    if (fastest === null) return { speed: null, steps, left: null };
    const speed = routeMove(entryGame, draft.path, fastest, pack);
    if (activeSystem !== null) {
      // TODO(P2-420) #ws:rivals #type:bug #size:m #rule:58.3.2 #test:058-movement #rivals — досягаемость считается по gameAs и вручную расставленным game.enemyUnits: корабли, приведённые или уведённые соперниками по плану, не учтены, соперник не видит моих (B2); блокировки брать из состояния перед записью
      for (const slot of routeReach(entryGame, draft.path, fastest, activeSystem, pack)) if (!highlights[slot]) highlights[slot] = 'valid';
    }
    return { speed, steps, left: Math.max(0, speed - steps) };
  })();
  // A source without ships has no speed to compare, and the distance is still worth saying.
  const speedNote = !routeSpeed ? null
    : routeSpeed.speed !== null ? t('plan.tactical.speedHint', routeSpeed)
    : routeSpeed.steps > 0 ? t('plan.tactical.distance', { n: routeSpeed.steps }) : null;

  // Any system can be chosen; for a source those with ships are the ones lit.
  // TODO(P2-417) #ws:ui-logic-to-domain #type:dup #size:s #valid-sources — годный источник (система с доступными юнитами) считается здесь и в startsArrow одинаково: одна функция домена над состоянием перед записью
  if (choosing && entry) {
    const before = stateBeforeEntry(game, plan, entry.id, pack);
    for (const slot of systemSlots(game)) {
      const fits = choosing === 'system' ? Boolean(pack.tiles[tileIdOf(game, slot)]) : sourcePools(game, pack, before, slot).some(pool => hasUnits(pool.available));
      if (fits && !highlights[slot]) highlights[slot] = 'valid';
    }
  }

  // TODO(P2-416) #ws:ui-logic-to-domain #type:arch #size:m #rule:99 #rule:32 #rule:24 #card-targets #duplicate-of-domain — цели карт на карте (Warfare: системы с жетоном; Diplomacy без Mecatol; Construction без жетона до TE; база для dock) считает экран: domain/strategy.ts cardTargets(entry, состояние), здесь только раскраска
  if (cardPick && cardEntry) {
    const primaryCard = (card: number) => cardEntry.type === 'strategic' && cardEntry.card === card;
    if (primaryCard(CARD.warfare)) {
      for (const slot of stateBeforeEntry(game, plan, cardEntry.id, pack).tokensOnMap) if (isOnMap(game, slot)) highlights[slot] = 'valid';
    } else {
      const fits = (planetId: string) => (cardPick === 'dock' ? forecast.state.docks.includes(planetId) : forecast.state.control[planetId] === 'me');
      const excluded = primaryCard(CARD.diplomacy) ? MECATOL_PLANETS : [];
      // Construction's secondary leaves its token there before Thunder's Edge: any system can be tapped, those without one are lit.
      const placesToken = cardEntry.type === 'secondary' && cardEntry.card === CARD.construction && !hasTe;
      const tokened = placesToken ? stateBeforeEntry(game, plan, cardEntry.id, pack).tokensOnMap : [];
      for (const slot of systemSlots(game)) {
        const planets = systemPlanets(game, slot, pack);
        if (planets.some(p => fits(p.id)) && !planets.some(p => excluded.includes(p.id)) && !tokened.includes(slot)) highlights[slot] = 'valid';
      }
    }
  }

  /** In the tactical editor a drag from the active system or a system with my units draws an arrow, a route under way goes on from its last hex; any other drag moves the map. */
  // TODO(P2-418) #ws:ui-logic-to-domain #type:dup #size:s #dep:P2-417 #valid-sources — та же проверка годного источника, что в подсветке выбора: взять функцию домена
  const startsArrow = (slot: string): boolean => {
    if (activeSystem === null || !entry || choosing !== null) return false;
    if (tapPath !== null) return slot === tapPath.at(-1);
    if (slot === activeSystem) return true;
    return sourcePools(game, pack, stateBeforeEntry(game, plan, entry.id, pack), slot).some(pool => hasUnits(pool.available));
  };

  const duplicates = building ? duplicateTiles(game.map, pack) : [];
  // TODO(P2-422) #ws:ui-plan-screen #type:arch #size:s #dep:P2-400 #map-pick — цепочка тернарников подсказки повторяет приоритет режимов из onTileTap: подсказка как свойство состояния автомата
  const hint = cardPick || adjustPick ? t('plan.strategy.mapHint') : marking ? t('fracture.markHint') : placing ? t('expedition.placeHint')
    : picking ? t(session?.fromCard ? 'plan.tactical.freePickHint' : 'plan.tactical.pickHint')
    : choosing === 'system' ? t('plan.tactical.changeSystemHint') : choosing === 'source' ? t('plan.tactical.addSourceHint')
    : session && tapPath ? [t('plan.tactical.tapHint'), speedNote].filter(Boolean).join(' ')
    : speedNote ? speedNote
      : duplicates.length > 0 ? t('builder.duplicates', { list: duplicates.join(', ') }) : null;
  const manualPayment = entry !== undefined && manualPayments.includes(entry.id);
  const totalSlices = EXPEDITION_SLICES.length;
  const takenSlices = Object.keys(owners).length;
  const placedTe = game.expedition.thundersEdgeSystem;
  // The panel stands aside while the map chooses for it.
  const teOpen = hasTe && showTe && !placing && !marking;
  const rightOpen = drawer === 'upgrades' || teOpen;
  const rightNow = drawer === 'upgrades' ? 'upgrades' : teOpen ? 'te' : null;
  if (rightNow && rightNow !== rightDrawer) setRightDrawer(rightNow);
  const leftOpen = drawer === 'players' || drawer === 'legend';
  if ((drawer === 'players' || drawer === 'legend') && drawer !== leftDrawer) setLeftDrawer(drawer);
  const toggleUpgrades = () => {
    setPlacing(false);
    setMarking(false);
    toggleDrawer('upgrades');
  };
  const toggleTe = () => {
    // While the panel stands aside for the map, the button brings it back.
    if (placing || marking) {
      setPlacing(false);
      setMarking(false);
    } else {
      toggleDrawer('te');
    }
  };

  /** The opponent whose action stands in an editor now: the panel says so in their colour. */
  // TODO(P2-424) #ws:ui-plan-screen #type:dup #size:s #dep:P2-400 #rivals — владелец записи в руках ищется заново тем же поиском по fromCard, что в onTileTap: брать из состояния автомата
  const inHand = game.opponents.find(o => o.id === (picking ? (session?.fromCard ? round.entries.find(e => e.id === session.fromCard)?.owner : actor) : (entry ?? cardEntry ?? adjustmentEntry)?.owner));

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
          afterRounds={!building && (
            <div className="map-mode" role="group" aria-label={t('plan.mapShows')}>
              {(['forecast', 'now'] as const).map(mode => (
                <button key={mode} type="button" aria-pressed={mapMode === mode} disabled={session !== null || cardEntry !== undefined} onClick={() => setMapMode(mode)}>
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
                    live={{ upgraded: shownState.upgrades, locked: lockedUpgrades, points: { me: shownState.vp, ...shownState.opponentVp } }}
                  />
                </div>
              )
              : <MapLegend colour={playerColour(game.color)} pack={pack} />}
          </div>
        </Drawer>
        {/* Beside the map, not in it: it stands over the scrim and rides on the edge of its drawer. */}
        <div className={`drawer-rail drawer-rail-left${leftOpen ? ` drawer-rail-open-${leftDrawer}` : ''}`} role="group" aria-label={t('plan.drawers')}>
          <DrawerTab side="left" open={drawer === 'players'} onClick={() => toggleDrawer('players')}>{t('players.open')}</DrawerTab>
          <DrawerTab side="left" open={drawer === 'legend'} onClick={() => toggleDrawer('legend')}>{t('map.legend.tab')}</DrawerTab>
        </div>
        <div className="plan-map">
          <HexMap
            game={game} state={mapState} pack={pack} highlights={highlights} arrows={arrows}
            arrowPreview={draft} focusRect={shownArea} resetSignal={viewResets} selectedId={sheet} onTileTap={onTileTap}
            overlay={flying && flyingEntry && beforeFlight && (
              <FlightLayer
                key={flying.run} colour={playerColour(flyingGame.color)} passed={flying.passed}
                routes={flightRoutes(flyingGame, pack, flyingEntry, beforeFlight, from => arrows.find(a => a.key === `${flyingEntry.id}:${from}`)?.shape)}
                onPass={move => setFlight(f => f && { ...f, passed: [...f.passed, move] })}
                onDone={() => setFlight(null)}
              />
            )}
            onTilePointerDown={(slot, e) => { if (startsArrow(slot)) arrow.onTilePointerDown(slot, e, tapPath ?? undefined); }} startsArrow={startsArrow}
            onPopoverClose={closeSheet}
            tools={(
              <div className="map-tools">
                <button type="button" className="hex-button" aria-label={t('plan.buildMap')} title={t('plan.buildMap')} aria-pressed={building} onClick={toggleBuilding}><RowIcon name="build" /></button>
                {building && (
                  <button type="button" className="hex-button" aria-label={t('mapImport.title')} title={t('mapImport.title')} aria-pressed={importing} onClick={() => setImporting(!importing)}><RowIcon name="paste" /></button>
                )}
              </div>
            )}
            popover={sheet !== null && (
              <MapBuilderPanel
                slot={sheet} game={game} pack={pack}
                onOpenStage={() => { setSheet(null); setStage({ slot: sheet, mode: 'setup' }); }}
              />
            )}
          />
          {shownArea && <button type="button" className="map-home" onClick={closeShown}>{t('map.home')}</button>}
          {building && importing && <MapStringImport game={game} pack={pack} onClose={() => setImporting(false)} />}
          {hint && (
            <div className="map-hint">
              <span role="status">{hint}</span>
              {(placing || marking) && <button type="button" onClick={toggleTe}>{t('thundersEdge.back')}</button>}
            </div>
          )}
          <div className={`drawer-rail drawer-rail-right${rightOpen ? ' drawer-rail-open' : ''}`} role="group" aria-label={t('plan.drawers')}>
            <DrawerTab side="right" open={drawer === 'upgrades'} onClick={toggleUpgrades} label={upgradeCount > 0 ? `${t('ships.upgrades')} · ${upgradeCount}` : t('ships.upgrades')}>
              {upgradeCount > 0 ? `${t('ships.upgradesShort')} · ${upgradeCount}` : t('ships.upgradesShort')}
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
              {rightDrawer === 'upgrades'
                ? <UpgradesPanel game={game} pack={pack} upgraded={shownState.upgrades} locked={lockedUpgrades} />
                : (
                  <ThundersEdgePanel
                    game={game} pack={pack} owners={owners}
                    onPlace={() => setPlacing(true)} onMark={() => setMarking(true)}
                  />
                )}
            </div>
          </Drawer>
        </div>
        <div className="plan-panel">
          <div className="plan-scroll">
            {/* TODO(P2-425) #ws:ui-containers #type:ui #size:s #player-colour #inline-style — плашка «действие за» красит край и точку inline-стилем var(--player-N): PlayerDot и playerVar()/data-player (аудит 3.7) */}
            {/* TODO(P2-426) #ws:ui-structure #type:dup #size:s #dep:P2-456 #names — имя соперника «фракция или Игрок N» собрано здесь по seat, а в map/opponentName по index+2: одна функция имени */}
            {inHand && (
              <div className="acting-as" style={{ '--owner': `var(--player-${inHand.color})` } as CSSProperties}>
                <span className="owner-dot" aria-hidden="true" style={{ background: `var(--player-${inHand.color})` }} />
                {t('plan.actingFor', { name: pack.factions[inHand.faction]?.name ?? t('players.player', { n: inHand.seat }) })}
              </div>
            )}
            {/* TODO(P2-427) #ws:ui-containers #type:ui #size:s #needs:prototype #editor-head — своя голова редактора с текстовой «Отмена» вместо общей головы редактора и HexRemove (аудит 3.3, 3.4) */}
            {picking && (
              <div className="panel-head">
                <h2>{t('plan.tactical.title')}</h2>
                <button type="button" onClick={() => setEditing(null)}>{t('plan.tactical.cancel')}</button>
              </div>
            )}
            {/* TODO(P2-428) #ws:ui-nesting #type:arch #size:l #needs:prototype #dep:P2-400 #nesting — редакторы и список взаимоисключаются цепочкой !session && !cardEntry && ..., редактор вложен в панель, UnitPicker и HexStage ещё глубже: один слот панели по состоянию автомата, шаги или отдельное меню по прототипу */}
            {session && entry && (
              <TacticalEditor
                game={entryGame} pack={pack} entry={entry} before={stateBeforeEntry(game, plan, entry.id, pack)}
                warnings={forecast.warningsByEntry[entry.id] ?? []}
                pickerFrom={session.pickerFrom} manualPayment={manualPayment} choosing={choosing}
                onChoose={what => { setTapPath(null); setChoosing(what); if (what) setView('map'); }}
                onUpdate={patch => updateEntry(entry.id, patch)}
                onOpenPicker={source => setEditing({ ...session, pickerFrom: source })}
                onManualPayment={open => setManualPayments(ids => (open ? [...ids, entry.id] : ids.filter(id => id !== entry.id)))}
                onOpenShop={() => { if (entry.systemId !== null) setStage({ slot: entry.systemId, mode: 'build', tacticalId: entry.id }); }}
                onOpenBattle={() => { if (entry.systemId !== null) setStage({ slot: entry.systemId, mode: 'battle', tacticalId: entry.id }); }}
                onFly={() => {
                  setEditing({ ...session, pickerFrom: null });
                  startFlight(entry.id);
                  setView('map');
                }}
                onDone={leaveEditor}
              />
            )}
            {/* TODO(P2-429) #ws:ui-plan-screen #type:dup #size:s — переключатель ручной оплаты по id записи написан дважды (тактика и карта): одна функция toggleManualPayment(id) */}
            {!session && cardEntry && (
              <StrategyEditor
                game={gameAs(game, cardEntry.owner)} pack={pack} round={round} entry={cardEntry} before={stateBeforeEntry(game, plan, cardEntry.id, pack)}
                warnings={forecast.warningsByEntry[cardEntry.id] ?? []} manualPayment={manualPayments.includes(cardEntry.id)} picking={cardPick}
                onUpdate={patch => updateEntry(cardEntry.id, patch)}
                onManualPayment={open => setManualPayments(ids => (open ? [...ids, cardEntry.id] : ids.filter(id => id !== cardEntry.id)))}
                onPick={pick => { setMapPick(pick); if (pick) setView('map'); }}
                onOpenShop={(slot, only) => setStage({ slot, mode: 'build', only, forCard: true })}
                onStartTactical={() => { setEditing({ entryId: null, pickerFrom: null, fromCard: cardEntry.id }); setMapPick(null); setBuilding(false); setView('map'); }}
                onOpenTactical={id => setEditing({ entryId: id, pickerFrom: null })}
                onCancel={() => { removeEntry(cardEntry.id); setCardId(null); setMapPick(null); }}
                onDone={() => { setCardId(null); setMapPick(null); }}
              />
            )}
            {!session && !cardEntry && adjustmentEntry && (
              <AdjustmentEditor
                key={adjustmentEntry.id} game={gameAs(game, adjustmentEntry.owner)} pack={pack} entry={adjustmentEntry} warnings={forecast.warningsByEntry[adjustmentEntry.id] ?? []}
                picking={adjustPick !== undefined}
                onPickSystem={() => { setSystemPickFor(adjustPick ? null : adjustmentEntry.id); setView('map'); }}
                onOpenHex={slot => setStage({ slot, mode: 'setup', only: 'units', adjustmentId: adjustmentEntry.id })}
                onUpdate={patch => updateEntry(adjustmentEntry.id, patch)}
                onDone={() => { setAdjustmentId(null); setSystemPickFor(null); }}
              />
            )}
            {!session && !cardEntry && !adjustmentEntry && (
              <>
                <PlanName key={`${plan.id}:${plan.name}:${i18n.language}`} plan={plan} />
                <EntryList
                  game={game} pack={pack} round={round} plan={plan}
                  stateBefore={id => stateBeforeEntry(game, plan, id, pack)} warnings={forecast.warningsByEntry} state={forecast.state}
                  openId={openId} onOpen={onOpenEntry} shownId={shownEntry?.id ?? null} onShow={onShowEntry} onStatusAdded={setOpenId}
                  onDone={done => { if (done.type === 'tactical' && done.moves.some(m => hasUnits(m.units))) startFlight(done.id, shownFilter); }}
                  strategy={<StrategyCards key={`${plan.id}:${round.number}`} expansions={game.expansions} playerCount={game.playerCount} round={round} />}
                  addAction={(
                    <div className="acting-add">
                      {/* TODO(P2-430) #ws:ui-containers #type:ui #size:s #dep:P2-425 #player-colour #player-choice — выбор «за кого» занимает класс большого гекса stage-owners и красит кнопки inline-стилем: PlayerChoice (аудит 3.6) */}
                      <div className="segment stage-owners acting-for" role="group" aria-label={t('plan.actingLabel')}>
                        <button type="button" aria-pressed={!actor} style={{ '--owner': `var(--player-${game.color})` } as CSSProperties} onClick={() => setActingAs(null)}>
                          {t('plan.mine')}
                        </button>
                        {opponentsBySeat(game).map(o => {
                          const faction = pack.factions[o.faction];
                          const name = faction ? factionShortName(faction.id, faction.name) : t('players.player', { n: o.seat });
                          // All the players stay on one line: with many of them the colour and three letters tell them apart.
                          const tag = faction ? name.slice(0, SHORT_TAG) : String(o.seat);
                          return (
                            <button
                              key={o.id} type="button" aria-pressed={actor === o.id} aria-label={name}
                              style={{ '--owner': `var(--player-${o.color})` } as CSSProperties} onClick={() => setActingAs(o.id)}
                            >
                              {game.opponents.length > FULL_NAMES_UP_TO ? tag : name}
                            </button>
                          );
                        })}
                      </div>
                      <ActionMenu onPick={onPick} />
                    </div>
                  )}
                />
              </>
            )}
          </div>
        </div>
      </div>
      {/* TODO(P2-432) #ws:ui-logic-to-domain #type:arch #size:s #card-purchases — покупки карты для большого гекса собираются прямо в JSX: cardPurchases из StrategyEditor, cardChange и два одинаковых stateBeforeEntry; обработчик карты в домене или хуке */}
      {stage && (
        <HexStage
          key={stage.slot} slot={stage.slot} roundNo={round.number} pack={pack} initialMode={stage.mode} only={stage.only}
          owner={stage.forCard ? cardEntry?.owner : undefined}
          onPurchase={stage.forCard && cardEntry
            ? cardPurchases(gameAs(game, cardEntry.owner), pack, cardEntry, stage.slot, stateBeforeEntry(game, plan, cardEntry.id, pack), effects => updateEntry(cardEntry.id, cardChange(
              cardEntry, { effects }, stateBeforeEntry(game, plan, cardEntry.id, pack), gameAs(game, cardEntry.owner).faction, pack, manualPayments.includes(cardEntry.id),
            )))
            : undefined}
          manualPayments={manualPayments} tacticalId={stage.tacticalId} adjustmentId={stage.adjustmentId} shownState={shownState} onClose={closeStage}
        />
      )}
      <div className="plan-switch" role="group" aria-label={t('plan.views')}>
        <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}>{t('plan.mobileMap')}</button>
        <button type="button" aria-pressed={view === 'plan'} onClick={() => setView('plan')}>{t('plan.mobilePlan')}</button>
      </div>
    </section>
  );
}
