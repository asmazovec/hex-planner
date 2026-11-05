import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadPack } from '../../data/loadPack';
import { duplicateTiles, mapIsEmpty } from '../../domain/mapBuilder';
import { EXPEDITION_SLICES } from '../../domain/payment';
import { project, sourceSlot, stateBeforeEntry, systemPlanets, tileIdOf } from '../../domain/project';
import { cardChange, plannedCard, primaryPlayed, type CardEntry } from '../../domain/strategy';
import { validThundersEdgeSystem } from '../../domain/thundersEdge';
import { entryUpgradeRounds, hasLevelTwo, SHIP_KINDS } from '../../domain/unitStats';
import type { AdjustmentKind, Entry, EntryBody, Plan } from '../../domain/types';
import { useGame } from '../../state/gameStore';
import { HexMap, type Arrow } from '../map/HexMap';
import { HexStage, type StageMode } from '../map/HexStage';
import { MapBuilderPanel } from '../map/MapBuilderPanel';
import { MapStringImport } from '../map/MapStringImport';
import { ThundersEdgePanel } from '../map/ThundersEdgePanel';
import { UpgradesPanel } from '../map/UpgradesPanel';
import type { Highlight } from '../map/TileView';
import { useArrowDrag } from '../map/useArrowDrag';
import type { ActionType } from '../plan/ActionMenu';
import { ActionMenu } from '../plan/ActionMenu';
import { EntryList } from '../plan/EntryList';
import { sliceOwners } from '../plan/ExpeditionWidget';
import { PlanTabs, planDisplayName } from '../plan/PlanTabs';
import { PlayerList } from '../players/PlayerList';
import { StrategyCards } from '../plan/StrategyCards';
import { cardPurchases, StrategyEditor, type MapPick } from '../plan/StrategyEditor';
import { SummaryBar } from '../plan/SummaryBar';
import { arrowsOf, hasUnits, sourcePools, suggestMoves, systemName, type TacticalEntry } from '../plan/tactical';
import { TacticalEditor } from '../plan/TacticalEditor';

/** `entryId` is null while a new action waits for its system: the next tile tap creates the entry; `fromCard` makes that one Warfare's free action. */
interface Editing { entryId: string | null; addingSource: boolean; pickerFrom: string | null; fromCard?: string }

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
  const [stage, setStage] = useState<{ slot: string; mode: StageMode; only?: 'build' | 'units'; forCard?: boolean } | null>(null);
  const [importing, setImporting] = useState(false);
  const [building, setBuilding] = useState(() => game !== null && mapIsEmpty(game, pack));
  const [editing, setEditing] = useState<Editing | null>(null);
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

  const openSource = (source: string) => {
    if (!game || !plan || !entry || !session || !game.map[source]) return;
    const known = entry.moves.some(m => sourceSlot(game, pack, m.from) === source);
    if (!known) {
      const added = suggestMoves(game, pack, stateBeforeEntry(game, plan, entry.id, pack), source);
      if (added.length > 0) updateEntry(entry.id, { moves: [...entry.moves, ...added] });
    }
    setEditing({ ...session, addingSource: false, pickerFrom: source });
    setView('plan');
  };

  const arrow = useArrowDrag({ activeSystem, onComplete: openSource, onCancel: () => undefined });
  const closeSheet = useCallback(() => setSheet(null), []);
  const closeStage = useCallback(() => setStage(null), []);

  if (!game || !plan || !round) {
    return <section className="screen"><p className="muted">{t('plan.noGame')}</p></section>;
  }

  // Totals and map show the end of the chosen round: later rounds would ready planets and clear its tokens.
  const upToRound = { ...plan, rounds: plan.rounds.filter(r => r.number <= round.number) };
  const now = project(game, upToRound, 'now', pack);
  const forecast = project(game, upToRound, 'forecast', pack);

  const closePanels = () => {
    setPlacing(false);
    setMarking(false);
    setEditing(null);
    setSheet(null);
    setOpenId(null);
    setCardId(null);
    setMapPick(null);
  };

  const onPick = (type: ActionType) => {
    setPlacing(false);
    setMarking(false);
    if (type === 'tactical') {
      setShowTe(false);
      setSheet(null);
      setBuilding(false);
      setEditing({ entryId: null, addingSource: false, pickerFrom: null });
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
      if (cardPick !== 'dock') updateEntry(cardEntry.id, { effects: { ...cardEntry.effects, systemId: slot } });
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
      setEditing({ entryId: id, addingSource: false, pickerFrom: null });
      setView('plan');
      return;
    }
    if (session && entry) {
      if (session.addingSource && slot !== entry.systemId) openSource(slot);
      return;
    }
    if (building) setSheet(slot);
    else if (game.map[slot]) setStage({ slot, mode: 'setup' });
  };

  const toggleBuilding = () => {
    closePanels();
    setShowTe(false);
    setImporting(false);
    setBuilding(!building);
  };

  const onOpenEntry = (opened: Entry) => {
    setPlacing(false);
    setMarking(false);
    setSheet(null);
    if (opened.type === 'adjustment' && opened.kind && opened.delta.units) {
      setStage({ slot: opened.delta.units.systemId, mode: STAGE_MODE[opened.kind] });
    } else if (opened.type === 'tactical') {
      setShowTe(false);
      setEditing({ entryId: opened.id, addingSource: false, pickerFrom: null });
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
  const arrows = new Map<string, Arrow>();
  for (const item of tacticals) {
    if (item.id !== entry?.id && (item.status !== 'planned' || (!session && mapMode === 'now'))) continue;
    for (const a of arrowsOf(game, pack, item, forecast.warningsByEntry[item.id] ?? [])) arrows.set(`${a.from}>${a.to}`, a);
  }

  const highlights: Record<string, Highlight> = {};
  if (activeSystem !== null) {
    for (const slot of Object.keys(game.map)) if (hasUnits(forecast.state.systems[slot])) highlights[slot] = 'valid';
    highlights[activeSystem] = 'active';
  }

  if (placing) {
    for (const slot of Object.keys(game.map)) if (suitable(slot)) highlights[slot] = 'valid';
  }

  if (cardPick) {
    const fits = (planetId: string) => (cardPick === 'dock' ? forecast.state.docks.includes(planetId) : forecast.state.control[planetId] === 'me');
    for (const slot of Object.keys(game.map)) if (systemPlanets(game, slot, pack).some(p => fits(p.id))) highlights[slot] = 'valid';
  }

  /** In the tactical editor a drag from the active system or a system with my units draws an arrow; any other drag moves the map. */
  const startsArrow = (slot: string): boolean => {
    if (activeSystem === null || !entry) return false;
    if (slot === activeSystem) return true;
    return sourcePools(game, pack, stateBeforeEntry(game, plan, entry.id, pack), slot).some(pool => hasUnits(pool.available));
  };

  const duplicates = building ? duplicateTiles(game.map, pack) : [];
  const hint = cardPick ? t('plan.strategy.mapHint') : marking ? t('fracture.markHint') : placing ? t('expedition.placeHint')
    : picking ? t(session?.fromCard ? 'plan.tactical.freePickHint' : 'plan.tactical.pickHint')
    : session?.addingSource ? t('plan.tactical.sourceHint')
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
            game={game} state={shownState} pack={pack} highlights={highlights} arrows={[...arrows.values()]}
            arrowPreview={arrow.preview} selectedId={sheet} onTileTap={onTileTap}
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
          {building && importing && <MapStringImport game={game} pack={pack} onClose={() => setImporting(false)} />}
          {hint && (
            <p className="map-hint" role="status">
              {hint}
              {(placing || marking) && <button type="button" onClick={toggleTe}>{t('thundersEdge.back')}</button>}
            </p>
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
                warnings={forecast.warningsByEntry[entry.id] ?? []} addingSource={session.addingSource}
                pickerFrom={session.pickerFrom} manualPayment={manualPayment}
                onUpdate={patch => updateEntry(entry.id, patch)}
                onAddSource={() => {
                  setEditing({ ...session, addingSource: !session.addingSource });
                  if (!session.addingSource) setView('map');
                }}
                onOpenPicker={source => setEditing({ ...session, pickerFrom: source })}
                onManualPayment={open => setManualPayments(ids => (open ? [...ids, entry.id] : ids.filter(id => id !== entry.id)))}
                onOpenShop={() => { if (entry.systemId !== null) setStage({ slot: entry.systemId, mode: 'build' }); }}
                onDone={() => setEditing(null)}
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
                onStartTactical={() => { setEditing({ entryId: null, addingSource: false, pickerFrom: null, fromCard: cardEntry.id }); setMapPick(null); setBuilding(false); setView('map'); }}
                onOpenTactical={id => setEditing({ entryId: id, addingSource: false, pickerFrom: null })}
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
                  openId={openId} onOpen={onOpenEntry}
                  strategy={<StrategyCards key={`${plan.id}:${round.number}`} expansions={game.expansions} playerCount={game.playerCount} round={round} />}
                  addAction={<ActionMenu onPick={onPick} primaryPlayed={primaryPlayed(round, game.playerCount)} />}
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
            ? cardPurchases(game, pack, cardEntry, stage.slot, forecast.state, effects => updateEntry(cardEntry.id, cardChange(
              cardEntry, { effects }, stateBeforeEntry(game, plan, cardEntry.id, pack), game.faction, pack, manualPayments.includes(cardEntry.id),
            )))
            : undefined}
          manualPayments={manualPayments} onClose={closeStage}
        />
      )}
      <div className="plan-switch" role="group" aria-label={t('plan.views')}>
        <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}>{t('plan.mobileMap')}</button>
        <button type="button" aria-pressed={view === 'plan'} onClick={() => setView('plan')}>{t('plan.mobilePlan')}</button>
      </div>
    </section>
  );
}
