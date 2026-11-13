/**
 * The board seen through the old model, and back: every player's `GameState` of a board (mine with the rivals, laws and
 * the rest "on my state only"), the `Game` those states are asked with, and the events that take one set of states to
 * another. While the old code lives the existing component effects run on these views, and the differential test
 * compares the two models through them. Goes with the old code (step 5 of the move).
 */
import { componentById, noteAddress } from '../domain/components';
import { gameAs } from '../domain/players';
import { breakthroughOf } from '../domain/effects/breakthrough';
import { emptyHoldings } from '../domain/holdings';
import type {
  DataPack, Game, GameState, Holdings, StructureCounts, UnitCounts,
} from '../domain/types';
import { SAVE_FORMAT } from '../domain/types';
import { emptyBoard } from './board';
import type { Cause, GameEvent, Place } from './events';
import type { Board, CardHold, ComponentId, PlayerId, Table } from './types';

/** The game a table came from, kept for the fields the table and board have no place for yet (ingress, the Thunder's Edge system). */
export const SOURCES = new WeakMap<Table, Game>();

/** The id the old model gives a player: `me` for the viewer, the opponent's own id for the rest. */
export const legacyKey = (table: Table, player: PlayerId): string =>
  player === table.viewer ? 'me' : table.players.find(p => p.id === player)?.legacyId ?? player;

export const playerOfKey = (table: Table, key: string): PlayerId | undefined =>
  key === 'me' ? table.viewer : table.players.find(p => (p.legacyId ?? p.id) === key)?.id;

const EMPTY_FRACTURE = { active: false, ingress: [] as string[], seat: null as number | null };
const fractures = new WeakMap<object, Game['fracture']>();

/** The viewer's game as the old code reads it: the map and who sits where, the planets by owner, nothing placed by hand. */
export function legacyGame(table: Table, board: Board): Game {
  const source = SOURCES.get(table);
  const viewer = table.players.find(p => p.id === table.viewer)!;
  const control: Game['planetControl'] = {};
  const owners: Game['planetOwner'] = {};
  for (const [id, planet] of Object.entries(board.planets)) {
    if (planet.owner === undefined) continue;
    const key = legacyKey(table, planet.owner);
    control[id] = key === 'me' ? 'me' : 'enemy';
    if (key !== 'me') owners[id] = key;
  }
  let fracture = fractures.get(board.common.fracture);
  if (!fracture) {
    fracture = { ...(source?.fracture ?? EMPTY_FRACTURE), ...(board.common.fracture.open ? { tiles: board.common.fracture.tiles } : {}) };
    fractures.set(board.common.fracture, fracture);
  }
  const slices: Record<string, 'me' | 'other' | null> = { ...source?.expedition.slices };
  for (const [slice, by] of Object.entries(board.common.expedition)) slices[slice] = by === table.viewer ? 'me' : 'other';
  const vpOf = (key: string): number => source?.opponents.find(o => o.id === key)?.vp ?? 0;
  return {
    id: table.id, name: table.name, format: SAVE_FORMAT, schemaVersion: 1, dataVersion: source?.dataVersion ?? '', expansions: table.expansions,
    playerCount: source?.playerCount ?? table.players.length, layout: table.layout, faction: viewer.faction, seat: viewer.seat, color: viewer.color, vp: source?.vp ?? 0,
    map: table.map,
    opponents: table.players.filter(p => p.id !== table.viewer).map(p => ({
      id: legacyKey(table, p.id), faction: p.faction, vp: vpOf(legacyKey(table, p.id)), seat: p.seat, color: p.color,
    })),
    start: source?.start ?? { me: {}, opponents: {} }, enemyUnits: {}, enemyGround: {}, planetControl: control, planetOwner: owners,
    docks: [], pds: {},
    expedition: { slices, thundersEdgeSystem: source?.expedition.thundersEdgeSystem ?? null }, fracture,
    plans: [], activePlanId: '',
  };
}

const kindOf = (id: ComponentId): string => id.slice(0, id.indexOf(':'));

/** What a player's cards are as the old `Holdings`. */
export function holdingsOfCards(cards: Record<ComponentId, CardHold>): Holdings {
  const h = emptyHoldings();
  for (const [id, hold] of Object.entries(cards)) {
    const exhausted = hold.state === 'exhausted';
    switch (kindOf(id)) {
      case 'technology': h.technologies.push(id); break;
      case 'actionCard': for (let i = 0; i < hold.count; i += 1) h.hand.push(id); break;
      case 'relic': h.relics.push(id); break;
      case 'promissory': h.promissory.push(id); break;
      case 'secretObjective': (hold.state === 'inPlay' ? h.scored : h.secrets).push(id); break;
      case 'publicObjective': h.scored.push(id); break;
      case 'exploration': for (let i = 0; i < hold.count; i += 1) h.found.push(id); break;
      case 'leader':
        if (hold.state !== 'locked') h.leaders[id] = hold.state === 'exhausted' ? 'exhausted' : hold.state === 'purged' ? 'purged' : 'unlocked';
        break;
      case 'breakthrough': h.breakthrough = exhausted ? 'exhausted' : 'held'; break;
      default: break;
    }
    if (exhausted && kindOf(id) !== 'leader' && kindOf(id) !== 'breakthrough') h.exhausted.push(id);
  }
  return h;
}

/** The cards a `Holdings` is: the inverse of `holdingsOfCards`. */
export function cardsOfHoldings(h: Holdings, breakthrough?: ComponentId): Record<ComponentId, CardHold> {
  const cards: Record<ComponentId, CardHold> = {};
  const put = (id: string, state: CardHold['state'], count = 1): void => {
    cards[id] = { state: cards[id]?.state === 'exhausted' ? 'exhausted' : state, count: (cards[id]?.count ?? 0) + count };
  };
  const state = (id: string): CardHold['state'] => (h.exhausted.includes(id) ? 'exhausted' : 'ready');
  for (const id of h.technologies) put(id, state(id));
  for (const id of h.hand) put(id, 'ready');
  for (const id of h.relics) put(id, state(id));
  for (const id of h.promissory) put(id, 'ready');
  for (const id of h.secrets) put(id, 'ready');
  for (const id of h.scored) put(id, 'inPlay');
  for (const id of h.found) put(id, 'ready');
  for (const [id, leader] of Object.entries(h.leaders)) cards[id] = { state: leader === 'unlocked' ? 'ready' : leader, count: 1 };
  if (h.breakthrough && breakthrough) cards[breakthrough] = { state: h.breakthrough === 'exhausted' ? 'exhausted' : 'ready', count: 1 };
  // A technology exhausted without being held (a component played that was not there) is nothing on a board: the warning stays, the card does not appear.
  for (const id of h.exhausted) if (!cards[id] && !id.startsWith('technology:')) cards[id] = { state: 'exhausted', count: 1 };
  return cards;
}

/** The planet's owner as the old states say it: mine, else whoever says `me`, else the first rival for an enemy planet with no owner. */
function ownerFromStates(states: Record<string, GameState>, planetId: string): string | undefined {
  if (states.me.control[planetId] === 'me') return 'me';
  const claimed = Object.entries(states).find(([key, s]) => key !== 'me' && s.control[planetId] === 'me');
  if (claimed) return claimed[0];
  return states.me.control[planetId] === 'enemy' ? Object.keys(states).find(key => key !== 'me') : undefined;
}

export interface LegacyViews {
  /** The viewer's game. */
  game: Game;
  /** Every player's state by old id: `me` is the viewer's, which holds the rivals. */
  states: Record<string, GameState>;
}

const countsOf = <T extends object>(units: T | undefined): T => Object.fromEntries(Object.entries(units ?? {}).filter(([, n]) => ((n as number | undefined) ?? 0) > 0)) as T;
const nonEmpty = (counts: object | undefined): boolean => Object.keys(counts ?? {}).length > 0;

/** One player's state of the board. The viewer's carries the rivals and what belongs to the whole game. */
export function legacyState(table: Table, board: Board, pack: DataPack, player: PlayerId): GameState {
  const views = legacyViews(table, board, pack);
  const key = legacyKey(table, player);
  if (key === 'me') return views.states.me;
  // A rival seen as "mine": its own state, with nothing of the whole game on it.
  return views.states[key];
}

export function legacyViews(table: Table, board: Board, pack: DataPack): LegacyViews {
  const game = legacyGame(table, board);
  const states: Record<string, GameState> = {};
  for (const p of table.players) states[legacyKey(table, p.id)] = ownState(table, board, p.id);
  const me = states.me;
  me.rivals = Object.fromEntries(Object.entries(states).filter(([key]) => key !== 'me'));
  me.rivalHolds = {};
  me.opponentVp = Object.fromEntries(table.players.filter(p => p.id !== table.viewer).map(p => [legacyKey(table, p.id), board.players[p.id]?.vp ?? 0]));
  me.laws = board.common.laws.map(l => l.id);
  me.revealed = [...board.common.revealed];
  const elected = board.common.laws.filter(l => l.elected !== undefined);
  if (elected.length > 0) me.lawOwners = Object.fromEntries(elected.map(l => [l.id, table.players.find(p => p.id === l.elected)?.faction ?? '']));
  const attached = Object.entries(board.planets).filter(([, planet]) => planet.attached.length > 0);
  if (attached.length > 0) me.attachments = Object.fromEntries(attached.map(([id, planet]) => [id, [...planet.attached]]));
  const tokens: Record<string, string> = {};
  for (const [slot, types] of Object.entries(board.common.wormholeTokens)) for (const type of types) tokens[type] = slot;
  if (Object.keys(tokens).length > 0) (me as GameState & { wormholeTokens?: Record<string, string> }).wormholeTokens = tokens;
  void pack;
  return { game, states };
}

function ownState(table: Table, board: Board, player: PlayerId): GameState {
  const p = board.players[player];
  const key = legacyKey(table, player);
  const factionOf = table.players.find(x => x.id === player)?.faction;
  const systems: Record<string, UnitCounts> = {};
  const afloat: Record<string, StructureCounts> = {};
  const tokensOnMap: string[] = [];
  for (const [slot, system] of Object.entries(board.systems)) {
    if (nonEmpty(countsOf(system.ships[player]))) systems[slot] = countsOf(system.ships[player]);
    if (nonEmpty(countsOf(system.afloat[player]))) afloat[slot] = { ...countsOf(system.afloat[player]) };
    if (system.tokens.includes(player)) tokensOnMap.push(slot);
  }
  const ground: Record<string, UnitCounts> = {};
  const exhausted: string[] = [];
  const control: GameState['control'] = {};
  const docks: string[] = [];
  const pds: Record<string, number> = {};
  for (const [id, planet] of Object.entries(board.planets)) {
    if (nonEmpty(countsOf(planet.ground[player]))) ground[id] = countsOf(planet.ground[player]);
    if (planet.owner !== undefined) control[id] = planet.owner === player ? 'me' : 'enemy';
    if (planet.exhausted && (planet.owner === player || (planet.owner === undefined && key === 'me'))) exhausted.push(id);
    if (planet.owner === player) {
      if ((planet.structures.spacedock ?? 0) > 0) docks.push(id);
      if ((planet.structures.pds ?? 0) > 0) pds[id] = planet.structures.pds ?? 0;
    }
  }
  const others = table.players.filter(x => x.id !== player);
  return {
    faction: factionOf,
    systems, ground, exhausted, control, tokensOnMap,
    tradeGoods: p?.tradeGoods ?? 0, commodities: p?.commodities ?? 0,
    tactic: p?.pools.tactic ?? 0, fleet: p?.pools.fleet ?? 0, strategy: p?.pools.strategy ?? 0, vp: p?.vp ?? 0,
    opponentVp: Object.fromEntries(others.map(o => [legacyKey(table, o.id) === 'me' ? 'me' : legacyKey(table, o.id), board.players[o.id]?.vp ?? 0])),
    holdings: holdingsOfCards(p?.cards ?? {}),
    docks, pds,
    ...(nonEmpty(afloat) ? { afloat } : {}),
    ...(board.common.custodians ? {} : { custodiansRemoved: true }),
  };
}

/** The views of a board that has nothing on it: where the events of a legacy start begin. */
export function blankViews(table: Table, game: Game): LegacyViews {
  const board = emptyBoard(table);
  const states: Record<string, GameState> = {};
  for (const p of table.players) {
    const s = ownState(table, board, p.id);
    s.custodiansRemoved = undefined;
    states[legacyKey(table, p.id)] = s;
  }
  return { game, states };
}

/** The cards of a player as a view holds them, the breakthrough under the id of its faction's. */
function cardsIn(state: GameState, pack: DataPack): Record<ComponentId, CardHold> {
  return cardsOfHoldings(state.holdings, state.faction === undefined ? undefined : breakthroughOf(pack, state.faction));
}

const placeOf = (key: string, isPlanet: boolean): Place => (isPlanet ? { planet: key } : { slot: key });

function shiftEvents(player: PlayerId, at: Place, before: UnitCounts, after: UnitCounts, cause: Cause | undefined): GameEvent[] {
  const gain: UnitCounts = {};
  const loss: UnitCounts = {};
  for (const id of new Set([...Object.keys(before), ...Object.keys(after)]) as Set<keyof UnitCounts>) {
    const d = (after[id] ?? 0) - (before[id] ?? 0);
    if (d > 0) gain[id] = d;
    if (d < 0) loss[id] = -d;
  }
  return [
    ...(nonEmpty(loss) ? [{ type: 'UnitsRemoved', player, at, units: loss, ...(cause ? { cause } : {}) } as GameEvent] : []),
    ...(nonEmpty(gain) ? [{ type: 'UnitsPlaced', player, at, units: gain, ...(cause ? { cause } : {}) } as GameEvent] : []),
  ];
}

/**
 * The events that take the views `before` to the views `after`, for what a board can say. `actor` is the player the
 * whole-game facts are put to (the custodians token), `cause` goes on every event. Pairs of structures and units come
 * as `Placed` and `Removed` by the amount that changed; a planet that changes hands is a `PlanetGained`.
 */
export function legacyEvents(table: Table, pack: DataPack, before: LegacyViews, after: LegacyViews, actor: PlayerId, cause?: Cause): GameEvent[] {
  const out: GameEvent[] = [];
  const c = cause ? { cause } : {};
  const ids = table.players.map(p => p.id);
  const stateOf = (v: LegacyViews, player: PlayerId): GameState => v.states[legacyKey(table, player)];
  const planetIds = new Set<string>();
  const slots = new Set<string>();
  for (const v of [before, after]) {
    for (const s of Object.values(v.states)) {
      for (const id of [...Object.keys(s.ground), ...Object.keys(s.control), ...s.exhausted, ...s.docks, ...Object.keys(s.pds)]) planetIds.add(id);
      for (const slot of [...Object.keys(s.systems), ...s.tokensOnMap, ...Object.keys(s.afloat ?? {})]) slots.add(slot);
    }
  }
  const ownerOf = (v: LegacyViews, id: string): PlayerId | undefined => {
    const key = ownerFromStates(v.states, id);
    return key === undefined ? undefined : playerOfKey(table, key);
  };
  // Goods, tokens, points.
  for (const player of ids) {
    const was = stateOf(before, player);
    const now = stateOf(after, player);
    const delta = { tactic: now.tactic - was.tactic, fleet: now.fleet - was.fleet, strategy: now.strategy - was.strategy };
    if (delta.tactic || delta.fleet || delta.strategy) {
      out.push({ type: 'TokensChanged', player, delta: Object.fromEntries(Object.entries(delta).filter(([, n]) => n !== 0)), ...c });
    }
    if (now.tradeGoods !== was.tradeGoods) out.push({ type: 'TradeGoodsChanged', player, delta: now.tradeGoods - was.tradeGoods, ...c });
    if (now.commodities !== was.commodities) out.push({ type: 'CommoditiesChanged', player, delta: now.commodities - was.commodities, ...c });
    let vp = now.vp - was.vp;
    const key = legacyKey(table, player);
    // The viewer's state counts a rival's points too (`opponentVp`), for an effect that changed only that.
    if (vp === 0 && key !== 'me') vp = (stateOf(after, table.viewer).opponentVp[key] ?? 0) - (stateOf(before, table.viewer).opponentVp[key] ?? 0);
    if (vp !== 0) out.push({ type: 'PointsChanged', player, delta: vp, ...c });
  }
  // Structures that go before the planet changes hands, those that come after it.
  const structuresOn = (v: LegacyViews, player: PlayerId, id: string): StructureCounts => {
    const s = stateOf(v, player);
    return { ...(s.docks.includes(id) ? { spacedock: 1 } : {}), ...((s.pds[id] ?? 0) > 0 ? { pds: s.pds[id] } : {}) };
  };
  const structureDelta = (player: PlayerId, id: string): { gain: StructureCounts; loss: StructureCounts } => {
    const was = structuresOn(before, player, id);
    const now = structuresOn(after, player, id);
    const gain: StructureCounts = {};
    const loss: StructureCounts = {};
    for (const kind of ['spacedock', 'pds'] as const) {
      const d = (now[kind] ?? 0) - (was[kind] ?? 0);
      if (d > 0) gain[kind] = d;
      if (d < 0) loss[kind] = -d;
    }
    return { gain, loss };
  };
  for (const id of planetIds) {
    for (const player of ids) {
      const { loss } = structureDelta(player, id);
      if (nonEmpty(loss) && ownerOf(before, id) === player) out.push({ type: 'StructureRemoved', player, at: { planet: id }, structures: loss, ...c });
    }
  }
  for (const id of planetIds) {
    const was = ownerOf(before, id);
    const now = ownerOf(after, id);
    if (was === now) continue;
    if (now !== undefined) out.push({ type: 'PlanetGained', player: now, planet: id, ...c });
    else out.push({ type: 'PlanetLost', planet: id, ...c });
  }
  for (const id of planetIds) {
    const owner = ownerOf(after, id);
    // A planet is exhausted as its holder's list says; one no one holds, as any list does (a payment with a planet one does not hold lands in the payer's list only).
    const exhaustedIn = (v: LegacyViews): boolean => {
      const holder = ownerOf(v, id);
      return holder === undefined ? ids.some(p => stateOf(v, p).exhausted.includes(id)) : stateOf(v, holder).exhausted.includes(id);
    };
    const was = exhaustedIn(before);
    const now = exhaustedIn(after);
    if (was === now) continue;
    // An exhausted planet no one holds is the viewer's, as the old model has it.
    const player = owner ?? table.viewer;
    out.push({ type: now ? 'PlanetExhausted' : 'PlanetReadied', player, planet: id, ...c });
  }
  for (const id of planetIds) {
    const owner = ownerOf(after, id);
    if (owner === undefined) continue;
    const { gain } = structureDelta(owner, id);
    if (nonEmpty(gain)) out.push({ type: 'StructurePlaced', player: owner, at: { planet: id }, structures: gain, ...c });
  }
  // Units.
  for (const player of ids) {
    const was = stateOf(before, player);
    const now = stateOf(after, player);
    for (const slot of slots) out.push(...shiftEvents(player, placeOf(slot, false), was.systems[slot] ?? {}, now.systems[slot] ?? {}, cause));
    for (const id of planetIds) out.push(...shiftEvents(player, placeOf(id, true), was.ground[id] ?? {}, now.ground[id] ?? {}, cause));
    for (const slot of slots) {
      const a = was.afloat?.[slot] ?? {};
      const b = now.afloat?.[slot] ?? {};
      for (const kind of ['spacedock', 'pds'] as const) {
        const d = (b[kind] ?? 0) - (a[kind] ?? 0);
        if (d > 0) out.push({ type: 'StructurePlaced', player, at: { slot }, structures: { [kind]: d }, ...c });
        if (d < 0) out.push({ type: 'StructureRemoved', player, at: { slot }, structures: { [kind]: -d }, ...c });
      }
    }
    for (const slot of slots) {
      const had = was.tokensOnMap.includes(slot);
      const has = now.tokensOnMap.includes(slot);
      if (has && !had) out.push({ type: 'SystemActivated', player, system: slot, ...c });
      if (had && !has) out.push({ type: 'TokenReturned', player, system: slot, ...c });
    }
    // Cards.
    const cardsWas = cardsIn(was, pack);
    const cardsNow = cardsIn(now, pack);
    for (const id of new Set([...Object.keys(cardsWas), ...Object.keys(cardsNow)])) {
      const a = cardsWas[id];
      const b = cardsNow[id];
      const real = id;
      if (!a && b) {
        out.push({ type: 'CardGained', player, card: real, count: b.count, ...(b.state === 'inPlay' || b.state === 'locked' ? { state: b.state } : {}), ...c });
        if (b.state === 'exhausted') out.push({ type: 'CardExhausted', player, card: real, ...c });
        if (b.state === 'purged') out.push({ type: 'CardPurged', player, card: real, ...c });
      }
      else if (a && !b) out.push({ type: 'CardLost', player, card: real, count: a.count, ...c });
      else if (a && b) {
        if (b.count > a.count) out.push({ type: 'CardGained', player, card: real, count: b.count - a.count, ...c });
        if (b.count < a.count) out.push({ type: 'CardLost', player, card: real, count: a.count - b.count, ...c });
        if (a.state !== b.state) {
          if (b.state === 'exhausted') out.push({ type: 'CardExhausted', player, card: real, ...c });
          else if (b.state === 'purged') out.push({ type: 'CardPurged', player, card: real, ...c });
          else if (a.state === 'locked') out.push({ type: 'CardUnlocked', player, card: real, ...c });
          else if (b.state === 'inPlay') out.push({ type: 'ObjectiveScored', player, objective: real, ...c });
          else if (a.state === 'exhausted') out.push({ type: 'CardReadied', player, card: real, ...c });
        }
      }
    }
  }
  // The whole game.
  const me = (v: LegacyViews): GameState => v.states.me;
  const lawsWas = me(before).laws ?? [];
  const lawsNow = me(after).laws ?? [];
  for (const law of lawsNow.filter(id => !lawsWas.includes(id))) {
    const faction = me(after).lawOwners?.[law];
    const elected = faction === undefined ? undefined : table.players.find(p => p.faction === faction)?.id;
    out.push({ type: 'LawEnacted', law, ...(elected === undefined ? {} : { elected }), ...c });
  }
  for (const law of lawsWas.filter(id => !lawsNow.includes(id))) out.push({ type: 'LawDiscarded', law, ...c });
  for (const objective of (me(after).revealed ?? []).filter(id => !(me(before).revealed ?? []).includes(id))) out.push({ type: 'ObjectiveRevealed', objective, ...c });
  for (const [planet, cards] of Object.entries(me(after).attachments ?? {})) {
    for (const card of cards) {
      if (!(me(before).attachments?.[planet] ?? []).includes(card) && !lawsNow.includes(card)) out.push({ type: 'CardAttached', planet, card, ...c });
      else if (!(me(before).attachments?.[planet] ?? []).includes(card)) out.push({ type: 'CardAttached', planet, card, ...c });
    }
  }
  if (me(after).custodiansRemoved && !me(before).custodiansRemoved) out.push({ type: 'CustodiansRemoved', player: actor, ...c });
  const tokensWas = (me(before) as GameState & { wormholeTokens?: Record<string, string> }).wormholeTokens ?? {};
  const tokensNow = (me(after) as GameState & { wormholeTokens?: Record<string, string> }).wormholeTokens ?? {};
  for (const [wormhole, system] of Object.entries(tokensNow)) if (tokensWas[wormhole] !== system) out.push({ type: 'WormholeTokenPlaced', system, wormhole, ...c });
  return out;
}

export const knownComponent = (pack: DataPack, id: string): boolean => componentById(pack, id) !== undefined || noteAddress(id) !== undefined;

export interface PlayerView {
  views: LegacyViews;
  /** The game as this player sees it: their faction and seat, everyone else as an opponent. */
  game: Game;
  /** Their own state, and the viewer's (which holds the laws and the rivals). */
  state: GameState;
  shared: GameState;
  /** Their id in the old model. */
  key: string;
}

/** The views of a board from one player's side: what the old functions are given for that player. */
export function viewFor(table: Table, board: Board, pack: DataPack, player: PlayerId, views = legacyViews(table, board, pack)): PlayerView {
  const key = legacyKey(table, player);
  return { views, game: key === 'me' ? views.game : gameAs(views.game, key), state: views.states[key], shared: views.states.me, key };
}
