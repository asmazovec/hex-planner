import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadPack } from '../../data/loadPack';
import { duplicateTiles, mapIsEmpty } from '../../domain/mapBuilder';
import { EXPEDITION_SLICES } from '../../domain/payment';
import { project, stateBeforeEntry, systemPlanets, tileIdOf } from '../../domain/project';
import { focusRect, routeShapes, tacticalNumbers, tapStep, type RouteDraft } from '../../domain/route';
import { MECATOL_PLANETS } from '../../domain/mecatol';
import { CARD, cardChange, plannedCard, primaryPlayed, withSystem, type CardEntry } from '../../domain/strategy';
import { validThundersEdgeSystem } from '../../domain/thundersEdge';
import { entryUpgradeRounds, hasLevelTwo, SHIP_KINDS } from '../../domain/unitStats';
import type { AdjustmentKind, Entry, EntryBody, Game, Phase, Plan } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { FlightLayer } from '../map/FlightLayer';
import { HexMap, type Arrow } from '../map/HexMap';
import { HexStage, type StageMode } from '../map/HexStage';
import { MapBuilderPanel } from '../map/MapBuilderPanel';
import { MapStringImport } from '../map/MapStringImport';
import { ThundersEdgePanel } from '../map/ThundersEdgePanel';
import { UpgradesPanel } from '../map/UpgradesPanel';
import type { Highlight } from '../map/TileView';
import { useArrowDrag } from '../map/useArrowDrag';
import { reducedMotion } from '../map/usePanZoom';
import type { ActionType } from '../plan/ActionMenu';
import { ActionMenu } from '../plan/ActionMenu';
import { EntryList } from '../plan/EntryList';
import { sliceOwners } from '../plan/ExpeditionWidget';
import { PlanTabs, planDisplayName } from '../plan/PlanTabs';
import { PlayerList } from '../players/PlayerList';
import { StrategyCards } from '../plan/StrategyCards';
import { cardPurchases, StrategyEditor, type MapPick } from '../plan/StrategyEditor';
import { SummaryBar } from '../plan/SummaryBar';
import { arrowsOf, entrySystems, flightRoutes, hasUnits, sourcePools, sourcesOf, stateInFlight, systemName, viaOf, withRoute, withoutEmptySources, type TacticalEntry } from '../plan/tactical';
import { playerColour } from '../units/sprites';
import { TacticalEditor } from '../plan/TacticalEditor';

/** `entryId` is null while a new action waits for its system: the next tile tap creates the entry; `fromCard` makes that one Warfare's free action. */
interface Editing { entryId: string | null; pickerFrom: string | null; fromCard?: string }

/** A flight under way: it ends when the game it started from changes. `passed` holds the moves already taken on board on the way; `filter` is the replay its map stands on. */
interface Flight { entryId: string; run: number; game: Game; passed: number[]; filter: 'now' | 'forecast' }

/** The round being played: its entry, and whether it is in the pause before it, flying, or holding for a moment instead of flying. */
interface Playback { index: number; step: 'pause' | 'flying' | 'hold'; game: Game }

/** The pause before a shown action first flies, and between its flights. */
const LOOP_START_MS = 380;
const LOOP_PAUSE_MS = 750;
/** The round's playback: the pause before each entry, and the moment an entry that does not fly stays lit. */
const PLAY_PAUSE_MS = 260;
const PLAY_HOLD_MS = 450;
const PHASES: Phase[] = ['strategy', 'action', 'status', 'agenda'];

const nextStep = (playing: Playback, count: number): Playback | null =>
  (playing.index + 1 < count ? { ...playing, index: playing.index + 1, step: 'pause' } : null);

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

const SIMPLE_BODIES: Record<Exclude<ActionType, 'tactical' | 'strategic' | 'secondary'>, EntryBody> = {
  component: { type: 'component', note: '' },
  expedition: { type: 'expedition', sliceId: null, payment: EMPTY_PAYMENT },
  pass: { type: 'pass' },
  adjustment: { type: 'adjustment', label: '', delta: {} },
};

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
  const pack = useMemo(() => loadPack(game?.expansions ?? []), [game?.expansions]);

  const [roundNo, setRoundNo] = useState<number | null>(null);
  const [mapMode, setMapMode] = useState<'forecast' | 'now'>('forecast');
  const [sheet, setSheet] = useState<string | null>(null);
  const [stage, setStage] = useState<{ slot: string; mode: StageMode; only?: 'build' | 'units'; forCard?: boolean; tacticalId?: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const [building, setBuilding] = useState(() => game !== null && mapIsEmpty(game, pack));
  const [editing, setEditing] = useState<Editing | null>(null);
  /** The route under way by taps. */
  const [tapPath, setTapPath] = useState<string[] | null>(null);
  /** The entry being read, and how many of its flights have started. */
  const [shown, setShown] = useState<{ id: string; plays: number } | null>(null);
  const [flight, setFlight] = useState<Flight | null>(null);
  const flightRuns = useRef(0);
  const [playing, setPlaying] = useState<Playback | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [cardId, setCardId] = useState<string | null>(null);
  const [mapPick, setMapPick] = useState<MapPick | null>(null);
  const [manualPayments, setManualPayments] = useState<string[]>([]);
  const [view, setView] = useState<'map' | 'plan'>('map');
  const [placing, setPlacing] = useState(false);
  const [marking, setMarking] = useState(false);
  const [showPlayers, setShowPlayers] = useState(false);
  const [showUpgrades, setShowUpgrades] = useState(false);
  const [showTe, setShowTe] = useState(false);

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
    if (!game || !entry || !session || !game.map[from]) return;
    const known = sourcesOf(game, pack, entry).includes(from);
    if (!known || viaOf(entry, from).join() !== via.join()) updateEntry(entry.id, { moves: withRoute(game, pack, entry.moves, from, via) });
    setEditing({ ...session, pickerFrom: from });
    setView('plan');
  };

  const arrow = useArrowDrag({ activeSystem, onComplete: openRoute, onCancel: () => undefined, isSystem: slot => game?.map[slot] !== undefined });

  const shownEntry = round?.entries.find(e => e.id === shown?.id);
  // A change of the game, undo for one, ends what depended on it.
  if (flight && flight.game !== game) setFlight(null);
  if (playing && playing.game !== game) setPlaying(null);
  if (shown && round && !shownEntry) setShown(null);
  if (tapPath && !entry) setTapPath(null);
  const flying = flight?.game === game ? flight : null;
  const loops = shownEntry?.type === 'tactical' && shownEntry.moves.some(m => hasUnits(m.units)) && !reducedMotion();
  const playList = PHASES.flatMap(phase => (round?.entries ?? []).filter(e => e.phase === phase && e.status !== 'cancelled'));
  const playEntry = playing?.game === game ? playList[playing.index] : undefined;
  const playEntryFlies = playEntry?.type === 'tactical' && playEntry.moves.some(m => hasUnits(m.units)) && !reducedMotion();

  const startFlight = useCallback((entryId: string, filter: 'now' | 'forecast' = 'forecast') => {
    const current = useGame.getState().game;
    if (reducedMotion() || !current) return;
    flightRuns.current += 1;
    setFlight({ entryId, run: flightRuns.current, game: current, passed: [], filter });
  }, []);

  useEffect(() => {
    if (!playing || !playEntry || playing.step === 'flying') return undefined;
    const count = playList.length;
    const timer = playing.step === 'pause'
      ? setTimeout(() => {
        if (playEntryFlies) startFlight(playEntry.id);
        setPlaying({ ...playing, step: playEntryFlies ? 'flying' : 'hold' });
      }, PLAY_PAUSE_MS)
      : setTimeout(() => setPlaying(nextStep(playing, count)), PLAY_HOLD_MS);
    return () => clearTimeout(timer);
  }, [playing, playEntry, playEntryFlies, playList.length, startFlight]);

  /** What the editor holds on leaving the screen, whichever way: the menu has no way to ask. */
  const editedId = useRef<string | undefined>(undefined);
  useEffect(() => { editedId.current = entry?.id; }, [entry?.id]);
  useEffect(() => () => pruneEmptySources(editedId.current), []);

  useEffect(() => {
    if (!shown || !loops || flying) return undefined;
    const timer = setTimeout(() => {
      setShown(s => s && { ...s, plays: s.plays + 1 });
      startFlight(shown.id);
    }, shown.plays === 0 ? LOOP_START_MS : LOOP_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [shown, loops, flying, startFlight]);

  const closeSheet = useCallback(() => setSheet(null), []);
  const closeStage = useCallback(() => setStage(null), []);

  if (!game || !plan || !round) {
    return <section className="screen"><p className="muted">{t('plan.noGame')}</p></section>;
  }

  // Totals and map show the end of the chosen round: later rounds would ready planets and clear its tokens.
  const upToRound = { ...plan, rounds: plan.rounds.filter(r => r.number <= round.number) };
  const now = project(game, upToRound, 'now', pack);
  const forecast = project(game, upToRound, 'forecast', pack);

  const closeShown = () => {
    setShown(null);
    setFlight(null);
    setPlaying(null);
  };

  const leaveEditor = () => {
    pruneEmptySources(entry?.id);
    setEditing(null);
    setTapPath(null);
  };

  const closePanels = () => {
    setPlacing(false);
    setMarking(false);
    setShowTe(false);
    closeShown();
    leaveEditor();
    setSheet(null);
    setOpenId(null);
    setCardId(null);
    setMapPick(null);
  };

  const onPick = (type: ActionType) => {
    setPlacing(false);
    setMarking(false);
    setTapPath(null);
    closeShown();
    if (type === 'tactical') {
      setShowTe(false);
      setSheet(null);
      setBuilding(false);
      setEditing({ entryId: null, pickerFrom: null });
      setView('map');
      return;
    }
    if (type === 'strategic' || type === 'secondary') {
      const card = type === 'strategic' ? plannedCard(round, game.playerCount) : undefined;
      setCardId(addEntry(round.number, card === undefined ? { type } : { type, card }, 'action'));
      setMapPick(null);
      setShowTe(false);
      setView('plan');
      return;
    }
    const id = addEntry(round.number, SIMPLE_BODIES[type], 'action');
    setOpenId(id);
  };

  const hasTe = game.expansions.includes('te');
  const owners = sliceOwners(game, plan);
  const suitable = (slot: string): boolean => {
    const tile = game.map[slot] ? pack.tiles[tileIdOf(game, slot)] : undefined;
    return tile !== undefined && validThundersEdgeSystem(tile);
  };

  const onTileTap = (slot: string) => {
    if (cardPick && cardEntry) {
      if (!game.map[slot]) return;
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
      if (!game.map[slot]) return;
      const id = addEntry(round.number, {
        type: 'tactical', systemId: slot, moves: [], landings: [], production: {}, payment: EMPTY_PAYMENT,
        ...(session?.fromCard ? { free: true, fromCard: session.fromCard } : {}),
      }, 'action');
      setEditing({ entryId: id, pickerFrom: null });
      setView('plan');
      return;
    }
    if (session && entry) {
      if (!game.map[slot]) return;
      const step = tapStep(tapPath, slot, entry.systemId ?? '');
      if (step.onActive) {
        // The wrong system: while the action has no routes a tap takes it back and returns to choosing.
        if (sourcesOf(game, pack, entry).length === 0) {
          removeEntry(entry.id);
          setEditing({ entryId: null, pickerFrom: null, ...(entry.fromCard ? { fromCard: entry.fromCard } : {}) });
        }
        return;
      }
      setTapPath(step.path);
      if (step.route) openRoute(step.route);
      return;
    }
    if (!building && !game.map[slot]) return;
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
    setPlaying(null);
    setShown(shown?.id === tapped.id ? null : { id: tapped.id, plays: 0 });
  };

  const onOpenEntry = (opened: Entry) => {
    closeShown();
    setPlacing(false);
    setMarking(false);
    setSheet(null);
    if (opened.type === 'adjustment' && opened.kind && opened.delta.units) {
      setStage({ slot: opened.delta.units.systemId, mode: STAGE_MODE[opened.kind] });
    } else if (opened.type === 'tactical') {
      setShowTe(false);
      setEditing({ entryId: opened.id, pickerFrom: null });
    } else if (opened.type === 'strategic' || opened.type === 'secondary') {
      setShowTe(false);
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
  /** The action the map speaks of: the one being edited, read or played. */
  const focusId = entry?.id ?? shownEntry?.id ?? playEntry?.id ?? flying?.entryId;
  const numbers = tacticalNumbers(round.entries);
  const drawn = tacticals.filter(item => item.status !== 'cancelled' && (item.id === focusId || item.status === 'done' || session || mapMode !== 'now'))
    .flatMap(item => arrowsOf(game, pack, item, forecast.warningsByEntry[item.id] ?? []).map(a => ({
      ...a, key: `${item.id}:${a.from}`, number: numbers[item.id], tone: item.id === focusId ? 'active' as const : item.status === 'done' ? 'done' as const : 'planned' as const,
    })));
  const shapes = routeShapes(drawn.map(a => [a.from, ...a.via, a.to]));
  const arrows: Arrow[] = drawn.map((a, i) => ({ ...a, shape: shapes[i] }));

  const draft = session && entry ? arrow.preview ?? (tapPath && { path: tapPath }) : null;
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

  const flyingEntry = flying ? tacticals.find(item => item.id === flying.entryId) : undefined;
  const beforeFlight = flying && flyingEntry ? stateBeforeEntry(game, plan, flyingEntry.id, pack, flying.filter) : null;
  // The playback shows the round as it unfolds: the state before the entry it has reached.
  const beforePlay = playEntry ? stateBeforeEntry(game, plan, playEntry.id, pack) : null;
  const mapState = flying && flyingEntry && beforeFlight ? stateInFlight(pack, flyingEntry, beforeFlight, flying.passed) : beforePlay ?? shownState;
  const shownArea = shownEntry ? focusRect(entrySystems(game, pack, shownEntry)) : null;

  if (placing) {
    for (const slot of Object.keys(game.map)) if (suitable(slot)) highlights[slot] = 'valid';
  }

  if (cardPick && cardEntry) {
    const primaryCard = (card: number) => cardEntry.type === 'strategic' && cardEntry.card === card;
    if (primaryCard(CARD.warfare)) {
      for (const slot of stateBeforeEntry(game, plan, cardEntry.id, pack).tokensOnMap) if (game.map[slot]) highlights[slot] = 'valid';
    } else {
      const fits = (planetId: string) => (cardPick === 'dock' ? forecast.state.docks.includes(planetId) : forecast.state.control[planetId] === 'me');
      const excluded = primaryCard(CARD.diplomacy) ? MECATOL_PLANETS : [];
      for (const slot of Object.keys(game.map)) {
        const planets = systemPlanets(game, slot, pack);
        if (planets.some(p => fits(p.id)) && !planets.some(p => excluded.includes(p.id))) highlights[slot] = 'valid';
      }
    }
  }

  /** In the tactical editor a drag from the active system or a system with my units draws an arrow; any other drag moves the map. */
  const startsArrow = (slot: string): boolean => {
    if (activeSystem === null || !entry || tapPath !== null) return false;
    if (slot === activeSystem) return true;
    return sourcePools(game, pack, stateBeforeEntry(game, plan, entry.id, pack), slot).some(pool => hasUnits(pool.available));
  };

  const duplicates = building ? duplicateTiles(game.map, pack) : [];
  const hint = cardPick ? t('plan.strategy.mapHint') : marking ? t('fracture.markHint') : placing ? t('expedition.placeHint')
    : picking ? t(session?.fromCard ? 'plan.tactical.freePickHint' : 'plan.tactical.pickHint')
    : session && tapPath ? t('plan.tactical.tapHint')
      : duplicates.length > 0 ? t('builder.duplicates', { list: duplicates.join(', ') }) : null;
  const manualPayment = entry !== undefined && manualPayments.includes(entry.id);
  const totalSlices = EXPEDITION_SLICES.length;
  const takenSlices = Object.keys(owners).length;
  const placedTe = game.expedition.thundersEdgeSystem;
  const toggleUpgrades = () => {
    setPlacing(false);
    setMarking(false);
    setShowTe(false);
    setShowUpgrades(!showUpgrades);
  };
  const toggleTe = () => {
    setShowUpgrades(false);
    // While the panel stands aside for the map, the button brings it back.
    if (placing || marking) {
      setPlacing(false);
      setMarking(false);
    } else {
      setShowTe(!showTe);
    }
  };

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
        />
        <SummaryBar now={now.state} forecast={forecast.state} pack={pack} />
      </header>
      <div className="plan-body">
        {showPlayers && (
          <div className="players-panel">
            <PlayerList
              action={<button type="button" onClick={() => setShowPlayers(false)}>{t('players.close')}</button>}
              live={{ upgraded: shownState.upgrades, locked: lockedUpgrades, points: { me: shownState.vp, ...shownState.opponentVp } }}
            />
          </div>
        )}
        <div className="plan-map">
          <HexMap
            game={game} state={mapState} pack={pack} highlights={highlights} arrows={arrows}
            arrowPreview={draft} focusRect={shownArea} selectedId={sheet} onTileTap={onTileTap}
            overlay={flying && flyingEntry && beforeFlight && (
              <FlightLayer
                key={flying.run} colour={playerColour(game.color)} passed={flying.passed}
                routes={flightRoutes(game, pack, flyingEntry, beforeFlight, from => arrows.find(a => a.key === `${flyingEntry.id}:${from}`)?.shape)}
                onPass={move => setFlight(f => f && { ...f, passed: [...f.passed, move] })}
                onDone={() => {
                  setFlight(null);
                  setPlaying(p => (p?.step === 'flying' ? nextStep(p, playList.length) : p));
                }}
              />
            )}
            onTilePointerDown={(slot, e) => { if (startsArrow(slot)) arrow.onTilePointerDown(slot, e); }} startsArrow={startsArrow}
            onPopoverClose={closeSheet}
            tools={(
              <div className="map-tools">
                <button type="button" aria-pressed={showPlayers} onClick={() => setShowPlayers(!showPlayers)}>{t('players.open')}</button>
                <button
                  type="button" aria-pressed={showUpgrades} onClick={toggleUpgrades}
                  aria-label={upgradeCount > 0 ? `${t('ships.upgrades')} · ${upgradeCount}` : t('ships.upgrades')}
                >
                  {upgradeCount > 0 ? `${t('ships.upgradesShort')} · ${upgradeCount}` : t('ships.upgradesShort')}
                </button>
                {hasTe && (
                  <button
                    type="button" aria-pressed={showTe} onClick={toggleTe}
                    className={takenSlices === totalSlices && placedTe === null ? 'te-ready' : undefined}
                  >
                    {placedTe === null
                      ? t('thundersEdge.taken', { n: takenSlices, total: totalSlices })
                      : t('thundersEdge.placed', { system: systemName(game, pack, placedTe) })}
                  </button>
                )}
                <button type="button" aria-pressed={building} onClick={toggleBuilding}>{t('plan.buildMap')}</button>
                {building && (
                  <button type="button" aria-pressed={importing} onClick={() => setImporting(!importing)}>{t('mapImport.title')}</button>
                )}
                <div className="map-mode" role="group" aria-label={t('plan.mapShows')}>
                  {(['forecast', 'now'] as const).map(mode => (
                    <button key={mode} type="button" aria-pressed={mapMode === mode} disabled={session !== null || cardEntry !== undefined} onClick={() => setMapMode(mode)}>
                      {t(`plan.${mode}`)}
                    </button>
                  ))}
                </div>
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
          {showUpgrades && (
            <UpgradesPanel game={game} pack={pack} upgraded={shownState.upgrades} locked={lockedUpgrades} onClose={() => setShowUpgrades(false)} />
          )}
          {hasTe && showTe && !placing && !marking && (
            <ThundersEdgePanel
              game={game} pack={pack} owners={owners} onClose={() => setShowTe(false)}
              onPlace={() => setPlacing(true)} onMark={() => setMarking(true)}
            />
          )}
        </div>
        <div className="plan-panel">
          <div className="plan-scroll">
            {picking && (
              <div className="panel-head">
                <h2>{t('plan.tactical.title')}</h2>
                <button type="button" onClick={() => setEditing(null)}>{t('plan.tactical.cancel')}</button>
              </div>
            )}
            {session && entry && (
              <TacticalEditor
                game={game} pack={pack} entry={entry} before={stateBeforeEntry(game, plan, entry.id, pack)}
                warnings={forecast.warningsByEntry[entry.id] ?? []}
                pickerFrom={session.pickerFrom} manualPayment={manualPayment}
                onUpdate={patch => updateEntry(entry.id, patch)}
                onOpenPicker={source => setEditing({ ...session, pickerFrom: source })}
                onManualPayment={open => setManualPayments(ids => (open ? [...ids, entry.id] : ids.filter(id => id !== entry.id)))}
                onOpenShop={() => { if (entry.systemId !== null) setStage({ slot: entry.systemId, mode: 'build', tacticalId: entry.id }); }}
                onFly={() => {
                  setEditing({ ...session, pickerFrom: null });
                  startFlight(entry.id);
                  setView('map');
                }}
                onDone={leaveEditor}
              />
            )}
            {!session && cardEntry && (
              <StrategyEditor
                game={game} pack={pack} round={round} entry={cardEntry} before={stateBeforeEntry(game, plan, cardEntry.id, pack)}
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
            {!session && !cardEntry && (
              <>
                <PlanName key={`${plan.id}:${plan.name}:${i18n.language}`} plan={plan} />
                <EntryList
                  game={game} pack={pack} round={round} plan={plan}
                  stateBefore={id => stateBeforeEntry(game, plan, id, pack)} warnings={forecast.warningsByEntry} state={forecast.state}
                  openId={openId} onOpen={onOpenEntry} shownId={shownEntry?.id ?? null} playingId={playEntry?.id ?? null} onShow={onShowEntry} onStatusAdded={setOpenId}
                  onDone={done => { if (done.type === 'tactical' && done.moves.some(m => hasUnits(m.units))) startFlight(done.id, shownFilter); }}
                  strategy={<StrategyCards key={`${plan.id}:${round.number}`} expansions={game.expansions} playerCount={game.playerCount} round={round} />}
                  addAction={(
                    <>
                      <ActionMenu onPick={onPick} primaryPlayed={primaryPlayed(round, game.playerCount)} />
                      <button
                        type="button" className="phase-play" aria-pressed={playEntry !== undefined} disabled={playList.length === 0}
                        onClick={() => {
                          const running = playEntry !== undefined;
                          closeShown();
                          if (!running) setPlaying({ index: 0, step: 'pause', game });
                        }}
                      >
                        {t('plan.play')}
                      </button>
                    </>
                  )}
                />
              </>
            )}
          </div>
        </div>
      </div>
      {stage && (
        <HexStage
          key={stage.slot} slot={stage.slot} roundNo={round.number} pack={pack} initialMode={stage.mode} only={stage.only}
          onPurchase={stage.forCard && cardEntry
            ? cardPurchases(game, pack, cardEntry, stage.slot, stateBeforeEntry(game, plan, cardEntry.id, pack), effects => updateEntry(cardEntry.id, cardChange(
              cardEntry, { effects }, stateBeforeEntry(game, plan, cardEntry.id, pack), game.faction, pack, manualPayments.includes(cardEntry.id),
            )))
            : undefined}
          manualPayments={manualPayments} tacticalId={stage.tacticalId} shownState={shownState} onClose={closeStage}
        />
      )}
      <div className="plan-switch" role="group" aria-label={t('plan.views')}>
        <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}>{t('plan.mobileMap')}</button>
        <button type="button" aria-pressed={view === 'plan'} onClick={() => setView('plan')}>{t('plan.mobilePlan')}</button>
      </div>
    </section>
  );
}
