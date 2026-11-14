/**
 * Edits of what the user places by hand before the plan (`StartEdits`): the units and planets of the other players,
 * docks and PDS, what the players hold, the state of their leaders, the expedition and the Fracture. Each takes the
 * saved game and hands back the same one when nothing changed. Pinned 1:1 against the old edits of `Game`
 * (`start.test.ts`).
 */
import { loadPack } from '../../data/loadPack';
import { noteAddress } from '../../domain/components';
import { HOLDING_FIELD, kindOf } from '../../domain/holdings';
import { slotKeyOf } from '../../domain/layouts';
import { startingDocks, startingPds } from '../../domain/strategy';
import { fractureSlots } from '../../domain/thundersEdge';
import type { ComponentKind, Game, LeaderState, StartHoldings } from '../../domain/types';
import { legacyPlayer, playerOfLegacy } from '../entry';
import type { SavedGame, StartEdits } from '../save';
import type { PlanetId, PlayerId, Slot, UnitCounts } from '../types';

/** The seats from here on are players written for by hand who are not at the table (see `tableOf`). */
const GHOST_SEAT = 100;

const hasUnits = (units: UnitCounts): boolean => Object.values(units).some(n => (n ?? 0) > 0);
const sameUnits = (a: UnitCounts, b: UnitCounts): boolean => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every(k => (a[k as keyof UnitCounts] ?? 0) === (b[k as keyof UnitCounts] ?? 0));
};

/** A record with one key set, or removed when `value` is null; the same record when nothing changed. */
function setOrDelete<T>(record: Record<string, T>, key: string, value: T | null): Record<string, T> {
  if (value === null) {
    if (!(key in record)) return record;
    const { [key]: gone, ...rest } = record;
    void gone;
    return rest;
  }
  return record[key] === value ? record : { ...record, [key]: value };
}

const withStart = (saved: SavedGame, start: Partial<StartEdits>): SavedGame => ({ ...saved, start: { ...saved.start, ...start } });

/** The units of a player written for a place, merged per place: an empty set removes the player there, an empty place goes. */
function placed(record: Record<string, Record<PlayerId, UnitCounts>>, place: string, player: PlayerId, units: UnitCounts): Record<string, Record<PlayerId, UnitCounts>> | undefined {
  const here = record[place] ?? {};
  if (sameUnits(here[player] ?? {}, units)) return undefined;
  const next = setOrDelete(here, player, hasUnits(units) ? units : null);
  return setOrDelete(record, place, Object.keys(next).length > 0 ? next : null);
}

/** The units of `player` in the space of a system, as they are written (the whole set, not a change). */
export function withUnitsAt(saved: SavedGame, slot: Slot, player: PlayerId, units: UnitCounts): SavedGame {
  const next = placed(saved.start.units, slot, player, units);
  return next ? withStart(saved, { units: next }) : saved;
}

/** The ground forces of `player` on a planet. */
export function withGroundAt(saved: SavedGame, planet: PlanetId, player: PlayerId, units: UnitCounts): SavedGame {
  const next = placed(saved.start.ground, planet, player, units);
  return next ? withStart(saved, { ground: next }) : saved;
}

/** Who controls a planet at the start; null leaves it free. */
export function withControl(saved: SavedGame, planet: PlanetId, player: PlayerId | null): SavedGame {
  const control = setOrDelete(saved.start.control, planet, player);
  return control === saved.start.control ? saved : withStart(saved, { control });
}

/** The fields of the old game that the dock and PDS queries read: my faction, seat and map, and what is written for the structures. */
function placementView(saved: SavedGame): Game {
  const { table, start } = saved;
  const me = table.players.find(p => p.id === table.viewer);
  return {
    expansions: table.expansions, layout: table.layout, map: table.map, faction: me?.faction ?? '', seat: me?.seat ?? 1,
    playerCount: table.players.filter(p => p.seat < GHOST_SEAT).length, opponents: [], docks: start.docks, pds: start.pds,
  } as unknown as Game;
}

/** A space dock set or taken off a planet; what stands under my absent home planet is moved to where it stands now. */
export function withDock(saved: SavedGame, planet: PlanetId, present: boolean): SavedGame {
  const game = placementView(saved);
  const pack = loadPack(game.expansions);
  if (startingDocks(game, pack).includes(planet) === present) return saved;
  const standsThere = (id: string): boolean => startingDocks({ ...game, docks: [id] }, pack).includes(planet);
  return withStart(saved, { docks: present ? [...game.docks, planet] : game.docks.filter(id => !standsThere(id)) });
}

/** The PDS on a planet set to `count`. */
export function withPds(saved: SavedGame, planet: PlanetId, count: number): SavedGame {
  const game = placementView(saved);
  const standing = startingPds(game, loadPack(game.expansions));
  return (standing[planet] ?? 0) === Math.max(0, count) ? saved : withStart(saved, { pds: setOrDelete(standing, planet, count > 0 ? count : null) });
}

const COPIED: string[] = ['hand', 'found'];

const heldBy = (saved: SavedGame, player: PlayerId): StartHoldings | undefined =>
  saved.table.players.some(p => p.id === player && p.seat < GHOST_SEAT) ? saved.start.holdings[player] ?? {} : undefined;

/** What a player holds, set; the technologies stand in the table too (the faction sheet's choice reads them there). */
function withHeld(saved: SavedGame, player: PlayerId, held: StartHoldings): SavedGame {
  const kept = withStart(saved, { holdings: { ...saved.start.holdings, [player]: held } });
  const technologies = held.technologies ?? [];
  const row = saved.table.players.find(p => p.id === player);
  if (!row || JSON.stringify(row.setup.technologies ?? []) === JSON.stringify(technologies)) return kept;
  const { technologies: old, ...setup } = row.setup;
  void old;
  const players = saved.table.players.map(p => (p === row ? { ...p, setup: technologies.length > 0 ? { ...setup, technologies: [...technologies] } : setup } : p));
  return { ...kept, table: { ...kept.table, players } };
}

/**
 * A component held by hand at the start, or not any more. A promissory note leaves its owner's hand when someone else
 * holds it, and goes back to its owner when it is let go.
 */
export function withStartHolding(saved: SavedGame, player: PlayerId, id: string, present: boolean): SavedGame {
  const start = heldBy(saved, player);
  if (!start) return saved;
  const kind = kindOf(id) as ComponentKind;
  if (kind === 'breakthrough') {
    if ((start.breakthrough !== undefined) === present) return saved;
    const { breakthrough, ...rest } = start;
    void breakthrough;
    return withHeld(saved, player, present ? { ...rest, breakthrough: 'held' } : rest);
  }
  const field = HOLDING_FIELD[kind];
  if (!field) return saved;
  const list = start[field] ?? [];
  const at = list.indexOf(id);
  if (present ? at >= 0 && !COPIED.includes(field) : at < 0) return saved;
  const next = withHeld(saved, player, { ...start, [field]: present ? [...list, id] : list.filter((_, i) => i !== at) });
  const owner = field === 'promissory' ? noteAddress(id) : undefined;
  if (owner === undefined) return next;
  const ownerId = playerOfLegacy(saved.table, owner);
  if (!present) return owner === legacyPlayer(saved.table, player) || ownerId === undefined ? next : withStartHolding(next, ownerId, id, true);
  const without = (other: StartHoldings): StartHoldings => (other.promissory?.includes(id) ? { ...other, promissory: other.promissory.filter(held => held !== id) } : other);
  return withStart(next, {
    holdings: Object.fromEntries(Object.entries(next.start.holdings).map(([other, theirs]) => [other, other === player ? theirs : without(theirs)])),
  });
}

/** The state of a player's leader when the plan begins; null locks it again. */
export function withLeader(saved: SavedGame, player: PlayerId, id: string, state: LeaderState | null): SavedGame {
  const start = heldBy(saved, player);
  if (!start || (start.leaders?.[id] ?? null) === state) return saved;
  const { [id]: old, ...leaders } = start.leaders ?? {};
  void old;
  return withHeld(saved, player, { ...start, leaders: state ? { ...leaders, [id]: state } : leaders });
}

/** Who took an expedition slice (null: free). */
export function withSlice(saved: SavedGame, slice: string, player: PlayerId | null): SavedGame {
  const slices = setOrDelete(saved.start.expedition.slices, slice, player) as Record<string, PlayerId | null>;
  return slices === saved.start.expedition.slices ? saved : withStart(saved, { expedition: { ...saved.start.expedition, slices } });
}

/** The system Thunder's Edge stands in. */
export const withThundersEdge = (saved: SavedGame, slot: Slot | null): SavedGame =>
  saved.start.expedition.thundersEdgeSystem === slot ? saved : withStart(saved, { expedition: { ...saved.start.expedition, thundersEdgeSystem: slot } });

/** The Fracture's tiles follow its seat and its being open. */
export function withFractureTiles(saved: SavedGame): SavedGame {
  const { fracture } = saved.start;
  const count = saved.table.players.filter(p => p.seat < GHOST_SEAT).length;
  const tiles = fracture.active
    ? Object.fromEntries(fractureSlots(fracture.seat, count, loadPack(saved.table.expansions), saved.table.layout).map(s => [slotKeyOf(s.q, s.r), s.tileId]))
    : {};
  const old = fracture.tiles ?? {};
  const same = Object.keys(tiles).length === Object.keys(old).length && Object.entries(tiles).every(([slot, id]) => old[slot] === id);
  return same ? saved : withStart(saved, { fracture: { ...fracture, tiles } });
}

const withFracture = (saved: SavedGame, fracture: Partial<StartEdits['fracture']>): SavedGame =>
  withFractureTiles(withStart(saved, { fracture: { ...saved.start.fracture, ...fracture } }));

export const withFractureActive = (saved: SavedGame, active: boolean): SavedGame =>
  saved.start.fracture.active === active ? saved : withFracture(saved, { active });

export const withFractureSeat = (saved: SavedGame, seat: number | null): SavedGame =>
  saved.start.fracture.seat === seat ? saved : withFracture(saved, { seat });

export function withIngressToggled(saved: SavedGame, slot: Slot): SavedGame {
  const { ingress } = saved.start.fracture;
  return withFracture(saved, { ingress: ingress.includes(slot) ? ingress.filter(s => s !== slot) : [...ingress, slot] });
}
