/**
 * The old `Game` of the store written as the kernel's saved game, and read back, until the store holds the kernel model
 * itself. Only the storage and the file go through here; goes with the old `Game`.
 */
import { loadPack } from '../data/loadPack';
import type { StartHoldings } from '../domain/types';
import type { Game, Plan } from './old/domain/types';
import type { Player } from '../domain/players';
import { SAVE_FORMAT } from '../domain/types';
import { legacyPlayer, playerOfLegacy } from '../game/entry';
import { factsOf } from '../game/turnFacts';
import { nestedEntries } from './old/game/entry';
import { GHOST_SEAT } from './old/game/fromLegacy';
import { planOf, tableOf } from './old/game/fromLegacy';
import type { SavedGame, StartEdits } from '../game/save';
import type { Round as KernelRound } from '../game/round';
import type { Table, UnitCounts } from '../game/types';
import type { Round } from './old/domain/types';
import { parseSaved } from '../storage/schema';

const nonEmpty = <T extends object>(record: Record<string, T>): Record<string, T> =>
  Object.fromEntries(Object.entries(record).filter(([, value]) => Object.keys(value).length > 0));

const saves = new WeakMap<Game, SavedGame>();
/** The games `gameOf` made, and the saved game each is a view of. */
const origins = new WeakMap<Game, SavedGame>();

/** The saved game of a game: the one it is a view of, else made once. */
export function savedFor(game: Game): SavedGame {
  const known = origins.get(game) ?? saves.get(game);
  if (known) return known;
  const made = savedOf(game);
  saves.set(game, made);
  return made;
}

/** The saved game a view made by `gameOf` shows; none for a game made another way. */
export const originOf = (game: Game): SavedGame | undefined => origins.get(game);

/** The players of the table in the order of the game's list (me first, then the opponents as listed, then the strays): the list keeps its order when seats are swapped. */
const inListOrder = (game: Game, table: Table): Table['players'] => {
  const order = ['me', ...game.opponents.map(o => o.id)];
  const rank = (p: Table['players'][number]): number => { const at = order.indexOf(p.legacyId ?? p.id); return at < 0 ? order.length + p.seat : at; };
  return [...table.players].sort((a, b) => rank(a) - rank(b));
};

/** The game as a saved game: the table of the kernel, the hand-written start, the plans as rounds of turns. */
export function savedOf(game: Game): SavedGame {
  const pack = loadPack(game.expansions);
  const table = tableOf(game);
  const key = (legacy: string): string => playerOfLegacy(table, legacy) ?? legacy;
  const byPlayer = (record: Record<string, Record<string, UnitCounts>>): Record<string, Record<string, UnitCounts>> =>
    Object.fromEntries(Object.entries(record).map(([place, byOwner]) => [place, Object.fromEntries(Object.entries(byOwner).map(([owner, units]) => [key(owner), units]))]));
  const holdings: Record<string, StartHoldings> = { [table.viewer]: game.start.me };
  for (const [id, held] of Object.entries(game.start.opponents)) holdings[key(id)] = held;
  const points: Record<string, number> = { [table.viewer]: game.vp };
  for (const o of game.opponents) points[key(o.id)] = o.vp;
  const control: Record<string, string> = {};
  for (const [planet, who] of Object.entries(game.planetControl)) {
    control[planet] = who === 'me' ? table.viewer : key(game.planetOwner[planet] ?? game.opponents[0]?.id ?? 'enemy');
  }
  const start: StartEdits = {
    points, holdings, units: byPlayer(game.enemyUnits), ground: byPlayer(game.enemyGround), control,
    docks: [...game.docks], pds: { ...game.pds },
    expedition: {
      slices: Object.fromEntries(Object.entries(game.expedition.slices).map(([slice, by]) => [slice, by === null ? null : by === 'me' ? table.viewer : table.players.find(p => p.id !== table.viewer)?.id ?? 'other'])),
      thundersEdgeSystem: game.expedition.thundersEdgeSystem,
    },
    fracture: { active: game.fracture.active, ingress: [...game.fracture.ingress], seat: game.fracture.seat, ...(game.fracture.tiles ? { tiles: { ...game.fracture.tiles } } : {}) },
  };
  return {
    id: game.id, ...(game.name !== undefined ? { name: game.name } : {}), format: 'ti4-planner/3', schemaVersion: game.schemaVersion, dataVersion: game.dataVersion,
    table: { ...table, players: inListOrder(game, table).map(p => ({ ...p })) }, start,
    plans: game.plans.map(plan => ({ id: plan.id, name: plan.name, rounds: planOf(table, plan, pack) })),
    activePlanId: game.activePlanId,
  };
}

const entriesOf = (table: Table, round: KernelRound): Round['entries'] =>
  round.turns.flatMap(turn => [factsOf(table, turn), ...nestedEntries(table, turn)])
    // An entry with no acts has none: the kernel's `acts` is always a list.
    .map(entry => (!('acts' in entry) || (entry.acts && entry.acts.length > 0) ? entry : omitActs(entry)));

const omitActs = <T extends object>(entry: T): T => { const { acts, ...rest } = entry as T & { acts?: unknown }; void acts; return rest as T; };

const views = new WeakMap<SavedGame, Game>();
const planViews = new WeakMap<object, { table: Table; plan: Plan }>();
const roundViews = new WeakMap<object, { table: Table; entries: Round['entries'] }>();

const oldRoundOf = (table: Table, round: KernelRound): Round => {
  let known = roundViews.get(round);
  if (!known || known.table !== table) roundViews.set(round, known = { table, entries: entriesOf(table, round) });
  return { number: round.number, strategyCard: round.strategyCard, backupCard: round.backupCard, entries: known.entries };
};

/** The old plan of a saved plan, kept for as long as the plan and the table stay the same; its rounds likewise. */
const oldPlanOf = (table: Table, plan: SavedGame['plans'][number]): Plan => {
  const known = planViews.get(plan);
  if (known && known.table === table) return known.plan;
  const made: Plan = { id: plan.id, name: plan.name, rounds: plan.rounds.map(round => oldRoundOf(table, round)) };
  planViews.set(plan, { table, plan: made });
  return made;
};

/** The saved game read back as the old `Game`: the same view for the same saved game, its plans kept while theirs are. */
export function gameOf(saved: SavedGame): Game {
  const known = views.get(saved);
  if (known) return known;
  const made = viewOf(saved);
  views.set(saved, made);
  origins.set(made, saved);
  return made;
}

/** One round of a saved game as the old round, for the edits still written over entries. */
export const oldRound = (saved: SavedGame, round: KernelRound): Round => oldRoundOf(saved.table, round);

function viewOf(saved: SavedGame): Game {
  const { table, start } = saved;
  const legacy = (player: string): string => legacyPlayer(table, player);
  const real = table.players.filter(p => p.seat < GHOST_SEAT);
  const me = real.find(p => p.id === table.viewer) ?? real[0];
  const opponents: Player[] = real.filter(p => p !== me).map(p => ({ id: legacy(p.id), faction: p.faction, vp: start.points[p.id] ?? 0, seat: p.seat, color: p.color }));
  const byLegacy = (record: Record<string, Record<string, UnitCounts>>): Record<string, Record<string, UnitCounts>> =>
    Object.fromEntries(Object.entries(record).map(([place, byOwner]) => [place, Object.fromEntries(Object.entries(byOwner).map(([owner, units]) => [legacy(owner), units]))]));
  const planetControl: Game['planetControl'] = {};
  const planetOwner: Game['planetOwner'] = {};
  for (const [planet, who] of Object.entries(start.control)) {
    planetControl[planet] = who === table.viewer ? 'me' : 'enemy';
    if (who !== table.viewer) planetOwner[planet] = legacy(who);
  }
  const plans: Plan[] = saved.plans.map(plan => oldPlanOf(table, plan));
  return {
    id: saved.id, ...(saved.name !== undefined ? { name: saved.name } : {}), format: SAVE_FORMAT, schemaVersion: saved.schemaVersion, dataVersion: saved.dataVersion,
    expansions: [...table.expansions], playerCount: real.length, layout: table.layout, faction: me?.faction ?? '', seat: me?.seat ?? 1, color: me?.color ?? 1,
    vp: start.points[table.viewer] ?? 0, map: { ...table.map }, opponents,
    start: { me: start.holdings[table.viewer] ?? {}, opponents: Object.fromEntries(opponents.flatMap(o => { const held = start.holdings[playerOfLegacy(table, o.id) ?? o.id]; return held ? [[o.id, held]] : []; })) },
    enemyUnits: byLegacy(nonEmpty(start.units)), enemyGround: byLegacy(nonEmpty(start.ground)), planetControl, planetOwner,
    docks: [...start.docks], pds: { ...start.pds },
    expedition: {
      slices: Object.fromEntries(Object.entries(start.expedition.slices).map(([slice, by]) => [slice, by === null ? null : by === table.viewer ? 'me' : 'other'])),
      thundersEdgeSystem: start.expedition.thundersEdgeSystem,
    },
    fracture: { active: start.fracture.active, ingress: [...start.fracture.ingress], seat: start.fracture.seat, ...(start.fracture.tiles ? { tiles: { ...start.fracture.tiles } } : {}) },
    plans, activePlanId: saved.activePlanId,
  };
}

/** The game as it comes back from a save: written as a saved game, through JSON, read again. What the format does not keep is lost, as in a reload. */
export function reloaded(game: Game): Game {
  const parsed = parseSaved(JSON.parse(JSON.stringify(savedOf(game))));
  if (!parsed.ok) throw new Error(parsed.reason);
  return gameOf(parsed.saved);
}
