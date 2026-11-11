import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { PlacedStack, TokenKind } from '../../../domain/hexLayout';
import { mergedCounts } from '../../../domain/losses';
import { gameAs, opponentsBySeat } from '../../../domain/players';
import { boardSystemWarnings, dockFighterRoom, fleetExcess, planetStructureWarnings, productionCost, productionPlaces, projectionAtRound, readyResources, seenBefore, structureOwner, systemMeters, systemPlanets } from '../../../domain/project';
import { timelineOf } from '../../../state/projection';
import { holdingsOf, upgradesOf } from '../../../domain/holdings';
import { unitStats } from '../../../domain/unitStats';
import type { Entry, GameState, PlanetDef, StructureKind, UnitCounts, UnitId, Warning, WarningCode } from '../../../domain/types';
import { useGame } from '../../../state/gameStore';
import { lossesOf, withAdjustedUnit, withFleetRemoval, withLoss, withProduction, type TacticalEntry } from '../../../domain/tactical';
import { enemyChange, holderIn, stacksOf, structureInGame } from '../../../domain/stacks';
import { placesOf, type WarningPlace } from '../../feedback/warningPlaces';
import { tokenColours } from '../../units/sprites';
import { UNIT_ORDER } from '../../units/unitOrder';
import { opponentName } from '../../players/names';
import type { UnitDraftItem } from '../../units/UnitDraft';
import type { BoughtUnit, PurchaseTarget } from './purchases';
import { isStructure, priceText, type ShopItem } from './UnitShop';
import type { HexStageProps, StageMode } from './HexStage';

const STRUCTURES: StructureKind[] = ['pds', 'spacedock'];


/** The key of a stack on the hex: its owner, kind and the planet's index, or `-` in space. */
const stackKey = (owner: string, kind: TokenKind, planet?: number): string => `${owner}|${kind}|${planet ?? '-'}`;
const parseKey = (key: string) => {
  const [owner, kind, planet] = key.split('|');
  return { owner, kind: kind as TokenKind, planet: planet === '-' ? undefined : Number(planet) };
};

function bumped(record: Record<string, number>, key: string, amount: number): Record<string, number> {
  const { [key]: current = 0, ...rest } = record;
  return current + amount > 0 ? { ...rest, [key]: current + amount } : rest;
}

/** One picture of a lost unit: a tap gives it back. */
export interface LossPicture {
  key: string;
  kind: TokenKind;
  planetId: string | null;
  count: number;
  back: () => void;
}

/** A row of the shop's draft: the space area, or a planet by its index in the system. */
export interface ShopRow {
  id: string;
  planet: PlanetDef | null;
  items: UnitDraftItem[];
}

/** The row of the space area; a planet's row goes by its index. */
const SPACE_ROW = 'space';

export interface MeterRow {
  key: string;
  now: number;
  of: number;
  over: boolean;
}

/**
 * What the big hex edits and how: placing, losses and purchases, for me or an opponent. Enemy units and structures
 * have no entry to hold what was lost or bought, so those strips last as long as the hex stays open.
 */
export function useStage({ slot, roundNo, pack, initialMode = 'setup', only, onPurchase, manualPayments = [], tacticalId, adjustmentId, owner: ownerGiven, shownState }: HexStageProps) {
  const { t } = useTranslation();
  const game = useGame(s => s.game);
  const setEnemyUnits = useGame(s => s.setEnemyUnits);
  const setEnemyGround = useGame(s => s.setEnemyGround);
  const setDock = useGame(s => s.setDock);
  const setPds = useGame(s => s.setPds);
  const changeAdjustment = useGame(s => s.changeAdjustment);
  const updateEntry = useGame(s => s.updateEntry);
  const setPlanetControl = useGame(s => s.setPlanetControl);
  const [mode, setMode] = useState<StageMode>(initialMode);
  const [chosenSide, setSide] = useState<string | null>(null);
  const [chosenPlanet, setPlanet] = useState(0);
  const [news, setNews] = useState<Record<string, number>>({});
  const [lost, setLost] = useState<Record<string, number>>({});
  /** Why the last tap on a token changed nothing. */
  const [tapNote, setTapNote] = useState<'planned' | null>(null);

  const plan = game?.plans.find(p => p.id === game.activePlanId);
  const round = plan?.rounds.find(r => r.number === roundNo);
  if (!game || !plan || !round) return null;

  const line = timelineOf(game, plan, 'forecast', pack);
  const projection = projectionAtRound(line, roundNo);
  const { state } = projection;
  const planets = systemPlanets(game, slot, pack);
  const target = Math.min(chosenPlanet, Math.max(0, planets.length - 1));
  const targetPlanet = planets.at(target);
  const planetIdOf = (planet: number | undefined): string | null => (planet === undefined ? null : planets[planet]?.id ?? null);
  /** Whose hand this hex is in: mine, or the opponent whose expected action is being set up. */
  const mine = ownerGiven ?? round.entries.find(e => e.id === tacticalId || e.id === adjustmentId)?.owner ?? 'me';
  const view = gameAs(game, mine === 'me' ? undefined : mine);
  const acting = (mine !== 'me' && state.rivals?.[mine]) || state;
  const side = only ? mine : chosenSide ?? mine;
  const colours = tokenColours(game);
  const seated = opponentsBySeat(game).map(o => ({ id: o.id, color: o.color, faction: o.faction, seat: o.seat, name: opponentName(game, pack, o.id, t) }));
  const holderOf = (planetId: string): string => holderIn(game, state, planetId) ?? 'me';
  /** Who controls the planet in the state shown: me, an opponent, or nobody. */
  const controllerOf = (planetId: string): string | null => (state.control[planetId] === 'me' ? 'me' : holderIn(game, state, planetId) ?? null);
  const kindName = (kind: TokenKind): string => (kind === 'pds' ? t('map.pds') : kind === 'spacedock' ? t('map.spaceDock') : t(`unit.${kind}`));

  /** Ground forces go by planet; one still listed with the system comes off there. */
  const changeEnemy = (owner: string, unit: UnitId, planetId: string | null, amount: number) => {
    const next = enemyChange(game, slot, owner, unit, planetId, amount);
    if ('planetId' in next) setEnemyGround(next.planetId, owner, next.units);
    else setEnemyUnits(next.slot, owner, next.units);
  };
  /** The tactical action this hex was opened from: its battle belongs to it, its purchases too while it stands on this system, and the fleet limit counts it. */
  const fightingFor = tacticalId ? round.entries.find((e): e is Entry & TacticalEntry => e.id === tacticalId && e.type === 'tactical') : undefined;
  const adjusting = adjustmentId ? round.entries.find((e): e is Extract<Entry, { type: 'adjustment' }> => e.id === adjustmentId && e.type === 'adjustment') : undefined;
  const change = (kind: 'setup' | 'losses', unit: UnitId, planetId: string | null, amount: number) => {
    if (kind === 'losses' && fightingFor) updateEntry(fightingFor.id, withLoss(fightingFor, unit, planetId, amount));
    else if (kind === 'setup' && adjusting) updateEntry(adjusting.id, { delta: withAdjustedUnit(adjusting.delta, slot, unit, planetId, amount) });
    else changeAdjustment(roundNo, { kind, systemId: slot, unit, planetId, amount });
  };
  const changeStructure = (kind: StructureKind, planetId: string, amount: 1 | -1) => {
    if (kind === 'spacedock') setDock(planetId, amount > 0);
    else setPds(planetId, (game.pds[planetId] ?? 0) + amount);
  };

  const tacticals = round.entries.filter((e): e is Entry & TacticalEntry => e.type === 'tactical' && e.systemId === slot && e.status !== 'cancelled');
  /** The action that takes the purchases: the one this hex was opened from, otherwise the round's last one of mine here. */
  const tactical = onPurchase ? undefined : (fightingFor && tacticals.includes(fightingFor) ? fightingFor : tacticals.filter(e => !e.owner).at(-1));
  /** The state the tactical entry pays and places with: the end of the round may differ. */
  const beforeTactical = tactical && seenBefore(line, tactical.id);
  const produced = tactical && beforeTactical ? productionPlaces(view, tactical, beforeTactical, pack) : [];
  const changeProduction = (entry: TacticalEntry, before: GameState, unit: UnitId, planetId: string | null, amount: 1 | -1) =>
    updateEntry(entry.id, withProduction(entry, before, view.faction, unit, planetId, amount, pack, manualPayments.includes(entry.id)));
  const purchases: PurchaseTarget = onPurchase ?? {
    bought: [...produced, ...mergedCounts(round, 'build', slot)],
    change: (unit, planetId, amount) => {
      const held = produced.some(p => p.unit === unit && p.planetId === planetId);
      if (tactical && beforeTactical && (amount > 0 || held)) changeProduction(tactical, beforeTactical, unit, planetId, amount);
      else changeAdjustment(roundNo, { kind: 'build', systemId: slot, unit, planetId, amount });
    },
  };
  const keyOfBought = ({ unit, planetId }: BoughtUnit): string => {
    const index = planets.findIndex(p => p.id === planetId);
    return stackKey(mine, unit, index < 0 ? undefined : index);
  };
  const bought: Record<string, number> = { ...news };
  for (const item of purchases.bought) bought[keyOfBought(item)] = (bought[keyOfBought(item)] ?? 0) + item.count;

  for (const { kind, planetId } of purchases.structures ?? []) {
    const index = planets.findIndex(p => p.id === planetId);
    if (index >= 0) bought[stackKey(holderOf(planetId), kind, index)] = (bought[stackKey(holderOf(planetId), kind, index)] ?? 0) + 1;
  }

  /**
   * By hand, a structure goes to the player chosen in the toggle; when they do not control the target planet, placing it
   * hands them the planet. A card's structures are always mine.
   */
  const handsOver = (planet: PlanetDef | undefined): boolean => !purchases.changeStructure && planet !== undefined && controllerOf(planet.id) !== side;
  const handover = (mode === 'setup' || mode === 'build') && targetPlanet !== undefined && handsOver(targetPlanet)
    ? { planet: targetPlanet.name, player: side } : null;

  /** One more of a kind: on the planet chosen on the hex, or on the planet of the shop's row (`null` is the space area). */
  const buy = (kind: TokenKind, at: number | null = target) => {
    setTapNote(null);
    const index = at ?? undefined;
    const planet = index === undefined ? undefined : planets.at(index);
    if (isStructure(kind)) {
      if (!planet || (kind === 'spacedock' && structureOwner(state, 'spacedock', planet.id) !== undefined)) return;
      if (purchases.changeStructure) {
        purchases.changeStructure(kind, planet.id, 1);
        return;
      }
      // A structure is its controller's (85): placed for another player, it hands them the planet first, as the note said.
      if (handsOver(planet)) setPlanetControl(planet.id, side);
      changeStructure(kind, planet.id, 1);
      if (mode === 'build') setNews(bumped(news, stackKey(side, kind, index), 1));
      return;
    }
    const ground = Boolean(pack.units[kind]?.ground);
    const planetId = ground ? planet?.id ?? null : null;
    if (side !== mine) {
      changeEnemy(side, kind, planetId, 1);
      if (mode === 'build') setNews(bumped(news, stackKey(side, kind, ground && planet ? index : undefined), 1));
    } else if (mode === 'build') purchases.change(kind, planetId, 1);
    else change('setup', kind, planetId, 1);
  };

  /** Whether the game itself holds this structure, apart from what entries plan. */
  const inBaseline = (kind: StructureKind, planetId: string): boolean => structureInGame(game, pack, kind, planetId);

  /** Build: a tap takes back one bought here. */
  const unbuy = ({ kind, owner, key }: PlacedStack, planetId: string | null) => {
    if ((bought[key] ?? 0) === 0) return;
    if (isStructure(kind) && purchases.changeStructure) {
      purchases.changeStructure(kind, planetId ?? '', -1);
      return;
    }
    if (owner === mine && !isStructure(kind)) {
      purchases.change(kind, planetId, -1);
      return;
    }
    if (isStructure(kind)) changeStructure(kind, planetId ?? '', -1);
    else changeEnemy(owner, kind, planetId, -1);
    setNews(bumped(news, key, -1));
  };
  /** Setup and battle: a tap takes one off the hex, and in battle it counts as lost. */
  const takeOff = ({ kind, owner, key }: PlacedStack, planetId: string | null) => {
    // Beyond the fleet pool only my ships in space go, back to the reinforcements.
    if (mode === 'fleet') {
      if (fightingFor && owner === mine && !isStructure(kind) && planetId === null && !pack.units[kind]?.ground) updateEntry(fightingFor.id, withFleetRemoval(fightingFor, kind, 1));
      return;
    }
    // A stack can hold planned structures too: the baseline ones go first, and one only planned belongs to its entry, so it takes no tap.
    if (isStructure(kind) && !inBaseline(kind, planetId ?? '')) {
      setTapNote('planned');
      return;
    }
    if (isStructure(kind)) changeStructure(kind, planetId ?? '', -1);
    else if (owner === mine) change(mode === 'battle' ? 'losses' : 'setup', kind, planetId, -1);
    else changeEnemy(owner, kind, planetId, -1);
    if (mode === 'battle' && (owner !== mine || isStructure(kind))) setLost(bumped(lost, key, 1));
  };
  const onToken = (stack: PlacedStack) => {
    setTapNote(null);
    // The control mode edits no units, and in an opponent's expected action only their own units are theirs to touch.
    if (mode === 'control' || (mine !== 'me' && stack.owner !== mine)) return;
    (mode === 'build' ? unbuy : takeOff)(stack, planetIdOf(stack.planet));
  };

  const giveBack = (key: string) => {
    const { owner, kind, planet } = parseKey(key);
    if (isStructure(kind)) changeStructure(kind, planetIdOf(planet) ?? '', 1);
    else changeEnemy(owner, kind, planetIdOf(planet), 1);
    setLost(bumped(lost, key, -1));
  };

  const myLosses = fightingFor ? lossesOf(fightingFor) : mine === 'me' ? mergedCounts(round, 'losses', slot).filter(c => c.count < 0) : [];
  /** What one player lost here: mine from the entries, an opponent's from this view. */
  const lossesFor = (owner: string): LossPicture[] => [
    ...(owner === mine ? myLosses.map(c => ({
      key: `${c.unit}|${c.planetId}`, kind: c.unit as TokenKind, planetId: c.planetId, count: -c.count, back: () => change('losses', c.unit, c.planetId, 1),
    })) : []),
    ...Object.keys(lost).filter(key => parseKey(key).owner === owner)
      .map(key => ({ key, kind: parseKey(key).kind, planetId: planetIdOf(parseKey(key).planet), count: lost[key], back: () => giveBack(key) })),
  ];

  /** Who takes part in a battle here: whoever has units or structures in the system, or has already lost some in it. */
  const present = new Set(Object.values(stacksOf(game, state, slot, planets, pack)).flat().map(stack => stack.owner));
  const fights = (owner: string): boolean => present.has(owner) || lossesFor(owner).length > 0;

  const sideFaction = side === mine ? view.faction : seated.find(o => o.id === side)?.faction ?? '';
  const sideHoldings = side === mine ? onPurchase?.holdings ?? beforeTactical?.holdings ?? acting.holdings : state.rivals?.[side]?.holdings ?? holdingsOf(game.start.opponents[side]);
  const sideUpgrades = upgradesOf(sideHoldings, pack);
  const inBuild = mode === 'build';
  const units = UNIT_ORDER.filter(u => pack.units[u]);
  const boughtOf = (kind: TokenKind): number => Object.entries(bought)
    .filter(([key]) => { const k = parseKey(key); return k.kind === kind && (isStructure(kind) || k.owner === side); })
    .reduce((sum, [, n]) => sum + n, 0);
  /** A new structure by hand is drawn for the player chosen in the toggle; a card builds mine. */
  const structureColour = colours[purchases.changeStructure ? mine : side];
  const shopItems: ShopItem[] = [
    ...(only === 'build' ? [] : units.map((kind): ShopItem => ({
      // Without a planet, ground forces stand in space as cargo; only the capacity warns.
      kind, label: kindName(kind), colour: colours[side],
      price: inBuild ? unitStats(sideFaction, kind, sideUpgrades.includes(kind), pack)?.cost : undefined,
    }))),
    ...(only === 'units' ? [] : STRUCTURES.map((kind): ShopItem => ({
      kind, label: kindName(kind), colour: structureColour, disabled: planets.length === 0,
    }))),
  ];
  /** The keys of what was bought of a kind in one row of the shop: a structure of any holder, a unit of the chosen player. */
  const boughtKeys = (kind: TokenKind, index: number | undefined): string[] => Object.keys(bought).filter(key => {
    const k = parseKey(key);
    return bought[key] > 0 && k.kind === kind && k.planet === index && (isStructure(kind) || k.owner === side);
  });
  const boughtAt = (kind: TokenKind, index: number | undefined): number => boughtKeys(kind, index).reduce((sum, key) => sum + bought[key], 0);
  /**
   * The figures still in the reinforcements of the player the shop buys for (96.2, 24.4): the limit less what the forecast
   * already holds on the board, purchases included; below zero by what was bought beyond them. Fighters and infantry have tokens and never run out.
   */
  const sideState = side === mine ? acting : state.rivals?.[side];
  const structureState = purchases.changeStructure || side === mine ? acting : state.rivals?.[side];
  const shopStock: Partial<Record<TokenKind, number>> = {};
  for (const unit of units) {
    const limit = pack.units[unit]?.limit;
    if (limit === null || limit === undefined || unit === 'fighter' || unit === 'infantry' || !sideState) continue;
    const onBoard = [...Object.values(sideState.systems), ...Object.values(sideState.ground)].reduce((sum, counts) => sum + (counts[unit] ?? 0), 0);
    shopStock[unit] = limit - onBoard;
  }
  for (const kind of STRUCTURES) {
    const limit = pack.structures.find(s => s.id === kind)?.limit ?? null;
    if (limit === null || !structureState) continue;
    const held = kind === 'spacedock' ? structureState.docks.length : Object.values(structureState.pds).reduce((sum, n) => sum + n, 0);
    shopStock[kind] = limit - held;
  }
  /** The shop as rows by where a purchase goes: ships to the space area, ground forces and structures to a planet. */
  const draftItem = (item: ShopItem, index: number | undefined, planet: PlanetDef | null): UnitDraftItem => {
    const name = planet && planets.length > 1 ? t('stage.unitOn', { unit: item.label, planet: planet.name }) : item.label;
    return {
      kind: item.kind, picked: boughtAt(item.kind, index), price: item.price === undefined ? undefined : priceText(item.price),
      takeLabel: name, returnLabel: t('stage.giveBack', { unit: name }),
      // One dock to a planet (85.4): a second one was never placed, and now the button says so.
      blockedReason: item.kind === 'spacedock' && planet && structureOwner(state, 'spacedock', planet.id) !== undefined
        ? t('stage.dockHere') : undefined,
    };
  };
  const unitItems = shopItems.filter(item => !isStructure(item.kind));
  const groundItems = unitItems.filter(item => pack.units[item.kind as UnitId]?.ground);
  const spaceItems = planets.length > 0 ? unitItems.filter(item => !groundItems.includes(item)) : unitItems;
  const productionRows: ShopRow[] = [
    ...(spaceItems.length > 0 ? [{ id: SPACE_ROW, planet: null, items: spaceItems.map(item => draftItem(item, undefined, null)) }] : []),
    ...(groundItems.length > 0 ? planets.map((planet, index) => ({ id: String(index), planet, items: groundItems.map(item => draftItem(item, index, planet)) })) : []),
  ];
  const structureItems = shopItems.filter(item => isStructure(item.kind));
  const constructionRows: ShopRow[] = structureItems.length > 0
    ? planets.map((planet, index) => ({ id: String(index), planet, items: structureItems.map(item => draftItem(item, index, planet)) })) : [];
  const indexOfRow = (rowId: string): number | undefined => (rowId === SPACE_ROW ? undefined : Number(rowId));
  const buyAt = (rowId: string, kind: TokenKind) => buy(kind, indexOfRow(rowId) ?? null);
  /** One bought in a row is taken back, the same way a tap on its ringed token does it. */
  const unbuyAt = (rowId: string, kind: TokenKind) => {
    const index = indexOfRow(rowId);
    const key = boughtKeys(kind, index)[0];
    if (!key) return;
    setTapNote(null);
    unbuy({ kind, owner: parseKey(key).owner, key } as PlacedStack, planetIdOf(index));
  };

  /** My ships in the space area of the system, for the removal beyond the fleet pool: what stands, and what was removed. */
  const removed = fightingFor?.fleetRemovals ?? {};
  const fleetItems: UnitDraftItem[] = units.filter(unit => !pack.units[unit]?.ground).map(unit => ({
    kind: unit as TokenKind, picked: removed[unit] ?? 0, left: acting.systems[slot]?.[unit] ?? 0,
    takeLabel: t('stage.fleetTake', { unit: kindName(unit) }), returnLabel: t('stage.giveBack', { unit: kindName(unit) }),
    // A ship that does not stand here cannot be removed: before the draft there was no token of it to tap, and no rule warns of it.
    blockedReason: (acting.systems[slot]?.[unit] ?? 0) > 0 ? undefined : t('stage.fleetNone'),
  })).filter(item => item.picked > 0 || (item.left ?? 0) > 0);
  const beforeFight = fightingFor && seenBefore(line, fightingFor.id);
  /** How many ships are still over the fleet pool, as the replay says of the action. */
  const fleetOver = fightingFor && beforeFight ? fleetExcess(view, fightingFor, beforeFight, pack, projection.warningsByEntry[fightingFor.id] ?? []) : null;
  const removeShip = (kind: TokenKind, amount: 1 | -1) => { if (fightingFor) updateEntry(fightingFor.id, withFleetRemoval(fightingFor, kind as UnitId, amount)); };

  const sideUnits: UnitCounts = Object.fromEntries(units.map(unit => [unit, boughtOf(unit)]));
  const boughtTotal = Object.keys(bought).filter(key => parseKey(key).owner === side).reduce((sum, key) => sum + bought[key], 0);
  // TODO(P2-210) #ws:ui-warnings #type:dup #size:m #warning-channel #duplicate-of-domain — Перебор ресурсов, флота и мест на борту решает сам (over, класс stage-meter-over): красить счётчики по кодам shortResources/fleetPool/capacitySystem записи — P2 note: an entry's meters now read its codes; a manual build (adjustment of kind build) has no rule check in the domain (applyAdjustment checks no fleet pool, capacity or cost), so without an entry the counters still compare themselves until the domain checks a manual build
  /** My shop counts along: what it costs against what I can pay, and what the system holds after it. */
  const payer = onPurchase?.before ?? beforeTactical ?? acting;
  const spent = productionCost(sideUnits, sideFaction, sideHoldings, pack);
  const spendable = readyResources(payer, pack) + payer.tradeGoods;
  const meters = systemMeters(view, acting.systems[slot] ?? {}, acting.holdings, pack, dockFighterRoom(view, acting, slot, pack));
  const warningEntry = onPurchase ? onPurchase.entryId : tactical?.id;
  const ownWarnings = warningEntry ? projection.warningsByEntry[warningEntry] ?? [] : [];
  /** Over the limit is what the domain says of the entry. */
  const breaks = (code: WarningCode, counted: boolean) => (warningEntry ? ownWarnings.some(w => w.code === code) : counted);
  const meterRows: MeterRow[] = [
    { key: 'resources', now: spent, of: spendable, over: breaks('shortResources', spent > spendable) },
    { key: 'fleet', now: meters.ships, of: acting.fleet, over: breaks('fleetPool', meters.ships > acting.fleet) },
    { key: 'capacity', now: meters.load, of: meters.capacity, over: breaks('capacitySystem', meters.load > meters.capacity) },
  ];
  // The shop answers for what is bought and how it is paid; a route or a landing has its own block in the editor.
  const shopPlaces: WarningPlace[] = onPurchase ? ['production', 'payment', 'units'] : ['production', 'payment'];
  const entryWarnings = ownWarnings.filter(w => placesOf(w).some(place => shopPlaces.includes(place)));
  /** What the board itself breaks here, placed by hand or planned: a planet over its PDS. */
  const repeats = (w: Warning) => entryWarnings.some(e => e.code === w.code && e.params.systemId === w.params.systemId);
  // Capacity and fleet pool as placed by hand; an entry's own check already says it for what the entry does (16.3, 37.1).
  const boardWarnings = [
    ...planetStructureWarnings(state, planets.map(planet => planet.id)),
    ...(onPurchase ? [] : boardSystemWarnings(game, state, slot, pack).filter(w => !repeats(w))),
  ];

  return {
    game, state, shown: shownState ?? state, planets, target, setPlanet, mode, setMode, mine, side, setSide, seated, colours, kindName,
    adjusting, tapNote, handover, onToken, ringed: (key: string) => inBuild && (bought[key] ?? 0) > 0,
    shopItems, buy, boughtTotal, spent, meterRows, entryWarnings, boardWarnings, lossesFor, fights,
    productionRows, constructionRows, shopStock, buyAt, unbuyAt, fleetItems, removeShip, fleetOver,
  };
}

export type StageModel = NonNullable<ReturnType<typeof useStage>>;
