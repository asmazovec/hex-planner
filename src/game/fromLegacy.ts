/**
 * The bridge from the old model while both live: the old `Game` read as a `Table`, the ids between the two, the state of
 * an old game as a board and the entries of its plan as turns (the views of a board in the old model are in
 * `legacyViews.ts`). Goes with the old code (step 5 of the move).
 */
import { playersOf } from '../domain/players';
import { startOf } from '../domain/replay/timeline';
import type { Act, DataPack, Entry, Game, GameState, UnitCounts } from '../domain/types';
import type { ComponentUse, Expedition, Tactical, Transaction, Turn } from './actions';
import { applyAll } from './apply';
import { emptyBoard } from './board';
import type { GameEvent, Place } from './events';
import { SOURCES, blankViews, legacyEvents, legacyGame } from './legacyViews';
import type { Board, PlayerId, Table } from './types';

export { legacyState, legacyViews, legacyGame, legacyKey } from './legacyViews';

const idOfSeat = (seat: number): PlayerId => `p${seat}`;
/** The seat of the first player who is not at the table: the seats of the table stop at eight. */
export const GHOST_SEAT = 100;

/** Me and the opponents become players `p<seat>`, in seat order; the viewer is my player. */
export function tableOf(game: Game): Table {
  const players = playersOf(game).map(p => {
    const start = p.id === 'me' ? game.start.me : game.start.opponents[p.id];
    const technologies = start?.technologies ?? [];
    return {
      id: idOfSeat(p.seat), faction: p.faction, seat: p.seat, color: p.color, legacyId: p.id,
      setup: technologies.length > 0 ? { technologies: [...technologies] } : {},
    };
  }).sort((a, b) => a.seat - b.seat);
  // Units or planets written by hand for someone who is not at the table (a test board, a scratch game): they stand there
  // as players with no faction, after the real ones, so that what they hold is on the board.
  const known = new Set(playersOf(game).map(p => p.id));
  const strays = [...new Set([
    ...Object.values(game.enemyUnits).flatMap(byOwner => Object.keys(byOwner)), ...Object.values(game.enemyGround).flatMap(byOwner => Object.keys(byOwner)),
    ...Object.values(game.planetOwner),
  ])].filter(id => !known.has(id)).sort();
  strays.forEach((id, i) => players.push({ id: idOfSeat(GHOST_SEAT + i), faction: '', seat: GHOST_SEAT + i, color: 0, legacyId: id, setup: {} }));
  const table: Table = {
    id: game.id, name: game.name ?? '', expansions: [...game.expansions], layout: game.layout, map: { ...game.map },
    players, viewer: idOfSeat(game.seat),
  };
  SOURCES.set(table, game);
  return table;
}

/** The old id (`me` or an opponent id) of a player; the player's own id when the table did not come from an old game. */
export const legacyPlayer = (table: Table, player: PlayerId): string =>
  table.players.find(p => p.id === player)?.legacyId ?? player;

/** The player an old id stands for. */
export const playerOfLegacy = (table: Table, legacy: string): PlayerId | undefined =>
  table.players.find(p => (p.legacyId ?? p.id) === legacy)?.id;

// ---------------------------------------------------------------------------------------------------------------------
// The state of an old game as a board, and the entries of its plan as turns.

/** The board whose states, seen through the old model, are `state` (mine, with `rivals`): the old game's whole situation as events. */
export function boardFromLegacy(table: Table, state: GameState, pack: DataPack): Board {
  const game = legacyGame(table, emptyBoard(table));
  const states: Record<string, GameState> = { me: state, ...(state.rivals ?? {}) };
  // Someone who is not at the table (see `tableOf`) holds what was written for them by hand, which no entry changes.
  const source = SOURCES.get(table);
  for (const p of table.players.filter(q => q.seat >= GHOST_SEAT)) {
    const key = p.legacyId ?? p.id;
    const pick = (record: Game['enemyUnits'] | undefined): Record<string, UnitCounts> => Object.fromEntries(Object.entries(record ?? {}).flatMap(([place, byOwner]) => (byOwner[key] ? [[place, { ...byOwner[key] }]] : [])));
    const control = Object.fromEntries(Object.entries(source?.planetOwner ?? {}).filter(([, owner]) => owner === key).map(([id]) => [id, 'me' as const]));
    states[key] = { ...blankViews(table, game).states[key], systems: pick(source?.enemyUnits), ground: pick(source?.enemyGround), control };
  }
  return applyAll(emptyBoard(table), legacyEvents(table, pack, blankViews(table, game), { game, states }, table.viewer));
}

/**
 * The board an old game begins with, what the user placed by hand at setup included: units of the opponents, who
 * controls what, docks and PDS, the starting holdings, leaders, the Fracture and the expedition.
 */
export function boardOf(game: Game, pack: DataPack): Board {
  const table = tableOf(game);
  let board = boardFromLegacy(table, startOf(game, pack), pack);
  const events: GameEvent[] = [];
  if (game.fracture.tiles && Object.keys(game.fracture.tiles).length > 0) events.push({ type: 'FractureOpened', tiles: { ...game.fracture.tiles } });
  for (const [slice, by] of Object.entries(game.expedition.slices)) {
    if (by) events.push({ type: 'ExpeditionSliceTaken', player: by === 'me' ? table.viewer : table.players.find(p => p.id !== table.viewer)!.id, slice });
  }
  board = applyAll(board, events);
  return board;
}

const SLOT = /^-?\d+,-?\d+$/;

/** A tactical entry of the old plan as a turn of its player. A source is a planet when the pack says so, else a slot key. */
export function turnOf(table: Table, entry: Entry, pack?: DataPack): Turn {
  const owner = entry.owner ?? 'me';
  const player = playerOfLegacy(table, owner) ?? table.viewer;
  const key = (id: string): PlayerId => playerOfLegacy(table, id) ?? id;
  const isPlanet = (id: string): boolean => (pack ? id in pack.planets : !SLOT.test(id) && !(id in table.map));
  const placeOf = (id: string): Place => (isPlanet(id) ? { planet: id } : { slot: id });
  const acts = ('acts' in entry ? entry.acts ?? [] : []).map((act): Transaction | Expedition => (act.kind === 'transaction'
    ? { kind: 'transaction', with: key(act.with), give: { ...act.give, ...(act.give.components ? { components: [...act.give.components] } : {}) }, get: { ...act.get, ...(act.get.components ? { components: [...act.get.components] } : {}) } }
    : { kind: 'expedition', slice: act.sliceId, payment: act.payment }));
  const used: ComponentUse[] = (entry.uses ?? []).map(component => ({ component, ...(entry.useChoices?.[component] ? { choices: entry.useChoices[component] } : {}) }));
  const common = {
    id: entry.id, player, status: entry.status, acts, used,
    ...(entry.gains ? { gains: [...entry.gains] } : {}), ...(entry.spends ? { spends: [...entry.spends] } : {}),
    ...(entry.choices ? { choices: entry.choices } : {}),
  };
  if (entry.type !== 'tactical') throw new Error(`turnOf: only a tactical entry is converted (${entry.type})`);
  const action: Tactical = {
    kind: 'tactical', system: entry.systemId,
    ...(entry.free ? { free: true } : {}),
    movement: entry.moves.map(m => ({
      from: placeOf(m.from), units: m.units, ...(m.via ? { via: m.via } : {}), ...(m.pickupOf ? { pickupOf: m.pickupOf } : {}), ...(m.structures ? { structures: m.structures } : {}),
    })),
    ...(entry.losses ? { spaceCombat: { [player]: entry.losses } } : {}),
    invasion: entry.landings.map(l => ({ planet: l.planetId, units: l.units, ...(l.from ? { from: l.from } : {}), ...(l.structures ? { structures: l.structures } : {}) })),
    ...(entry.groundLosses ? { groundCombat: Object.fromEntries(Object.entries(entry.groundLosses).map(([planet, units]) => [planet, { [player]: units }])) } : {}),
    production: { units: entry.production, ...(entry.productionGround ? { ground: entry.productionGround } : {}), ...(entry.shipsTo ? { shipsTo: entry.shipsTo } : {}), payment: entry.payment },
    ...(entry.fleetRemovals ? { fleetRemovals: entry.fleetRemovals } : {}),
    ...(entry.custodiansPayment ? { custodians: entry.custodiansPayment } : {}),
  };
  return { ...common, action };
}

/** The old entry a tactical turn was made from, for the checks of the old code that read one. */
export function legacyEntry(table: Table, turn: Turn): Entry {
  const action = turn.action;
  if (action.kind !== 'tactical') throw new Error('legacyEntry: only a tactical turn');
  const owner = legacyPlayer(table, turn.player);
  const slotOrPlanet = (at: Place): string => ('slot' in at ? at.slot : at.planet);
  const mine = (units: Record<string, UnitCounts> | undefined): UnitCounts | undefined => units?.[turn.player];
  const groundLosses = action.groundCombat
    ? Object.fromEntries(Object.entries(action.groundCombat).flatMap(([planet, by]) => (mine(by) ? [[planet, mine(by)!]] : [])))
    : undefined;
  const losses = mine(action.spaceCombat);
  return {
    id: turn.id, phase: 'action', status: turn.status, type: 'tactical',
    ...(owner === 'me' ? {} : { owner }),
    systemId: action.system,
    moves: action.movement.map(f => ({ from: slotOrPlanet(f.from), units: f.units, ...(f.via ? { via: f.via } : {}), ...(f.pickupOf ? { pickupOf: f.pickupOf } : {}), ...(f.structures ? { structures: f.structures } : {}) })),
    landings: action.invasion.map(l => ({ planetId: l.planet, units: l.units, ...(l.from ? { from: l.from } : {}), ...(l.structures ? { structures: l.structures } : {}) })),
    production: action.production?.units ?? {}, payment: action.production?.payment ?? { planets: [], tradeGoods: 0 },
    ...(action.custodians ? { custodiansPayment: action.custodians } : {}),
    ...(losses ? { losses } : {}), ...(groundLosses && Object.keys(groundLosses).length > 0 ? { groundLosses } : {}),
    ...(action.fleetRemovals ? { fleetRemovals: action.fleetRemovals } : {}),
    ...(action.production?.ground ? { productionGround: action.production.ground } : {}),
    ...(action.production?.shipsTo ? { shipsTo: action.production.shipsTo } : {}),
    ...(action.free ? { free: true } : {}),
    acts: turn.acts.map((act): Act => (act.kind === 'transaction'
      ? { kind: 'transaction', with: legacyPlayer(table, act.with), give: act.give, get: act.get }
      : { kind: 'expedition', sliceId: act.slice, payment: act.payment })),
    ...(turn.gains ? { gains: turn.gains } : {}), ...(turn.spends ? { spends: turn.spends } : {}),
    ...(turn.used.length > 0 ? { uses: turn.used.map(u => u.component) } : {}),
    ...(turn.used.some(u => u.choices) ? { useChoices: Object.fromEntries(turn.used.flatMap(u => (u.choices ? [[u.component, u.choices]] : []))) } : {}),
    ...(turn.choices ? { choices: turn.choices } : {}),
  } as Entry;
}
