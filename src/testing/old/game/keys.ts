/**
 * The one place the ids the old model gives players (`me` for the viewer, an opponent's own id) and the player ids of a
 * table are turned into each other: in the ids of players themselves, in the address of a promissory note, in what an
 * entry chose, in the warnings read back. The application knows only player ids; the tests keep writing `me`.
 */
import { noteAddress, noteFor } from '../../../domain/components';
import { placeIn, violation } from '../../../domain/rules/registry';
import type { Warning } from '../../../domain/types';
import type { PlayerId, Table } from '../../../game/types';

interface Names { old: ReadonlyMap<PlayerId, string>; players: ReadonlyMap<string, PlayerId> }

const NAMES = new WeakMap<Table, Names>();
/** The names last given for a game, by its id: a table the application made anew from one that was named (an edit of the store) keeps them for the players it still seats. */
const LAST = new Map<string, { player: PlayerId; old: string; faction: string }[]>();

const namesFrom = (table: Table, pairs: readonly (readonly [PlayerId, string])[]): Names => {
  const old = new Map(pairs);
  if (!old.has(table.viewer)) old.set(table.viewer, 'me');
  return { old, players: new Map([...old].map(([player, key]) => [key, player])) };
};

/** Names the players of a table made from an old game: the viewer is `me`, each other player has the opponent's id. */
export function nameOld(table: Table, pairs: readonly (readonly [PlayerId, string])[]): void {
  NAMES.set(table, namesFrom(table, pairs));
  LAST.set(table.id, pairs.map(([player, old]) => ({ player, old, faction: table.players.find(p => p.id === player)?.faction ?? '' })));
}

function namesOf(table: Table): Names {
  let names = NAMES.get(table);
  if (!names) {
    const last = (LAST.get(table.id) ?? []).filter(n => table.players.some(p => p.id === n.player && p.faction === n.faction) && (n.old === 'me') === (n.player === table.viewer));
    NAMES.set(table, names = namesFrom(table, last.map(n => [n.player, n.old] as const)));
  }
  return names;
}

/** The id the old model gives a player: `me` for the viewer, the opponent's own id for the rest (the player id for a table no old game named). */
export const legacyKey = (table: Table, player: PlayerId): string => namesOf(table).old.get(player) ?? player;

/** The player an old id stands for. */
export const playerOfKey = (table: Table, key: string): PlayerId | undefined =>
  namesOf(table).players.get(key) ?? (table.players.some(p => p.id === key) && !namesOf(table).old.has(key) ? key : undefined);

export const legacyPlayer = legacyKey;
export const playerOfLegacy = playerOfKey;

const sameList = <T>(list: readonly T[], next: readonly T[]): boolean => list.every((item, i) => item === next[i]);

/** A string an entry or a state holds, with what names a player in it turned by `to`: a player's id itself, or the address of a note. */
function turned(value: string, to: (key: string) => string | undefined): string {
  const direct = to(value);
  if (direct !== undefined) return direct;
  const address = noteAddress(value);
  if (address === undefined) return value;
  const next = to(address);
  return next === undefined || next === address ? value : noteFor(value, next);
}

/** A value of plain JSON with every string in it (keys too) put through `turn`; the same object when nothing changed. */
function walked<T>(value: T, turn: (s: string) => string): T {
  if (typeof value === 'string') return turn(value) as T;
  if (Array.isArray(value)) {
    const next = value.map(item => walked(item, turn));
    return (sameList(value, next) ? value : next) as T;
  }
  if (value !== null && typeof value === 'object') {
    let changed = false;
    const next: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      const k = turn(key);
      const v = walked(item, turn);
      if (k !== key || v !== item) changed = true;
      next[k] = v;
    }
    return (changed ? next : value) as T;
  }
  return value;
}

const inward = (table: Table) => (s: string): string => turned(s, key => playerOfKey(table, key));
const outward = (table: Table) => (s: string): string => turned(s, id => (table.players.some(p => p.id === id) ? legacyKey(table, id) : undefined));

/** What an old game says (a component id, a choice, a list or record of them) in the words of the table: old ids of players become player ids. */
export const toTable = <T>(table: Table, value: T): T => walked(value, inward(table));
/** The same, back: what the table says in the words of the old game. */
export const toOld = <T>(table: Table, value: T): T => walked(value, outward(table));

/** A warning as the old model words it: the players and the notes its parameters name, and the notes that lift it. */
export function warningToOld(table: Table, warning: Warning): Warning {
  const params = toOld(table, warning.params);
  const waivedBy = warning.waivedBy ? toOld(table, warning.waivedBy) : undefined;
  if (params === warning.params && waivedBy === warning.waivedBy) return warning;
  // A violation keeps its rule, step and place behind its code: it is made again, at the same step and in the same entry.
  const made = violation(warning.code, params, warning.step);
  if (warning.place?.entryId) placeIn([made], warning.place.entryId);
  if (waivedBy) made.waivedBy = waivedBy;
  return made;
}
const WARNINGS = new WeakMap<readonly Warning[], { table: Table; out: Warning[] }>();
/** A list of warnings worded for the old model; the same list for the same list. */
export function warningsToOld(table: Table, warnings: Warning[]): Warning[] {
  const known = WARNINGS.get(warnings);
  if (known && known.table === table) return known.out;
  const next = warnings.map(w => warningToOld(table, w));
  const out = sameList(warnings, next) ? warnings : next;
  WARNINGS.set(warnings, { table, out });
  return out;
}
