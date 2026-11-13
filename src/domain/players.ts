import { noteAddress } from './components';
import { genericNotes, startForFaction, withoutNotesOf } from './holdings';
import { defaultLayout, moveToTemplate, ownHomeSlots, seatSlots, slotsFor, templateFor, withPlacedTiles } from './mapBuilder';
import { createGame, makeId, slotKeyOf, timeIdMaker, type IdMaker } from './newGame';
import { startStructures } from './startStructures';
import { splitStartUnits } from './strategy';
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

/**
 * The game as an opponent plays it: they are the player, what they hold is theirs, what I hold is an enemy's, and their
 * opponents are the others, me among them under the id `me`. My units are not in the game: the replay gives their routes
 * my ships (`blockersOf`). For me, or for someone gone, it is the game itself.
 */
export function gameAs(game: Game, owner: string | undefined): Game {
  const rival = game.opponents.find(o => o.id === owner);
  if (!rival) return game;
  const without = (record: Game['enemyUnits']): Game['enemyUnits'] => Object.fromEntries(Object.entries(record).flatMap(([place, byOwner]) => {
    const { [rival.id]: mine, ...others } = byOwner;
    void mine;
    return Object.keys(others).length > 0 ? [[place, others]] : [];
  }));
  const holderOf = (id: string): string => (game.planetControl[id] === 'enemy' ? planetHolder(game, id) ?? 'me' : 'me');
  const enemyPlanets = Object.keys(game.planetControl).filter(id => holderOf(id) !== rival.id);
  return {
    ...game,
    faction: rival.faction, seat: rival.seat, color: rival.color, vp: rival.vp,
    opponents: playersOf(game).filter(p => p.id !== rival.id),
    start: { me: game.start.opponents[rival.id] ?? {}, opponents: { ...Object.fromEntries(Object.entries(game.start.opponents).filter(([id]) => id !== rival.id)), me: game.start.me } },
    planetControl: Object.fromEntries(Object.keys(game.planetControl).map(id => [id, enemyPlanets.includes(id) ? 'enemy' as const : 'me' as const])),
    planetOwner: { ...game.planetOwner, ...Object.fromEntries(enemyPlanets.map(id => [id, holderOf(id)])) },
    enemyUnits: without(game.enemyUnits),
    enemyGround: without(game.enemyGround),
  };
}

/** A game begins: every opponent stands at their seat with their faction's start units, and their home planets are theirs. */
export function placeStartUnits(game: Game, pack: DataPack): Game {
  const slots = seatSlots(game.playerCount, pack, game.layout);
  return game.opponents.reduce<Game>((next, { id, faction, seat }) => {
    const def = pack.factions[faction];
    const slot = slots[seat - 1];
    if (!def || !slot) return next;
    const homes = pack.tiles[def.homeTile]?.planetIds ?? [];
    const onMap = [def.homeTile, def.gateTile].includes(next.map[slot]?.split('@')[0]);
    const [home] = homes;
    const split = splitStartUnits(def.startUnits, onMap ? home : undefined, pack);
    return {
      ...next,
      enemyUnits: { ...next.enemyUnits, [slot]: { ...next.enemyUnits[slot], [id]: split.space } },
      ...(onMap ? {
        enemyGround: home === undefined || Object.keys(split.ground).length === 0 ? next.enemyGround : { ...next.enemyGround, [home]: { ...next.enemyGround[home], [id]: split.ground } },
        // The structures of the sheet stand on the first home planet (see startStructures).
        docks: home === undefined || !(def.startStructures?.spacedock) || next.docks.includes(home) ? next.docks : [...next.docks, home],
        pds: home === undefined || !(def.startStructures?.pds) ? next.pds : { ...next.pds, [home]: def.startStructures.pds },
        planetControl: { ...next.planetControl, ...Object.fromEntries(homes.map(planet => [planet, 'enemy' as const])) },
        planetOwner: { ...next.planetOwner, ...Object.fromEntries(homes.map(planet => [planet, id])) },
      } : {}),
    };
  }, game);
}

/** The most players the map templates of the pack allow. */
export const maxPlayers = (pack: DataPack): number => Math.max(MIN_PLAYERS, ...pack.templates.map(t => t.playerCount));

/** The map tile of a faction's home: its gate when the planets lie on an off-map tile. */
const homeTileOnMap = (faction: string, pack: DataPack): string | undefined => {
  const def = pack.factions[faction];
  return def?.gateTile ?? def?.homeTile;
};

/**
 * The slots of the seats that hold no tile while their player has a faction: each takes that faction's home tile. A map
 * pasted from a Milty string leaves the home slots at 0, and the homes are placed by themselves.
 */
export function emptySeatHomes(game: Game, pack: DataPack): Record<string, string> {
  const slots = seatSlots(game.playerCount, pack, game.layout);
  const homes: Record<string, string> = {};
  for (const player of playersOf(game)) {
    const slot = slots[player.seat - 1];
    const tile = homeTileOnMap(player.faction, pack);
    if (slot && tile && !game.map[slot]) homes[slot] = tile;
  }
  return homes;
}

/** The game with the home tile of each seated faction on its empty seat. */
export const withSeatHomes = (game: Game, pack: DataPack): Game => {
  const homes = emptySeatHomes(game, pack);
  return Object.keys(homes).length === 0 ? game : { ...game, map: { ...game.map, ...homes } };
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
export function addPlayer(game: Game, pack: DataPack, newId: IdMaker = timeIdMaker): Game {
  const players = playersOf(game);
  if (players.length >= maxPlayers(pack)) return game;
  const used = players.map(p => p.color);
  const color = Array.from({ length: COLORS }, (_, i) => i + 1).find(c => !used.includes(c)) ?? 1;
  const id = makeId('opponent', newId);
  // The newcomer begins with the generic notes of their colour (69).
  const start = { ...game.start, opponents: { ...game.start.opponents, [id]: { promissory: genericNotes(pack, id) } } };
  return withPlayers({ ...game, start }, [...players, { id, faction: '', vp: 0, seat: players.length + 1, color }], pack);
}

/** An entry without the notes of a player who left: those it takes, discards, plays or hands over in a transaction. */
function withoutNotes(entry: Entry, player: string): Entry {
  const gone = (id: string) => noteAddress(id) === player;
  const kept = (ids: string[] | undefined) => (ids?.some(gone) ? ids.filter(id => !gone(id)) : ids);
  const next = { ...entry } as Entry;
  for (const side of ['gains', 'spends'] as const) {
    const ids = kept(entry[side]);
    if (ids === entry[side]) continue;
    if (ids && ids.length > 0) next[side] = ids; else delete next[side];
  }
  if (next.type === 'component' && next.componentId !== undefined && gone(next.componentId)) delete next.componentId;
  if ('acts' in next && next.acts) {
    next.acts = next.acts.map(act => {
      if (act.kind !== 'transaction' || ![act.give, act.get].some(goods => goods.components?.some(gone))) return act;
      const side = (goods: typeof act.give) => {
        const { components, ...rest } = goods;
        const left = kept(components);
        return left && left.length > 0 ? { ...rest, components: left } : rest;
      };
      return { ...act, give: side(act.give), get: side(act.get) };
    });
  }
  return next;
}

/** Entries forget an opponent who left: their points, their place in card effects and their promissory notes (69.7). */
const withoutPoints = (plans: Plan[], opponentId: string): Plan[] => plans.map(plan => ({
  ...plan,
  rounds: plan.rounds.map(round => ({
    ...round,
    entries: round.entries.filter(entry => entry.owner !== opponentId).map(entry => withoutNotes(entry, opponentId)).map((entry): Entry => {
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
  const { [leaving.id]: gone, ...others } = game.start.opponents;
  void gone;
  // The notes of the player who leaves go with them, whoever held them (69.7).
  const opponents = Object.fromEntries(Object.entries(others).map(([id, start]) => [id, withoutNotesOf(start, leaving.id)]));
  const plans = withoutPoints(game.plans, leaving.id);
  return withPlayers({ ...withoutHoldings(game, leaving.id), plans, start: { me: withoutNotesOf(game.start.me, leaving.id), opponents } }, rest, pack);
}

const homePlanets = (faction: string, pack: DataPack): string[] =>
  pack.tiles[pack.factions[faction]?.homeTile ?? '']?.planetIds ?? [];

/** Sets a player's faction by list position; for my faction, control and the dock move to the new home as well. */
export function setPlayerFaction(game: Game, index: number, faction: string, pack: DataPack): Game {
  const players = playersOf(game);
  if (!players[index] || players[index].faction === faction) return game;
  const seated = withPlayers(game, players.map((p, i) => (i === index ? { ...p, faction } : p)), pack);
  // The starting technologies follow the faction, for me and for an opponent alike.
  const begins = startForFaction(index === 0 ? game.start.me : game.start.opponents[players[index].id], players[index].faction, faction, pack, players[index].id);
  const next: Game = { ...seated, start: index === 0 ? { ...game.start, me: begins } : { ...game.start, opponents: { ...game.start.opponents, [players[index].id]: begins } } };
  if (index !== 0) return next;
  const old = homePlanets(game.faction, pack);
  const fresh = homePlanets(faction, pack);
  const planetControl = Object.fromEntries(Object.entries(game.planetControl).filter(([id]) => !old.includes(id)));
  for (const id of fresh) planetControl[id] = 'me';
  const planetOwner = Object.fromEntries(Object.entries(game.planetOwner).filter(([id]) => !old.includes(id) && !fresh.includes(id)));
  const begin = startStructures(faction, pack);
  const pds = { ...Object.fromEntries(Object.entries(game.pds).filter(([id]) => !old.includes(id))), ...begin.pds };
  return { ...next, planetControl, planetOwner, docks: [...game.docks.filter(id => !old.includes(id)), ...begin.docks], pds };
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
 * maximum leave from the end of the list, and the seats of the rest close up in order. Placed tiles the pack still has stay.
 */
export function draftWithExpansions(draft: Game, expansions: ExpansionId[], pack: DataPack): Game {
  const kept = playersOf(draft).slice(0, maxPlayers(pack));
  const order = [...kept].sort((a, b) => a.seat - b.seat);
  const seated = kept.map(p => ({ ...p, seat: order.indexOf(p) + 1, faction: '' }));
  const layout = templateFor(kept.length, draft.layout, pack) ? draft.layout : undefined;
  const blank = createGame({ expansions, playerCount: kept.length, faction: '', layout }, pack);
  // The players keep their ids, so the notes of the blank game are dealt again, to them.
  const start = { me: blank.start.me, opponents: Object.fromEntries(seated.slice(1).map(p => [p.id, { promissory: genericNotes(pack, p.id) }])) };
  const empty = withPlayers({ ...blank, id: draft.id, start }, seated, pack);
  const seatedGame = kept.reduce<Game>(
    (game, player, index) => (pack.factions[player.faction] ? setPlayerFaction(game, index, player.faction, pack) : game),
    empty,
  );
  // The map is built before the start: its tiles stay, except those of an expansion turned off.
  return withPlacedTiles(seatedGame, draft.map, pack);
}
