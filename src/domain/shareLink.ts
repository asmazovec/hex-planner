import { LAYOUT_ORDER, templateOf } from './layouts';
import { arrangeSet, parseMapString, ringSlots } from './mapString';
import { createGame } from './newGame';
import { maxPlayers, MIN_PLAYERS, playersOf, setPlayerFaction, swapSeats } from './players';
import type { DataPack, ExpansionId, Game, MapLayout } from './types';

const EXPANSIONS: ExpansionId[] = ['pok', 'te'];
const NO_EXPANSIONS = 'base';
const EMPTY_SEAT = '-';
const RINGS = [1, 2, 3, 4];

/** A short id of a faction for links: three hex digits of a hash of its id, so it never changes as the data grows. */
export function factionCode(id: string): string {
  let hash = 0x811c9dc5;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193);
  return ((hash >>> 0) % 0x1000).toString(16).padStart(3, '0');
}

/** The faction a link means: by its code, or by its id as links wrote it before. Empty when the pack has no such faction. */
const factionOf = (token: string, pack: DataPack): string =>
  (pack.factions[token] ? token : Object.keys(pack.factions).find(id => factionCode(id) === token) ?? '');

/** What a link says about a game. Anything it leaves out stays as a new game has it. */
export interface ShareParams {
  /** The name of the save this link is about. */
  name?: string;
  expansions?: ExpansionId[];
  layout?: MapLayout;
  /** Factions by seat as the link writes them, from seat 1; an empty string is a seat with no faction chosen. */
  factions?: string[];
  /** The seat of the one who opens the link. */
  me?: number;
  /** A map string, as Milty Draft writes it. */
  map?: string;
}

/** Reads the query of a link; null when it says nothing about a game. */
export function readShareLink(search: string): ShareParams | null {
  const query = new URLSearchParams(search);
  const share: ShareParams = {};
  const name = query.get('name')?.trim();
  if (name) share.name = name;
  const exp = query.get('exp');
  if (exp !== null) share.expansions = EXPANSIONS.filter(id => exp.split(',').includes(id));
  const layout = LAYOUT_ORDER.find(id => id === query.get('layout'));
  if (layout) share.layout = layout;
  const factions = query.get('factions');
  if (factions) share.factions = factions.split(',').map(f => (f === EMPTY_SEAT ? '' : f.trim()));
  const me = Number(query.get('me'));
  if (Number.isInteger(me) && me >= 1) share.me = me;
  const map = query.get('map');
  if (map) share.map = map;
  return Object.keys(share).length > 0 ? share : null;
}

/**
 * The game not started yet that a link describes. Factions and tiles the chosen expansions lack are left out rather
 * than refused: a link that is partly wrong still gives what it can.
 */
export function draftFromShare(share: ShareParams, base: Game, packOf: (expansions: ExpansionId[]) => DataPack): Game {
  const expansions = share.expansions ?? base.expansions;
  const pack = packOf(expansions);
  const count = Math.min(maxPlayers(pack), Math.max(MIN_PLAYERS, share.factions?.length ?? base.playerCount));
  const parsed = share.map ? parseMapString(share.map, count, pack) : null;
  const layout = share.layout ?? parsed?.layout ?? (share.factions || share.expansions ? undefined : base.layout);
  const blank = createGame({ expansions, playerCount: count, faction: '', layout }, pack);

  const seated = share.me && share.me <= count ? swapSeats(blank, 0, playersOf(blank).findIndex(p => p.seat === share.me), pack) : blank;
  const named = (share.factions ?? []).slice(0, count).reduce<Game>((game, faction, i) => {
    const index = playersOf(game).findIndex(p => p.seat === i + 1);
    const id = factionOf(faction, pack);
    return id ? setPlayerFaction(game, index, id, pack) : game;
  }, seated);

  if (!parsed) return withName(named, share.name);
  const placed = parsed.kind === 'set' ? arrangeSet(parsed.set, count, pack, named.layout) : parsed;
  return withName({ ...named, map: { ...named.map, ...placed.map } }, share.name);
}

const withName = (game: Game, name: string | undefined): Game => (name ? { ...game, name } : game);

export type ShareDifference = 'expansions' | 'layout' | 'factions' | 'seat' | 'map';

/** Where a link disagrees with a saved game. What the link leaves out is no disagreement. */
export function shareDifferences(share: ShareParams, saved: Game, packOf: (expansions: ExpansionId[]) => DataPack): ShareDifference[] {
  const pack = packOf(saved.expansions);
  const differences: ShareDifference[] = [];
  const same = (a: string[], b: string[]) => [...a].sort().join() === [...b].sort().join();
  if (share.expansions && !same(share.expansions, saved.expansions)) differences.push('expansions');
  // A layout the player count lacks (seven players without hyperlanes, retired) means the one a new game would take.
  const layout = share.layout && (templateOf(saved.playerCount, pack, share.layout)?.layout ?? share.layout);
  if (layout && layout !== saved.layout) differences.push('layout');
  const players = playersOf(saved);
  if (share.factions && (share.factions.length !== saved.playerCount || share.factions.some((faction, i) => factionOf(faction, pack) !== (players.find(p => p.seat === i + 1)?.faction ?? '')))) differences.push('factions');
  if (share.me && share.me !== saved.seat) differences.push('seat');
  if (share.map) {
    const parsed = parseMapString(share.map, saved.playerCount, pack);
    const placed = parsed.kind === 'set' ? arrangeSet(parsed.set, saved.playerCount, pack, saved.layout) : parsed;
    if (Object.entries(placed.map).some(([slot, tile]) => saved.map[slot] !== tile)) differences.push('map');
  }
  return differences;
}

/** The query of a link to a game: its expansions, its layout, who sits where, and its map as a Milty string. */
export function shareLinkQuery(game: Game): string {
  const players = playersOf(game);
  const bySeat = Array.from({ length: game.playerCount }, (_, i) => {
    const faction = players.find(p => p.seat === i + 1)?.faction;
    return faction ? factionCode(faction) : EMPTY_SEAT;
  });
  const tokens = RINGS.flatMap(ringSlots).map(slot => (game.map[slot] ?? '0').replace('@', ''));
  while (tokens.at(-1) === '0') tokens.pop();
  const query = new URLSearchParams({ ...(game.name ? { name: game.name } : {}), exp: game.expansions.join(',') || NO_EXPANSIONS, layout: game.layout, factions: bySeat.join(',') });
  if (game.seat !== 1) query.set('me', String(game.seat));
  if (tokens.length > 0) query.set('map', tokens.join(' '));
  return query.toString();
}
