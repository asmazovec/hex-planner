/**
 * Edits of the table of a saved game before it starts, and of the players while it is open: the name, the tiles of the
 * map, the players and their factions, the seats, the layout, the map string and the expansions, and the making of a new
 * game. Each takes the saved game and hands back the same one when nothing changed. Pinned 1:1 against the old edits of
 * `Game` (`table.test.ts`). A player's id is `p<seat>`; an edit that moves the seats renames the player where the start and
 * the plans name them.
 */
import { loadPack } from '../../data/loadPack';
import { noteAddress } from '../../domain/components';
import { genericNotes, startForFaction, withoutNotesOf } from '../../domain/holdings';
import { defaultLayout, slotKeyOf, templateOf } from '../../domain/layouts';
import { moveToTemplate, seatSlots, slotsFor, templateFor } from '../../domain/mapBuilder';
import { makeId, timeIdMaker, type IdMaker } from '../../domain/newGame';
import { startStructures } from '../../domain/startStructures';
import { heldCards } from '../../domain/strategy';
import { fractureSlots } from '../../domain/thundersEdge';
import type { DataPack, ExpansionId, MapLayout, StartHoldings } from '../../domain/types';
import { SAVED_FORMAT, type SavedGame, type StartEdits } from '../save';
import type { Round } from '../round';
import type { Action, Turn } from '../actions';
import type { Player, PlayerId, Slot, Table, TileRef } from '../types';
import { withFractureTiles, withHeld } from './start';

/** The seats from here on are players written for by hand who are not at the table (see `tableOf`). */
const GHOST_SEAT = 100;
const COLORS = 8;
export const MIN_PLAYERS = 3;
const DRAFT_EXPANSIONS: ExpansionId[] = ['pok', 'te'];

const real = (table: Table): Player[] => table.players.filter(p => p.seat < GHOST_SEAT);
const idOfSeat = (seat: number): PlayerId => `p${seat}`;
const legacyOf = (p: Player): string => p.legacyId ?? p.id;

/** The most players the map templates of the pack allow. */
export const maxPlayers = (pack: DataPack): number => Math.max(MIN_PLAYERS, ...pack.templates.map(t => t.playerCount));

/** The name of the game, trimmed; an empty one takes it away. */
export function withName(saved: SavedGame, name: string): SavedGame {
  const next = name.trim();
  if (next === (saved.name ?? '')) return saved;
  const { name: old, ...rest } = saved;
  void old;
  return { ...rest, ...(next ? { name: next } : {}), table: { ...saved.table, name: next } };
}

/** A tile set on a slot of the map, or taken off it when `tile` is null. */
export function withTile(saved: SavedGame, slot: Slot, tile: TileRef | null): SavedGame {
  const { map } = saved.table;
  if (tile === null ? !(slot in map) : map[slot] === tile) return saved;
  const next = { ...map };
  if (tile === null) delete next[slot];
  else next[slot] = tile;
  return { ...saved, table: { ...saved.table, map: next } };
}

// ---------------------------------------------------------------------------------------------------------------------
// Walking the plans: ids of players and planets, slots and notes are renamed in what the turns say.

/** A value with every string, key or value, that `ids` names replaced: plain JSON all the way down. */
function renamed<T>(value: T, ids: ReadonlyMap<string, string>): T {
  const swap = (s: string): string => ids.get(s) ?? s;
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') return swap(v);
    if (Array.isArray(v)) return v.map(walk);
    if (v !== null && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [swap(k), walk(x)]));
    return v;
  };
  return walk(value) as T;
}

const changes = (ids: ReadonlyMap<string, string>): boolean => [...ids].some(([a, b]) => a !== b);

const mapRounds = (saved: SavedGame, edit: (round: Round) => Round): SavedGame => ({
  ...saved, plans: saved.plans.map(plan => ({ ...plan, rounds: plan.rounds.map(edit) })),
});

/** A list of turns with each turn (and each turn nested in a card) put through `edit`; `edit` may drop a turn. */
function mapTurns(turns: Turn[], edit: (turn: Turn) => Turn | null): Turn[] {
  return turns.flatMap(turn => {
    const made = edit(turn);
    if (!made) return [];
    const action = made.action;
    return [action.kind === 'strategic' && action.nested ? { ...made, action: { ...action, nested: mapTurns(action.nested, edit) } } : made];
  });
}

/** A turn whose notes of a player who left are gone: those it takes, discards, plays or hands over in a transaction. */
function withoutNotes(turn: Turn, gone: (id: string) => boolean, left: Player): Turn {
  const kept = (ids: string[] | undefined): string[] | undefined => (ids?.some(gone) ? ids.filter(id => !gone(id)) : ids);
  const next: Turn = { ...turn };
  for (const side of ['gains', 'spends'] as const) {
    const ids = kept(turn[side]);
    if (ids === turn[side]) continue;
    if (ids && ids.length > 0) next[side] = ids; else delete next[side];
  }
  if (next.action.kind === 'component' && next.action.component !== undefined && gone(next.action.component)) {
    const { component, ...rest } = next.action;
    void component;
    next.action = rest;
  }
  next.acts = next.acts.map(act => {
    if (act.kind !== 'transaction') return act;
    // The one who left is no longer at the table: the transaction names them as the game of old did.
    if (act.with === left.id) act = { ...act, with: left.legacyId ?? left.id };
    if (![act.give, act.get].some(goods => goods.components?.some(gone))) return act;
    const side = (goods: typeof act.give): typeof act.give => {
      const { components, ...rest } = goods;
      const left = kept(components);
      return left && left.length > 0 ? { ...rest, components: left } : rest;
    };
    return { ...act, give: side(act.give), get: side(act.get) };
  });
  return next;
}

/** The turns forget a player who left: their turns, their points, their place in card effects and their notes (69.7). */
function withoutPlayerInPlans(saved: SavedGame, leaving: Player): SavedGame {
  const player = leaving.id;
  const legacy = legacyOf(leaving);
  const gone = (id: string): boolean => noteAddress(id) === legacy;
  return mapRounds(saved, round => ({
    ...round,
    turns: mapTurns(round.turns, turn => {
      if (turn.player === player) return null;
      const made = withoutNotes(turn, gone, leaving);
      const action: Action = made.action;
      if (action.kind === 'status' && action.opponentVp) {
        const { [player]: dropped, ...opponentVp } = action.opponentVp;
        void dropped;
        return { ...made, action: { ...action, opponentVp } };
      }
      if ((action.kind === 'strategic' || action.kind === 'secondary') && action.effects) {
        const { speaker, freeSecondary, ...rest } = action.effects;
        const effects = { ...rest } as NonNullable<typeof action.effects>;
        if (speaker !== undefined && speaker !== legacy) effects.speaker = speaker;
        const free = (freeSecondary ?? []).filter(id => id !== legacy);
        if (free.length > 0) effects.freeSecondary = free;
        return { ...made, action: { ...action, effects } };
      }
      return made;
    }),
  }));
}

/** A turn with the slots it names put through `to`: the active system, the routes, the card and the adjustment systems. */
function movedTurn(turn: Turn, to: (slot: Slot) => Slot): Turn {
  const a = turn.action;
  if (a.kind === 'tactical') {
    return {
      ...turn,
      action: {
        ...a, system: a.system === null ? null : to(a.system),
        movement: a.movement.map(f => ({
          ...f, from: 'slot' in f.from ? { slot: to(f.from.slot) } : f.from,
          ...(f.via ? { via: f.via.map(to) } : {}),
          ...(f.pickupOf === undefined ? {} : { pickupOf: to(f.pickupOf) }),
        })),
      },
    };
  }
  if ((a.kind === 'strategic' || a.kind === 'secondary') && a.effects) {
    const { effects } = a;
    return {
      ...turn,
      action: {
        ...a,
        effects: {
          ...effects,
          ...(effects.systemId === undefined ? {} : { systemId: to(effects.systemId) }),
          ...(effects.production ? { production: { ...effects.production, systemId: to(effects.production.systemId) } } : {}),
        },
      },
    };
  }
  if ((a.kind === 'agenda' || a.kind === 'correction') && a.delta.units) {
    return { ...turn, action: { ...a, delta: { ...a.delta, units: { ...a.delta.units, systemId: to(a.delta.units.systemId) } } } };
  }
  return turn;
}

/** What the game says about systems moved to other slots: units of the others, the ingress of the Fracture and the plans. */
function slotsMoved(saved: SavedGame, to: (slot: Slot) => Slot): SavedGame {
  const { start } = saved;
  const moved = mapRounds(saved, round => ({ ...round, turns: mapTurns(round.turns, turn => movedTurn(turn, to)) }));
  return {
    ...moved,
    start: {
      ...start,
      units: Object.fromEntries(Object.entries(start.units).map(([slot, units]) => [to(slot), units])),
      fracture: { ...start.fracture, ingress: start.fracture.ingress.map(to) },
    },
  };
}

/** The Fracture's systems take other slots when it moves, and what the game says about them follows; then its tiles follow its seat. */
function settled(before: SavedGame, next: SavedGame): SavedGame {
  if (next === before) return before;
  const pack = loadPack(before.table.expansions);
  const place = (s: SavedGame): Record<string, Slot> => Object.fromEntries(
    fractureSlots(s.start.fracture.seat, real(s.table).length, pack, s.table.layout).map(f => [f.tileId, slotKeyOf(f.q, f.r)]),
  );
  const old = place(before);
  const now = place(next);
  const moved = new Map(Object.keys(old).filter(id => now[id] && now[id] !== old[id]).map(id => [old[id], now[id]]));
  return withFractureTiles(moved.size === 0 ? next : slotsMoved(next, slot => moved.get(slot) ?? slot));
}

// ---------------------------------------------------------------------------------------------------------------------
// The map after the players change.

const homeTileOnMap = (faction: string, pack: DataPack): string | undefined => {
  const def = pack.factions[faction];
  return def?.gateTile ?? def?.homeTile;
};

/** Slots holding a player's own home tile at that player's seat; the app places and moves those tiles by itself. */
function ownHomeSlots(table: Table, pack: DataPack): Set<string> {
  const slots = seatSlots(real(table).length, pack, table.layout);
  const own = new Set<string>();
  for (const { faction, seat } of real(table)) {
    const def = pack.factions[faction];
    const slot = slots[seat - 1];
    if (def && slot && table.map[slot]?.split('@')[0] === (def.gateTile ?? def.homeTile)) own.add(slot);
  }
  return own;
}

/** The slots of the seats that hold no tile while their player has a faction: each takes that faction's home tile. */
function emptySeatHomes(table: Table, pack: DataPack): Record<string, string> {
  const slots = seatSlots(real(table).length, pack, table.layout);
  const homes: Record<string, string> = {};
  for (const player of real(table)) {
    const slot = slots[player.seat - 1];
    const tile = homeTileOnMap(player.faction, pack);
    if (slot && tile && !table.map[slot]) homes[slot] = tile;
  }
  return homes;
}

/** The tiles the player placed: not fixed by the template and not a player's home tile at that player's seat. */
function userTiles(table: Table, pack: DataPack): string[] {
  const fixed = new Map(slotsFor(real(table).length, pack, table.layout).map(s => [slotKeyOf(s.q, s.r), s.fixed]));
  const own = ownHomeSlots(table, pack);
  return Object.entries(table.map).filter(([slot, tile]) => fixed.get(slot) !== tile && !own.has(slot)).map(([slot]) => slot);
}

/** A map with tiles of the player keeps its layout if the new count has it; otherwise the rules' layout applies. */
const layoutForCount = (table: Table, count: number, pack: DataPack): MapLayout =>
  (userTiles(table, pack).length > 0 && templateFor(count, table.layout, pack) ? table.layout : defaultLayout(count, pack));

/** The map after the players change: own home tiles lift off, the template follows the count, homes land in empty seat slots. */
function mapFor(table: Table, players: Player[], layout: MapLayout, pack: DataPack): Table['map'] {
  const own = ownHomeSlots(table, pack);
  const kept = Object.fromEntries(Object.entries(table.map).filter(([slot]) => !own.has(slot)));
  const template = templateFor(players.length, layout, pack);
  const map = players.length !== real(table).length && template
    ? moveToTemplate(kept, slotsFor(real(table).length, pack, table.layout), template, pack)
    : kept;
  const slots = seatSlots(players.length, pack, layout);
  for (const player of players) {
    const slot = slots[player.seat - 1];
    const tile = homeTileOnMap(player.faction, pack);
    if (slot && tile && !map[slot]) map[slot] = tile;
  }
  return map;
}

/**
 * The saved game with another list of players, mine first: the layout follows the count, the map follows both, the ids
 * follow the seats. A player not at the table yet is under any id not in the table, which `start` may already name.
 */
function seatedAs(saved: SavedGame, list: Player[], start: StartEdits = saved.start): SavedGame {
  const { table } = saved;
  const pack = loadPack(table.expansions);
  const count = list.length;
  const layout = count === real(table).length ? table.layout : layoutForCount(table, count, pack);
  const map = mapFor(table, list, layout, pack);
  const ids = new Map(list.map(p => [p.id, idOfSeat(p.seat)]));
  const strays = table.players.filter(p => p.seat >= GHOST_SEAT);
  const rename = changes(ids);
  const viewer = ids.get(list[0].id)!;
  const fracture = start.fracture.seat !== null && start.fracture.seat > count ? { ...start.fracture, seat: null } : start.fracture;
  const players = [...list.map(p => ({ ...p, id: ids.get(p.id)! })), ...strays];
  // The expedition says who took a slice as me or another: the other is the first of the others.
  const other = players.find(p => p.id !== viewer)?.id ?? 'other';
  const slices = Object.fromEntries(Object.entries(start.expedition.slices).map(([slice, by]) => [slice, by === null ? null : (ids.get(by) ?? by) === viewer ? viewer : other]));
  const moved: SavedGame = {
    ...saved,
    table: { ...table, layout, map, players, viewer },
    start: { ...(rename ? renamed({ ...start, fracture }, ids) : { ...start, fracture }), expedition: { ...start.expedition, slices } },
    plans: rename ? renamed(saved.plans, ids) : saved.plans,
  };
  if (count === real(table).length) return moved;
  return mapRounds(moved, round => ({ ...round, held: heldCards({ strategyCard: round.strategyCard, backupCard: round.backupCard } as never, count) }));
}

/** The players of the table, mine first. */
const listOf = (saved: SavedGame): Player[] => {
  const me = saved.table.players.find(p => p.id === saved.table.viewer);
  return [...(me ? [me] : []), ...real(saved.table).filter(p => p !== me)];
};

// ---------------------------------------------------------------------------------------------------------------------
// Players.

const emptySetup = (): Player['setup'] => ({});

/** A new opponent takes the last seat and the first free colour. The maximum of the pack stops it. */
export function addPlayer(saved: SavedGame, newId: IdMaker = timeIdMaker): SavedGame {
  const pack = loadPack(saved.table.expansions);
  const players = listOf(saved);
  if (players.length >= maxPlayers(pack)) return saved;
  const used = players.map(p => p.color);
  const color = Array.from({ length: COLORS }, (_, i) => i + 1).find(c => !used.includes(c)) ?? 1;
  const legacy = makeId('opponent', newId);
  const seat = players.length + 1;
  const fresh: Player = { id: 'new', faction: '', seat, color, setup: emptySetup(), legacyId: legacy };
  const start: StartEdits = {
    ...saved.start,
    points: { ...saved.start.points, new: 0 },
    // The newcomer begins with the generic notes of their colour (69).
    holdings: { ...saved.start.holdings, new: { promissory: genericNotes(pack, legacy) } },
  };
  return settled(saved, seatedAs(saved, [...players, fresh], start));
}

/** Removes a player and what they hold on the map by list position; later seats shift down. My faction (position 0) stays, and so do the last three players. */
export function removePlayer(saved: SavedGame, index: number): SavedGame {
  const players = listOf(saved);
  const leaving = players[index];
  if (index === 0 || !leaving || players.length <= MIN_PLAYERS) return saved;
  const legacy = legacyOf(leaving);
  const rest = players.filter((_, i) => i !== index).map(p => (p.seat > leaving.seat ? { ...p, seat: p.seat - 1 } : p));
  const { start } = saved;
  const planets = Object.keys(start.control).filter(id => start.control[id] === leaving.id);
  const without = (record: StartEdits['units']): StartEdits['units'] => Object.fromEntries(Object.entries(record).flatMap(([place, byOwner]) => {
    const left = Object.fromEntries(Object.entries(byOwner).filter(([owner]) => owner !== leaving.id));
    return Object.keys(left).length > 0 ? [[place, left]] : [];
  }));
  const { [leaving.id]: gonePoints, ...points } = start.points;
  const { [leaving.id]: goneHeld, ...held } = start.holdings;
  void gonePoints;
  void goneHeld;
  const cleared: SavedGame = {
    ...saved,
    start: {
      ...start, points,
      // The notes of the player who leaves go with them, whoever held them (69.7).
      holdings: Object.fromEntries(Object.entries(held).map(([id, theirs]) => [id, withoutNotesOf(theirs, legacy)])),
      units: without(start.units), ground: without(start.ground),
      control: Object.fromEntries(Object.entries(start.control).filter(([id]) => !planets.includes(id))),
      docks: start.docks.filter(id => !planets.includes(id)),
      pds: Object.fromEntries(Object.entries(start.pds).filter(([id]) => !planets.includes(id))),
    },
  };
  return settled(saved, seatedAs(withoutPlayerInPlans(cleared, leaving), rest));
}

const homePlanets = (faction: string, pack: DataPack): string[] =>
  pack.tiles[pack.factions[faction]?.homeTile ?? '']?.planetIds ?? [];

/** Sets a player's faction by list position; for my faction, control and the dock move to the new home as well. */
export function setFaction(saved: SavedGame, index: number, faction: string): SavedGame {
  const pack = loadPack(saved.table.expansions);
  const players = listOf(saved);
  const player = players[index];
  if (!player || player.faction === faction) return saved;
  const seated = seatedAs(saved, players.map((p, i) => (i === index ? { ...p, faction } : p)));
  // The starting technologies follow the faction, for me and for an opponent alike.
  const begins = startForFaction(saved.start.holdings[player.id], player.faction, faction, pack, legacyOf(player));
  const next = withHeld(seated, seated.table.players.find(p => p.seat === player.seat)!.id, begins);
  if (index !== 0) return settled(saved, next);
  const old = homePlanets(players[0].faction, pack);
  const fresh = homePlanets(faction, pack);
  const begin = startStructures(faction, pack);
  const control: Record<string, PlayerId> = { ...next.start.control };
  for (const id of old) delete control[id];
  for (const id of fresh) control[id] = next.table.viewer;
  const pds = { ...Object.fromEntries(Object.entries(next.start.pds).filter(([id]) => !old.includes(id))), ...begin.pds };
  return settled(saved, { ...next, start: { ...next.start, control, docks: [...next.start.docks.filter(id => !old.includes(id)), ...begin.docks], pds } });
}

/** Two players trade seats by list position; their own home tiles trade with them. */
export function swapSeats(saved: SavedGame, a: number, b: number): SavedGame {
  const players = listOf(saved);
  if (a === b || !players[a] || !players[b]) return saved;
  return settled(saved, seatedAs(saved, players.map((p, i) => {
    if (i === a) return { ...p, seat: players[b].seat };
    return i === b ? { ...p, seat: players[a].seat } : p;
  })));
}

// ---------------------------------------------------------------------------------------------------------------------
// Layout, map string, expansions.

/**
 * The game with another layout of its player count; a layout the pack lacks, or the one in use, returns the same game.
 * Each player's own home tile goes to that player's seat slot in the new layout, displacing what stands there.
 */
export function changeLayout(saved: SavedGame, layout: MapLayout): SavedGame {
  const { table } = saved;
  const pack = loadPack(table.expansions);
  const count = real(table).length;
  const next = templateFor(count, layout, pack);
  if (!next || table.layout === layout) return saved;
  const own = ownHomeSlots(table, pack);
  const lifted = Object.fromEntries(Object.entries(table.map).filter(([slot]) => !own.has(slot)));
  const map = moveToTemplate(lifted, slotsFor(count, pack, table.layout), next, pack);
  const seats = seatSlots(count, pack, layout);
  for (const { faction, seat } of real(table)) {
    const def = pack.factions[faction];
    const slot = seats[seat - 1];
    if (def && slot) map[slot] = def.gateTile ?? def.homeTile;
  }
  return settled(saved, { ...saved, table: { ...table, layout, map } });
}

/**
 * The whole map replaced, and the layout too if one is given; the centre tile stays, and so do the layout's hyperlanes
 * where the map leaves their slots empty. A 0 on a home slot leaves it to the faction seated there.
 */
export function withMap(saved: SavedGame, map: Record<Slot, TileRef>, layout?: MapLayout): SavedGame {
  const { table } = saved;
  const pack = loadPack(table.expansions);
  const next = { ...map };
  delete next['0,0'];
  if (table.map['0,0']) next['0,0'] = table.map['0,0'];
  const nextLayout = layout ?? table.layout;
  for (const slot of slotsFor(real(table).length, pack, nextLayout)) {
    if (slot.fixed && !next[slotKeyOf(slot.q, slot.r)]) next[slotKeyOf(slot.q, slot.r)] = slot.fixed;
  }
  const homes = emptySeatHomes({ ...table, map: next, layout: nextLayout }, pack);
  const placed = Object.keys(homes).length === 0 ? next : { ...next, ...homes };
  const same = Object.keys(placed).length === Object.keys(table.map).length && Object.entries(placed).every(([k, v]) => table.map[k] === v);
  return same && nextLayout === table.layout ? saved : settled(saved, { ...saved, table: { ...table, layout: nextLayout, map: placed } });
}

const toTe = new Map([['mr', 'mrte']]);

/**
 * Thunder's Edge replaces the Mecatol Rex tile in the centre. For a game in progress, the centre tile changes and what is
 * recorded on the planet `mr` (control, docks, PDS, ground forces, the planets named by the turns) moves to `mrte`.
 */
function withTeMecatol(saved: SavedGame): SavedGame {
  const { table, start } = saved;
  const map = table.map['0,0'] === '18' ? { ...table.map, '0,0': '112' } : table.map;
  const moved = renamed({ control: start.control, docks: start.docks, pds: start.pds, ground: start.ground }, toTe);
  return { ...saved, table: { ...table, map }, start: { ...start, ...moved }, plans: renamed(saved.plans, toTe) };
}

/** Turns an expansion on for the open game: its strategy cards, leaders and Thunder's Edge pieces follow the table. */
export function addExpansion(saved: SavedGame, id: ExpansionId): SavedGame {
  const { table } = saved;
  if (table.expansions.includes(id)) return saved;
  const expansions = DRAFT_EXPANSIONS.filter(e => e === id || table.expansions.includes(e));
  const next: SavedGame = { ...saved, table: { ...table, expansions } };
  return settled(saved, id === 'te' ? withTeMecatol(next) : next);
}

// ---------------------------------------------------------------------------------------------------------------------
// A new game, and a draft under other expansions.

/** A game with every seat taken by the opponents to be, the map as the template fixes it, and one plan with its first round. */
export function createSaved(
  input: { expansions: ExpansionId[]; playerCount: number; faction: string; layout?: MapLayout },
  pack: DataPack,
  newId: IdMaker = timeIdMaker,
): SavedGame {
  const faction = pack.factions[input.faction];
  const layout = input.layout ?? defaultLayout(input.playerCount, pack);
  const template = templateOf(input.playerCount, pack, layout);
  const map: Record<string, string> = {};
  for (const slot of template?.slots ?? []) if (slot.fixed) map[slotKeyOf(slot.q, slot.r)] = slot.fixed;
  const firstSeat = seatSlots(input.playerCount, pack, template?.layout ?? layout)[0];
  if (faction && firstSeat && !map[firstSeat]) map[firstSeat] = faction.gateTile ?? faction.homeTile;
  const structures = startStructures(input.faction, pack);
  const planId = makeId('plan', newId);
  const gameId = makeId('game', newId);
  const opponents = Array.from({ length: Math.max(0, input.playerCount - 1) }, () => makeId('opponent', newId));
  const mine = startForFaction({ promissory: genericNotes(pack, 'me') }, '', input.faction, pack);
  const players: Player[] = [
    { id: 'p1', faction: input.faction, seat: 1, color: 1, legacyId: 'me', setup: mine.technologies?.length ? { technologies: [...mine.technologies] } : {} },
    ...opponents.map((legacyId, i): Player => ({ id: idOfSeat(i + 2), faction: '', seat: i + 2, color: i + 2, legacyId, setup: {} })),
  ];
  const control: Record<string, PlayerId> = {};
  for (const planetId of pack.tiles[faction?.homeTile ?? '']?.planetIds ?? []) control[planetId] = 'p1';
  const round = { number: 1, strategyCard: null, backupCard: null };
  return {
    id: gameId, format: SAVED_FORMAT, schemaVersion: 1, dataVersion: pack.version,
    table: { id: gameId, name: '', expansions: [...input.expansions], layout: template?.layout ?? layout, map, players, viewer: 'p1' },
    start: {
      points: Object.fromEntries(players.map(p => [p.id, 0])),
      holdings: {
        p1: mine,
        ...Object.fromEntries(opponents.map((legacyId, i) => [idOfSeat(i + 2), { promissory: genericNotes(pack, legacyId) } as StartHoldings])),
      },
      units: {}, ground: {}, control, docks: structures.docks, pds: structures.pds,
      expedition: { slices: {}, thundersEdgeSystem: null }, fracture: { active: false, ingress: [], seat: null },
    },
    plans: [{ id: planId, name: 'Plan 1', rounds: [{ ...round, held: heldCards(round as never, input.playerCount), turns: [] }] }],
    activePlanId: planId,
  };
}

/** The tiles of `from` put back in the free slots that are empty, when the pack still has them. */
function withPlacedTiles(saved: SavedGame, from: Table['map']): SavedGame {
  const { table } = saved;
  const pack = loadPack(table.expansions);
  const count = real(table).length;
  const seats = new Set(seatSlots(count, pack, table.layout));
  const free = slotsFor(count, pack, table.layout).filter(slot => !slot.fixed).map(slot => slotKeyOf(slot.q, slot.r)).filter(key => !seats.has(key));
  const back = free.filter(key => !table.map[key] && from[key] && pack.tiles[from[key].split('@')[0]]);
  return back.length === 0 ? saved : { ...saved, table: { ...table, map: { ...table.map, ...Object.fromEntries(back.map(key => [key, from[key]])) } } };
}

/**
 * A game not started yet, under another set of expansions: factions outside the set are cleared, players beyond its
 * maximum leave from the end of the list, and the seats of the rest close up in order. Placed tiles the pack still has stay.
 */
export function draftWithExpansions(draft: SavedGame, expansions: ExpansionId[], newId: IdMaker = timeIdMaker): SavedGame {
  const pack = loadPack(expansions);
  const kept = listOf(draft).slice(0, maxPlayers(pack));
  const order = [...kept].sort((a, b) => a.seat - b.seat);
  const layout = templateFor(kept.length, draft.table.layout, pack) ? draft.table.layout : undefined;
  const blank = createSaved({ expansions, playerCount: kept.length, faction: '', layout }, pack, newId);
  // The players keep their ids, so the notes of the blank game are dealt again, to them.
  const players: Player[] = kept.map(p => ({ ...p, seat: order.indexOf(p) + 1, faction: '', setup: {} }));
  const ids = new Map(players.map(p => [p.id, idOfSeat(p.seat)]));
  const seated = players.map(p => ({ ...p, id: ids.get(p.id)! }));
  const start: StartEdits = {
    ...blank.start,
    points: Object.fromEntries(players.map(p => [ids.get(p.id)!, draft.start.points[p.id] ?? 0])),
    holdings: {
      [ids.get(players[0].id)!]: blank.start.holdings.p1,
      ...Object.fromEntries(players.slice(1).map(p => [ids.get(p.id)!, { promissory: genericNotes(pack, legacyOf(p)) } as StartHoldings])),
    },
  };
  const empty: SavedGame = {
    ...blank, id: draft.id,
    table: { ...blank.table, id: draft.id, players: seated, viewer: seated[0].id },
    start,
  };
  const named = kept.reduce<SavedGame>((game, player, index) => (pack.factions[player.faction] ? setFaction(game, index, player.faction) : game), empty);
  return withPlacedTiles(named, draft.table.map);
}

/** The draft as an open game: the start of the game places everything the faction sheets give (`setup`), so nothing is written. */
export const startedGame = (draft: SavedGame): SavedGame => draft;
