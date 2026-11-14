import { legacyGame, blankViews, legacyEvents } from './legacyViews';
import { playerOfLegacy } from '../../../game/entry';
import type { Game, DataPack, UnitCounts, Entry, Plan } from '../../../domain/types';
import type { GameState } from '../domain/types';
import type { Table, Board, PlayerId } from '../../../game/types';
import { playersOf } from '../../../domain/players';
import { SOURCES } from '../../../game/source';
import { emptyBoard } from '../../../game/board';
import { applyAll } from '../../../game/apply';
import { startOf } from '../domain/replay/start';
import type { GameEvent, Place } from '../../../game/events';
import type { Turn, Transaction, Expedition, ComponentUse, Action } from '../../../game/actions';
import { type Round, PHASES } from '../../../game/round';
import { heldCards } from '../../../domain/strategy';

export { legacyState, legacyViews, legacyGame, legacyKey } from './legacyViews';
export { legacyPlayer, playerOfLegacy, legacyEntry } from '../../../game/entry';
export { nestedEntries } from './entry';
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
export const planned = new WeakMap<object, { table: Table; pack: DataPack | undefined; round: Round }>();
/** The rounds of an old plan as rounds of turns, a round object kept for as long as its old round and the table stay the same. */
export function planOf(table: Table, plan: Plan, pack?: DataPack): Round[] {
  const count = SOURCES.get(table)?.playerCount ?? table.players.length;
  return [...plan.rounds].sort((a, b) => a.number - b.number).map(round => {
    const known = planned.get(round);
    if (known && known.table === table && known.pack === pack) return known.round;
    const turns: Turn[] = [];
    for (const phase of PHASES) {
      for (const entry of round.entries) {
        if (entry.phase !== phase || (entry.type === 'tactical' && entry.fromCard && round.entries.some(e => e.id === entry.fromCard))) continue;
        const linked = entry.type === 'strategic' ? round.entries.find(e => e.type === 'tactical' && e.fromCard === entry.id) : undefined;
        turns.push(turnOf(table, entry, pack, linked));
      }
    }
    const made: Round = { number: round.number, strategyCard: round.strategyCard, backupCard: round.backupCard, held: heldCards(round, count), turns };
    planned.set(round, { table, pack, round: made });
    return made;
  });
}
export const idOfSeat = (seat: number): PlayerId => `p${seat}`;
/** The seat of the first player who is not at the table: the seats of the table stop at eight. */
export const GHOST_SEAT = 100;
export const SLOT = /^-?\d+,-?\d+$/;
