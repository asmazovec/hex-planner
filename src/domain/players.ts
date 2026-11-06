import { defaultLayout, moveToTemplate, ownHomeSlots, seatSlots, slotsFor, templateFor } from './mapBuilder';
import { createGame, makeId, slotKeyOf } from './newGame';
import type { CardEffects, DataPack, Entry, ExpansionId, Game, MapLayout, Opponent, Plan } from './types';

/** An opponent, or me under the id `me`. */
export type Player = Opponent;

export const MIN_PLAYERS = 3;
const COLORS = 8;

/** Everyone in list order: my faction first. A player's number is the position in this list plus one. */
export const playersOf = (game: Game): Player[] => [
  { id: 'me', faction: game.faction, vp: game.vp, seat: game.seat, color: game.color }, ...game.opponents,
];

export const opponentsBySeat = (game: Pick<Game, 'opponents'>): Opponent[] => [...game.opponents].sort((a, b) => a.seat - b.seat);

/** The opponent an enemy planet belongs to: its owner, or the first opponent when it has none. */
export const planetHolder = (game: Pick<Game, 'opponents' | 'planetOwner'>, planetId: string): string | undefined =>
  game.opponents.find(o => o.id === game.planetOwner[planetId])?.id ?? game.opponents[0]?.id;

const planetsHeldBy = (game: Game, opponentId: string): string[] =>
  Object.keys(game.planetControl).filter(id => game.planetControl[id] === 'enemy' && planetHolder(game, id) === opponentId);

/** What an opponent has on the map: units across all systems and enemy planets. */
export function opponentHoldings(game: Game, opponentId: string): { units: number; planets: number } {
  const units = [...Object.values(game.enemyUnits), ...Object.values(game.enemyGround)]
    .flatMap(byOwner => Object.values(byOwner[opponentId] ?? {}))
    .reduce<number>((sum, n) => sum + (n ?? 0), 0);
  return { units, planets: planetsHeldBy(game, opponentId).length };
}

/** Takes an opponent off the map: their units and structures go, and their planets become free. */
function withoutHoldings(game: Game, opponentId: string): Game {
  const planets = planetsHeldBy(game, opponentId);
  const without = (record: Game['enemyUnits']): Game['enemyUnits'] => Object.fromEntries(Object.entries(record).flatMap(([place, byOwner]) => {
    const rest = Object.fromEntries(Object.entries(byOwner).filter(([owner]) => owner !== opponentId));
    return Object.keys(rest).length > 0 ? [[place, rest]] : [];
  }));
  return {
    ...game,
    enemyUnits: without(game.enemyUnits),
    enemyGround: without(game.enemyGround),
    planetControl: Object.fromEntries(Object.entries(game.planetControl).filter(([id]) => !planets.includes(id))),
    planetOwner: Object.fromEntries(Object.entries(game.planetOwner).filter(([id, owner]) => owner !== opponentId && !planets.includes(id))),
    docks: game.docks.filter(id => !planets.includes(id)),
    pds: Object.fromEntries(Object.entries(game.pds).filter(([id]) => !planets.includes(id))),
  };
}

/** The most players the map templates of the pack allow. */
export const maxPlayers = (pack: DataPack): number => Math.max(MIN_PLAYERS, ...pack.templates.map(t => t.playerCount));

/** The map tile of a faction's home: its gate when the planets lie on an off-map tile. */
const homeTileOnMap = (faction: string, pack: DataPack): string | undefined => {
  const def = pack.factions[faction];
  return def?.gateTile ?? def?.homeTile;
};

/** The tiles the player placed: not fixed by the template and not a player's home tile at that player's seat. */
const userTiles = (game: Game, pack: DataPack): string[] => {
  const fixed = new Map(slotsFor(game.playerCount, pack, game.layout).map(s => [slotKeyOf(s.q, s.r), s.fixed]));
  const own = ownHomeSlots(game, pack);
  return Object.entries(game.map).filter(([slot, tile]) => fixed.get(slot) !== tile && !own.has(slot)).map(([slot]) => slot);
};

/** A map with tiles of the player keeps its layout if the new count has it; otherwise the rules' layout applies. */
const layoutForCount = (game: Game, count: number, pack: DataPack): MapLayout =>
  (userTiles(game, pack).length > 0 && templateFor(count, game.layout, pack) ? game.layout : defaultLayout(count, pack));

/** The map after the players change: own home tiles lift off, the template follows the count, homes land in empty seat slots. */
function mapFor(game: Game, players: Player[], layout: MapLayout, pack: DataPack): Game['map'] {
  const own = ownHomeSlots(game, pack);
  const kept = Object.fromEntries(Object.entries(game.map).filter(([slot]) => !own.has(slot)));
  const template = templateFor(players.length, layout, pack);
  const map = players.length !== game.playerCount && template
    ? moveToTemplate(kept, slotsFor(game.playerCount, pack, game.layout), template, pack)
    : kept;
  const slots = seatSlots(players.length, pack, layout);
  for (const player of players) {
    const slot = slots[player.seat - 1];
    const tile = homeTileOnMap(player.faction, pack);
    if (slot && tile && !map[slot]) map[slot] = tile;
  }
  return map;
}

function withPlayers(game: Game, players: Player[], pack: DataPack): Game {
  const [me, ...opponents] = players;
  const count = players.length;
  const layout = count === game.playerCount ? game.layout : layoutForCount(game, count, pack);
  return {
    ...game,
    faction: me.faction, vp: me.vp, seat: me.seat, color: me.color, opponents, playerCount: count, layout,
    map: mapFor(game, players, layout, pack),
    fracture: game.fracture.seat !== null && game.fracture.seat > count ? { ...game.fracture, seat: null } : game.fracture,
  };
}

/** A new opponent takes the last seat and the first free colour. The maximum of the pack stops it. */
export function addPlayer(game: Game, pack: DataPack): Game {
  const players = playersOf(game);
  if (players.length >= maxPlayers(pack)) return game;
  const used = players.map(p => p.color);
  const color = Array.from({ length: COLORS }, (_, i) => i + 1).find(c => !used.includes(c)) ?? 1;
  return withPlayers(game, [...players, { id: makeId('opponent'), faction: '', vp: 0, seat: players.length + 1, color }], pack);
}

/** Entries forget an opponent who left: their points and their place in card effects. */
const withoutPoints = (plans: Plan[], opponentId: string): Plan[] => plans.map(plan => ({
  ...plan,
  rounds: plan.rounds.map(round => ({
    ...round,
    entries: round.entries.map((entry): Entry => {
      if (entry.type === 'statusTokens' && entry.opponentVp) {
        const { [opponentId]: gone, ...opponentVp } = entry.opponentVp;
        void gone;
        return { ...entry, opponentVp };
      }
      if ((entry.type === 'strategic' || entry.type === 'secondary') && entry.effects) {
        const { speaker, freeSecondary, ...rest } = entry.effects;
        const effects: CardEffects = { ...rest };
        if (speaker !== undefined && speaker !== opponentId) effects.speaker = speaker;
        const free = (freeSecondary ?? []).filter(id => id !== opponentId);
        if (free.length > 0) effects.freeSecondary = free;
        return { ...entry, effects };
      }
      return entry;
    }),
  })),
}));

/** Removes a player and what they hold on the map by list position; later seats shift down. My faction (position 0) stays, and so do the last three players. */
export function removePlayer(game: Game, index: number, pack: DataPack): Game {
  const players = playersOf(game);
  const leaving = players[index];
  if (index === 0 || !leaving || players.length <= MIN_PLAYERS) return game;
  const rest = players.filter((_, i) => i !== index).map(p => (p.seat > leaving.seat ? { ...p, seat: p.seat - 1 } : p));
  const { [leaving.id]: gone, ...opponents } = game.upgrades.opponents;
  void gone;
  const plans = withoutPoints(game.plans, leaving.id);
  return withPlayers({ ...withoutHoldings(game, leaving.id), plans, upgrades: { ...game.upgrades, opponents } }, rest, pack);
}

const homePlanets = (faction: string, pack: DataPack): string[] =>
  pack.tiles[pack.factions[faction]?.homeTile ?? '']?.planetIds ?? [];

/** Sets a player's faction by list position; for my faction, control and the dock move to the new home as well. */
export function setPlayerFaction(game: Game, index: number, faction: string, pack: DataPack): Game {
  const players = playersOf(game);
  if (!players[index] || players[index].faction === faction) return game;
  const next = withPlayers(game, players.map((p, i) => (i === index ? { ...p, faction } : p)), pack);
  if (index !== 0) return next;
  const old = homePlanets(game.faction, pack);
  const fresh = homePlanets(faction, pack);
  const planetControl = Object.fromEntries(Object.entries(game.planetControl).filter(([id]) => !old.includes(id)));
  for (const id of fresh) planetControl[id] = 'me';
  const planetOwner = Object.fromEntries(Object.entries(game.planetOwner).filter(([id]) => !old.includes(id) && !fresh.includes(id)));
  const pds = Object.fromEntries(Object.entries(game.pds).filter(([id]) => !old.includes(id)));
  return { ...next, planetControl, planetOwner, docks: [...game.docks.filter(id => !old.includes(id)), ...fresh.slice(0, 1)], pds };
}


/** Two players trade seats; their own home tiles trade with them. */
export function swapSeats(game: Game, a: number, b: number, pack: DataPack): Game {
  const players = playersOf(game);
  if (a === b || !players[a] || !players[b]) return game;
  return withPlayers(game, players.map((p, i) => {
    if (i === a) return { ...p, seat: players[b].seat };
    return i === b ? { ...p, seat: players[a].seat } : p;
  }), pack);
}

/** What going to another count means for the map: the tiles the player has placed, and how many of them would leave. */
export function countChangeEffect(game: Game, count: number, pack: DataPack): { filled: number; lost: number } {
  const tiles = userTiles(game, pack);
  const template = templateFor(count, layoutForCount(game, count, pack), pack);
  if (!template) return { filled: tiles.length, lost: 0 };
  const map = moveToTemplate(game.map, slotsFor(game.playerCount, pack, game.layout), template, pack);
  return { filled: tiles.length, lost: tiles.filter(slot => map[slot] !== game.map[slot]).length };
}

/**
 * A game not started yet, under another set of expansions: factions outside the set are cleared, players beyond its
 * maximum leave from the end of the list, and the seats of the rest close up in order.
 */
export function draftWithExpansions(draft: Game, expansions: ExpansionId[], pack: DataPack): Game {
  const kept = playersOf(draft).slice(0, maxPlayers(pack));
  const order = [...kept].sort((a, b) => a.seat - b.seat);
  const seated = kept.map(p => ({ ...p, seat: order.indexOf(p) + 1, faction: '' }));
  const layout = templateFor(kept.length, draft.layout, pack) ? draft.layout : undefined;
  const blank = createGame({ expansions, playerCount: kept.length, faction: '', layout }, pack);
  const empty = withPlayers({ ...blank, id: draft.id }, seated, pack);
  return kept.reduce<Game>(
    (game, player, index) => (pack.factions[player.faction] ? setPlayerFaction(game, index, player.faction, pack) : game),
    empty,
  );
}
