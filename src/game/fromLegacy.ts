/**
 * The bridge from the old model while both live: the old `Game` read as a `Table`, the ids between the two, the state of
 * an old game as a board and the entries of its plan as turns (the views of a board in the old model are in
 * `legacyViews.ts`). Goes with the old code (step 5 of the move).
 */
import { playersOf } from '../domain/players';
import { startOf } from '../domain/replay/timeline';
import type { Act, DataPack, Entry, Game, GameState, UnitCounts } from '../domain/types';
import type { Action, ComponentUse, Expedition, Transaction, Turn } from './actions';
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
    // Someone who is not at the table took it (written by hand): the slice is theirs all the same.
    const taker = by === 'me' ? table.viewer : table.players.find(p => p.id !== table.viewer)?.id ?? 'other';
    if (by) events.push({ type: 'ExpeditionSliceTaken', player: taker, slice });
  }
  if (game.expedition.thundersEdgeSystem !== null) events.push({ type: 'ThundersEdgeSlotSet', system: game.expedition.thundersEdgeSystem });
  board = applyAll(board, events);
  return board;
}

const SLOT = /^-?\d+,-?\d+$/;

/**
 * An entry of the old plan as a turn of its player. A source is a planet when the pack says so, else a slot key. Warfare's
 * free tactical action (`linked`, the entry with `fromCard` of this card) becomes the nested action of the card, with the
 * card's status.
 */
export function turnOf(table: Table, entry: Entry, pack?: DataPack, linked?: Entry): Turn {
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
    id: entry.id, player, status: entry.status, phase: entry.phase, acts, used,
    ...(entry.gains ? { gains: [...entry.gains] } : {}), ...(entry.spends ? { spends: [...entry.spends] } : {}),
    ...(entry.choices && entry.type !== 'adjustment' ? { choices: entry.choices } : {}),
  };
  let action: Action;
  switch (entry.type) {
    case 'tactical':
      action = {
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
      break;
    case 'strategic':
      action = {
        kind: 'strategic', ...(entry.card !== undefined ? { card: entry.card } : {}), ...(entry.forToken ? { forToken: true } : {}), ...(entry.effects ? { effects: entry.effects } : {}),
        ...(linked ? { nested: [{ ...turnOf(table, linked, pack), status: entry.status }] } : {}),
      };
      break;
    case 'secondary':
      action = { kind: 'secondary', ...(entry.card !== undefined ? { card: entry.card } : {}), ...(entry.effects ? { effects: entry.effects } : {}) };
      break;
    case 'component':
      action = { kind: 'component', note: entry.note, ...(entry.componentId !== undefined ? { component: entry.componentId } : {}), ...(entry.effects ? { effects: entry.effects } : {}), ...(entry.payment ? { payment: entry.payment } : {}) };
      break;
    case 'pass':
      action = { kind: 'pass' };
      break;
    case 'statusTokens':
      action = {
        kind: 'status', tactic: entry.tactic, fleet: entry.fleet, strategy: entry.strategy,
        ...(entry.vp !== undefined ? { vp: entry.vp } : {}),
        ...(entry.opponentVp ? { opponentVp: Object.fromEntries(Object.entries(entry.opponentVp).map(([id, n]) => [key(id), n])) } : {}),
        ...(entry.scored ? { scored: [...entry.scored] } : {}), ...(entry.spend ? { spend: entry.spend } : {}),
      };
      break;
    case 'adjustment':
      action = entry.phase === 'agenda'
        ? { kind: 'agenda', label: entry.label, delta: entry.delta, ...(entry.choices ? { choices: entry.choices } : {}) }
        : { kind: 'correction', label: entry.label, delta: entry.delta, ...(entry.kind ? { purpose: entry.kind } : {}) };
      break;
  }
  return { ...common, action };
}

/** The old entries a strategic turn's nested actions were made from (Warfare's free action, `fromCard` the card). */
export const nestedEntries = (table: Table, turn: Turn): Entry[] =>
  turn.action.kind === 'strategic' ? (turn.action.nested ?? []).map(n => ({ ...legacyEntry(table, n), fromCard: turn.id }) as Entry) : [];

/** The old entry a turn was made from, for the checks of the old code that read one. */
export function legacyEntry(table: Table, turn: Turn): Entry {
  const action = turn.action;
  const owner = legacyPlayer(table, turn.player);
  const slotOrPlanet = (at: Place): string => ('slot' in at ? at.slot : at.planet);
  const mine = (units: Record<string, UnitCounts> | undefined): UnitCounts | undefined => units?.[turn.player];
  const common = {
    id: turn.id, status: turn.status,
    ...(owner === 'me' ? {} : { owner }),
    ...(turn.gains ? { gains: turn.gains } : {}), ...(turn.spends ? { spends: turn.spends } : {}),
    ...(turn.used.length > 0 ? { uses: turn.used.map(u => u.component) } : {}),
    ...(turn.used.some(u => u.choices) ? { useChoices: Object.fromEntries(turn.used.flatMap(u => (u.choices ? [[u.component, u.choices]] : []))) } : {}),
  };
  const acts = (): { acts: Act[] } => ({
    acts: turn.acts.map((act): Act => (act.kind === 'transaction'
      ? { kind: 'transaction', with: legacyPlayer(table, act.with), give: act.give, get: act.get }
      : { kind: 'expedition', sliceId: act.slice, payment: act.payment })),
  });
  const choices = turn.choices ? { choices: turn.choices } : {};
  switch (action.kind) {
    case 'tactical': {
      const groundLosses = action.groundCombat
        ? Object.fromEntries(Object.entries(action.groundCombat).flatMap(([planet, by]) => (mine(by) ? [[planet, mine(by)!]] : [])))
        : undefined;
      const losses = mine(action.spaceCombat);
      return {
        ...common, phase: turn.phase ?? 'action', type: 'tactical',
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
        ...acts(), ...choices,
      } as Entry;
    }
    case 'strategic':
      return { ...common, phase: turn.phase ?? 'action', type: 'strategic', ...(action.card !== undefined ? { card: action.card } : {}), ...(action.forToken ? { forToken: true } : {}), ...(action.effects ? { effects: action.effects } : {}), ...acts(), ...choices } as Entry;
    case 'secondary':
      return { ...common, phase: turn.phase ?? 'action', type: 'secondary', ...(action.card !== undefined ? { card: action.card } : {}), ...(action.effects ? { effects: action.effects } : {}), ...choices } as Entry;
    case 'component':
      return { ...common, phase: turn.phase ?? 'action', type: 'component', note: action.note, ...(action.component !== undefined ? { componentId: action.component } : {}), ...(action.effects ? { effects: action.effects } : {}), ...(action.payment ? { payment: action.payment } : {}), ...acts(), ...choices } as Entry;
    case 'pass':
      return { ...common, phase: turn.phase ?? 'action', type: 'pass', ...acts(), ...choices } as Entry;
    case 'status':
      return {
        ...common, phase: turn.phase ?? 'status', type: 'statusTokens', tactic: action.tactic, fleet: action.fleet, strategy: action.strategy,
        ...(action.vp !== undefined ? { vp: action.vp } : {}),
        ...(action.opponentVp ? { opponentVp: Object.fromEntries(Object.entries(action.opponentVp).map(([id, n]) => [legacyPlayer(table, id), n])) } : {}),
        ...(action.scored ? { scored: action.scored } : {}), ...(action.spend ? { spend: action.spend } : {}), ...choices,
      } as Entry;
    case 'agenda':
      return { ...common, phase: turn.phase ?? 'agenda', type: 'adjustment', label: action.label, delta: action.delta, ...(action.choices ? { choices: action.choices } : {}) } as Entry;
    case 'correction':
      return { ...common, phase: turn.phase ?? 'action', type: 'adjustment', label: action.label, delta: action.delta, ...(action.purpose ? { kind: action.purpose } : {}) } as Entry;
  }
}
