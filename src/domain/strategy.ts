import { strategyCardSet } from './cards';
import { seatSlots } from './mapBuilder';
import { autoPay, type PaymentKind } from './payment';
import { CARD, handlerOf } from './replay/cards/index';
import { LEADERSHIP_FREE } from './replay/cards/leadership';
import { productionCost } from './unitStats';
import type { CardEffects, CardPlay, DataPack, Entry, ExpansionId, Game, GameState, Round, StructureKind, UnitCounts, UnitId } from './types';

export { diplomacySystemAllowed, readyChoices, readyLimit } from './replay/cards/diplomacy';
export { controlsMecatol } from './replay/cards/imperial';
export { researchCount, researchLimit } from './replay/cards/technology';
export { CARD };

export type CardEntry = Extract<Entry, { type: 'strategic' | 'secondary' }>;
export type CardPatch = CardPlay & { type?: CardEntry['type'] };

/** The tokens a player takes in the status phase; abilities may give more, which only warns. */
export const STATUS_TOKENS = 2;

/** Strategy cards a player takes in a round. */
export const cardsHeld = (playerCount: number): number => (playerCount <= 4 ? 2 : 1);

/** The cards that are mine this round: the main one, and with 3 or 4 players the second one too. */
export const heldCards = (round: Round, playerCount: number): number[] =>
  (cardsHeld(playerCount) > 1 ? [round.strategyCard, round.backupCard] : [round.strategyCard]).filter((card): card is number => card !== null);

/**
 * Whether a primary is played for a token: the cards held this round decide (83.3); the entry's own flag, set when it was
 * planned, counts only while no card of the round is chosen.
 */
export const primaryForToken = (entry: CardEntry, held: number[]): boolean =>
  (held.length > 0 ? entry.card !== undefined && !held.includes(entry.card) : entry.forToken === true);

/**
 * The round with the `forToken` of my primaries following its cards, so that a saved entry agrees with the replay even
 * once no card is chosen again. With no card chosen the flags stay as they are; entries that agree stay the same objects.
 */
export function withForTokenOfRound(round: Round, playerCount: number): Round {
  const held = heldCards(round, playerCount);
  if (held.length === 0) return round;
  let changed = false;
  const entries = round.entries.map(entry => {
    if (entry.type !== 'strategic' || entry.owner) return entry;
    const forToken = primaryForToken(entry, held) || undefined;
    if (entry.forToken === forToken) return entry;
    changed = true;
    const next = { ...entry, forToken };
    if (forToken === undefined) delete next.forToken;
    return next;
  });
  return changed ? { ...round, entries } : round;
}

const isMainPrimary = (entry: Entry, held: number[]): boolean =>
  entry.type === 'strategic' && !primaryForToken(entry, held) && entry.status !== 'cancelled';

/** How a card is played: its primary is free on a card of mine and on a rival's, whose cards are not planned, and costs a token otherwise. */
export function playOf(round: Round, playerCount: number, card: number, primary: boolean, mine: boolean): Pick<CardPatch, 'type' | 'forToken'> {
  if (!primary) return { type: 'secondary', forToken: undefined };
  return { type: 'strategic', forToken: mine && !heldCards(round, playerCount).includes(card) ? true : undefined };
}

/** What a tapped card starts as: the primary of a card of mine not played yet this round, the secondary otherwise. A rival's cards are not planned: the primary. */
export function startsAsPrimary(round: Round, playerCount: number, card: number, entry: CardEntry): boolean {
  if (entry.owner) return true;
  const held = heldCards(round, playerCount);
  const played = round.entries.some(other => other.id !== entry.id && !other.owner && isMainPrimary(other, held) && (other as CardEntry).card === card);
  return held.includes(card) && !played;
}

/** The planned card a new strategy action starts with: the first of mine not played yet. */
export function plannedCard(round: Round, playerCount: number): number | undefined {
  const held = heldCards(round, playerCount);
  const played = round.entries.filter(e => !e.owner && isMainPrimary(e, held)).map(e => (e as CardEntry).card);
  return held.find(card => !played.includes(card));
}

/**
 * A secondary or a primary for a token, except Leadership's secondary, which the card makes free of tokens, and a
 * secondary Trade's primary made free. `held`: the cards of the round, which decide what a primary costs once chosen.
 */
export function costsStrategyToken(entry: CardEntry, play: { held?: number[]; free?: boolean } = {}): boolean {
  if (entry.type === 'secondary') return !handlerOf(entry.card).freeSecondary && !play.free;
  return primaryForToken(entry, play.held ?? []);
}

/**
 * What a card gives to distribute: Leadership's own and bought tokens, the token Warfare's primary gains before
 * Thunder's Edge. `before`, the state before the entry: Warfare gains a token only when the chosen system held one of mine (99 note 1).
 */
export const freeTokens = (entry: CardEntry, expansions: ExpansionId[], before?: GameState): number =>
  handlerOf(entry.card).freeTokens?.(entry, expansions, before) ?? 0;

/** Leadership's tokens as tapped: what goes beyond the free ones is bought. */
export function withLeadershipTokens(effects: CardEffects, tokens: CardEffects['tokens'], primary: boolean): CardEffects {
  const given = Object.values(tokens ?? {}).reduce<number>((sum, n) => sum + (n ?? 0), 0);
  const next: CardEffects = { ...effects, tokens };
  const bought = Math.max(0, given - (primary ? LEADERSHIP_FREE : 0));
  if (bought > 0) next.boughtTokens = bought;
  else delete next.boughtTokens;
  return next;
}

export type TokenPool = 'tactic' | 'fleet' | 'strategy';
const POOLS: TokenPool[] = ['tactic', 'fleet', 'strategy'];

/**
 * One tap on a pool of a token distribution: it always adds a token. When rearranging (99.2: `pools`, the pools before
 * the entry, given) with nothing free left, the token comes from the fullest other pool.
 */
export function tappedTokens(values: Partial<Record<TokenPool, number>>, pool: TokenPool, free: number, pools?: Record<TokenPool, number>): Partial<Record<TokenPool, number>> {
  const count = (p: TokenPool) => values[p] ?? 0;
  const next = { ...values, [pool]: count(pool) + 1 };
  const left = free - POOLS.reduce((sum, p) => sum + count(p), 0);
  if (pools && left <= 0) {
    const after = (p: TokenPool) => pools[p] + count(p);
    const source = POOLS.filter(p => p !== pool).reduce((best, p) => (after(p) > after(best) ? p : best));
    next[source] = count(source) - 1;
  }
  return next;
}

/** What the entry owes in resources or influence: Leadership's bought tokens, Technology's research, or the units it produces. */
export function cardCost(entry: CardEntry, factionId: string, upgrades: UnitId[], pack: DataPack): { kind: PaymentKind; amount: number } {
  return handlerOf(entry.card).cost?.(entry, upgrades)
    ?? { kind: 'resources', amount: productionCost(entry.effects?.production?.units ?? {}, factionId, upgrades, pack) };
}

/** Whether something was chosen, which locks the mode and the card. A payment only follows a choice. */
export function hasChoices(entry: CardEntry, round: Round): boolean {
  const e = entry.effects ?? {};
  return Object.values(e.tokens ?? {}).some(Boolean) || Boolean(e.boughtTokens) || Boolean(e.systemId) || Boolean(e.speaker) || Boolean(e.mecatol)
    || Boolean(e.researched) || Boolean(e.readied?.length) || Boolean(e.freeSecondary?.length) || Boolean(e.structures?.length) || e.production !== undefined
    || Boolean(entry.upgrades?.length)
    || round.entries.some(other => other.type === 'tactical' && other.fromCard === entry.id);
}

/** The patch for a change to the entry: a new cost pays automatically unless the payment was chosen by hand. */
export function cardChange(
  entry: CardEntry, patch: CardPatch, before: GameState, factionId: string, pack: DataPack, manual: boolean,
): CardPatch {
  const next = { ...entry, ...patch } as CardEntry;
  const was = cardCost(entry, factionId, before.upgrades, pack);
  const cost = cardCost(next, factionId, before.upgrades, pack);
  if (manual || (cost.amount === was.amount && cost.kind === was.kind)) return patch;
  return { ...patch, effects: { ...next.effects, payment: autoPay(before, cost.amount, cost.kind, pack) } };
}

const counted = (units: UnitCounts, unit: UnitId, amount: number): UnitCounts => {
  const next = { ...units };
  const count = (next[unit] ?? 0) + amount;
  if (count > 0) next[unit] = count;
  else delete next[unit];
  return next;
};

/** One tap of the shop: a card produces in one system, ground units by planet, and taking the last unit back drops the production. */
export function withProduction(effects: CardEffects, systemId: string, unit: UnitId, planetId: string | null, amount: 1 | -1): CardEffects {
  const units = counted(effects.production?.units ?? {}, unit, amount);
  const next: CardEffects = { ...effects };
  delete next.production;
  if (Object.keys(units).length === 0) return next;
  const ground = { ...(effects.production?.ground ?? {}) };
  if (planetId !== null) {
    const here = counted(ground[planetId] ?? {}, unit, amount);
    if (Object.keys(here).length > 0) ground[planetId] = here;
    else delete ground[planetId];
  }
  return { ...next, production: { systemId, units, ...(Object.keys(ground).length > 0 ? { ground } : {}) } };
}

/** The effects with a chosen system. What belongs to the old system goes: the readied planets of the base Diplomacy primary, whose text says "that system", and the structures of Construction's secondary before Thunder's Edge. */
export function withSystem(entry: CardEntry, systemId: string, expansions: ExpansionId[]): CardEffects {
  const next: CardEffects = { ...entry.effects, systemId };
  if (systemId === entry.effects?.systemId) return next;
  if (entry.card === CARD.diplomacy && entry.type === 'strategic' && strategyCardSet(expansions) === 'base_game') delete next.readied;
  if (entry.card === CARD.construction && entry.type === 'secondary' && !expansions.includes('te')) delete next.structures;
  return next;
}

export function withStructure(effects: CardEffects, kind: StructureKind, planetId: string, amount: 1 | -1): CardEffects {
  const list = effects.structures ?? [];
  const at = list.findIndex(s => s.kind === kind && s.planetId === planetId);
  const structures = amount > 0 ? [...list, { kind, planetId }] : list.filter((_, i) => i !== at);
  const next = { ...effects, structures };
  if (structures.length === 0) delete (next as CardEffects).structures;
  return next;
}

export interface Home {
  /** Where my start units stand and where home production happens, or null with nothing on the map. */
  slot: string | null;
  /** True when my seat holds no tile and the first slot with a tile stands in. */
  fallback: boolean;
}

/**
 * My home: the faction's home tile if it is on the map (for an off-map home with its gate on the map, the tile's own id,
 * which is where the projection keeps its units); otherwise the slot of my seat, whatever tile stands there; with an
 * empty seat, the first slot with a tile.
 */
export function homeOf(game: Game, pack: DataPack): Home {
  const faction = pack.factions[game.faction];
  if (!faction) return { slot: null, fallback: false };
  const onMap = (tile: string | undefined) => Object.keys(game.map).find(slot => game.map[slot].split('@')[0] === tile);
  // TODO(P2-010) #ws:movement #type:bug #rule:6-note-2 #test:006-adjacency #size:m #Creuss #off-map-home — Дом вне карты (Creuss) получает ключ тайла 51, а не слот: граф маршрутов его не знает, gridDistance даёт 1 до любой системы, подсветка пуста. Нужен слот дома вне карты, смежный только через червоточину
  const own = onMap(faction.homeTile) ?? (onMap(faction.gateTile) ? faction.homeTile : undefined);
  if (own) return { slot: own, fallback: false };
  const seat = seatSlots(game.playerCount, pack, game.layout)[game.seat - 1];
  if (seat && game.map[seat]) return { slot: seat, fallback: false };
  const first = Object.keys(game.map).find(slot => slot !== '0,0') ?? null;
  return { slot: first, fallback: first !== null };
}

export const homeSlot = (game: Game, pack: DataPack): string | null => homeOf(game, pack).slot;

/** The planets of my faction's own home tile, on the map or not. */
const ownHomePlanets = (game: Game, pack: DataPack): string[] =>
  pack.tiles[pack.factions[game.faction]?.homeTile ?? '']?.planetIds ?? [];

/** The planets I start with: of my own home, or of the tile at my seat when mine is not on the map. A fallback tile only holds the units until the seat has one. */
export function homePlanets(game: Game, pack: DataPack): string[] {
  const { slot, fallback } = homeOf(game, pack);
  if (slot === null || fallback) return ownHomePlanets(game, pack);
  return pack.tiles[(game.map[slot] ?? slot).split('@')[0]]?.planetIds ?? ownHomePlanets(game, pack);
}

/** Planets that lost their place to the tile at my seat: nothing on the map stands for them. */
export const absentHomePlanets = (game: Game, pack: DataPack): string[] => {
  const home = homePlanets(game, pack);
  return ownHomePlanets(game, pack).filter(id => !home.includes(id));
};

/** The docks of the game as they stand on the map: the one of my absent home stands on the first planet of the tile at my seat. */
export function startingDocks(game: Game, pack: DataPack): string[] {
  const absent = absentHomePlanets(game, pack);
  const [first] = homePlanets(game, pack);
  return [...new Set(game.docks.flatMap(id => (absent.includes(id) ? (first === undefined ? [] : [first]) : [id])))];
}

export type HomeNote =
  | { kind: 'foreign'; seat: number; other: string; mine: string }
  | { kind: 'noHome'; seat: number };

/** What the Game screen says about the homes: a seat holding another faction's home system, or my seat holding nothing. */
export function homeNotes(game: Game, pack: DataPack): HomeNote[] {
  const slots = seatSlots(game.playerCount, pack, game.layout);
  const onMap = (tile: string | undefined) => tile !== undefined && Object.values(game.map).some(id => id.split('@')[0] === tile);
  const notes: HomeNote[] = [];
  for (const player of [game, ...game.opponents]) {
    const def = pack.factions[player.faction];
    if (!def || onMap(def.homeTile) || onMap(def.gateTile)) continue;
    const tile = game.map[slots[player.seat - 1]]?.split('@')[0];
    if (tile === undefined) {
      if (player === game) notes.push({ kind: 'noHome', seat: player.seat });
      continue;
    }
    if (pack.tiles[tile]?.kind !== 'home') continue;
    const owners = Object.values(pack.factions).filter(f => f.homeTile === tile || f.gateTile === tile);
    const other = owners.find(f => !f.id.startsWith('keleres')) ?? owners[0];
    if (other) notes.push({ kind: 'foreign', seat: player.seat, other: other.id, mine: player.faction });
  }
  return notes;
}
