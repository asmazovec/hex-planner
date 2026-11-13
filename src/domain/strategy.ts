import { strategyCardSet } from './cards';
import { appliedFor } from './effects/entryApply';
import { effectOf, holderOf } from './effects/registry';
import type { Holder } from './effects/registry';
import { seatSlots } from './mapBuilder';
import { autoPay, type PaymentKind } from './payment';
import { CARD, handlerOf } from './replay/cards/index';
import { LEADERSHIP_FREE } from './replay/cards/leadership';
import { playedCost } from './effects/playedCost';
import { productionDue } from './replay/production';
import { productionCost } from './unitStats';
import type { CardEffects, CardPlay, DataPack, Entry, ExpansionId, Game, GameState, Holdings, Payment, Round, StructureKind, UnitCounts, UnitId } from './types';

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

/** The planned card a new strategic action starts with: the first of mine not played yet. */
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
 * How many strategy tokens the entry owes: `costsStrategyToken` says whether a token is owed at all, and the `strategyCost`
 * point asks the components in force for the player, and those the entry names in `uses` or `spends`, how many (a faction
 * ability, an agent or a card that makes the token free). `state` is the owner's board before the entry, `shared` mine.
 */
export function strategyTokensOwed(
  entry: CardEntry, play: { held?: number[]; free?: boolean }, game: Pick<Game, 'faction'>, state: GameState, shared: GameState, pack: DataPack,
): number {
  if (!costsStrategyToken(entry, play)) return 0;
  return Math.max(0, appliedFor(pack, holderOf(game, state, shared), entry, 'strategyCost', 1, { card: entry.card, secondary: entry.type === 'secondary' }, state).value);
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
export function cardCost(
  entry: CardEntry, factionId: string, who: Holdings | Holder, pack: DataPack, at?: { game: Game; state: GameState },
): { kind: PaymentKind; amount: number } {
  const own = handlerOf(entry.card).cost?.(entry, 'holdings' in who ? who.holdings : who, { pack, faction: factionId });
  if (own) return own;
  const units = entry.effects?.production?.units ?? {};
  // With the board, the units are asked as the check asks them: the combined cost (Sarween Tools, Particle Synthesis) counts.
  return { kind: 'resources', amount: at ? productionDue(at.game, at.state, units, pack, entry) : productionCost(units, factionId, who, pack, entry) };
}

/**
 * A switch of the card or of its side starts the play over: what the old one chose (effects, payment, research) goes,
 * and the store drops the free tactical action it started.
 */
export const freshPlay = (patch: CardPatch): CardPatch =>
  ({ ...patch, effects: undefined, ...(patch.type === 'secondary' ? { acts: undefined } : {}) } as CardPatch);

/** The patch for a change to the entry: a new cost pays automatically unless the payment was chosen by hand. */
export function cardChange(
  entry: CardEntry, patch: CardPatch, before: GameState, factionId: string, pack: DataPack, manual: boolean, game?: Game,
): CardPatch {
  const next = { ...entry, ...patch } as CardEntry;
  const at = game && { game, state: before };
  const was = cardCost(entry, factionId, before.holdings, pack, at);
  const cost = cardCost(next, factionId, before.holdings, pack, at);
  if (manual || (cost.amount === was.amount && cost.kind === was.kind)) return patch;
  return { ...patch, effects: { ...next.effects, payment: autoPay(before, cost.amount, cost.kind, pack, { faction: factionId }) } };
}

/**
 * A change to what an entry uses (an agent, a technology, a hero) may change its price: unless the payment was chosen by
 * hand, a new price pays anew from the ready planets, as a change of the units does. A tactical action's production and
 * a card's research or purchase are repriced; any other entry keeps its patch.
 */
export function repaid<P extends object>(entry: Entry, patch: P, before: GameState, game: Game, pack: DataPack, manual: boolean): P | (P & { payment: Payment }) | (P & { effects: CardEffects }) {
  const next = { ...entry, ...patch } as Entry;
  if (manual) return patch;
  if (entry.type === 'tactical' && next.type === 'tactical') {
    const was = productionDue(game, before, entry.production, pack, entry);
    const cost = productionDue(game, before, next.production, pack, next);
    return cost === was ? patch : { ...patch, payment: autoPay(before, cost, 'resources', pack, { faction: game.faction }) };
  }
  if (entry.type === 'component' && next.type === 'component') {
    const was = playedCost(pack, entry, effectOf);
    const cost = playedCost(pack, next, effectOf);
    return was?.amount === cost?.amount && was?.kind === cost?.kind || !cost ? patch : { ...patch, payment: autoPay(before, cost.amount, cost.kind, pack, { faction: game.faction }) };
  }
  if (entry.type === 'strategic' || entry.type === 'secondary') return cardChange(entry, patch as CardPatch, before, game.faction, pack, manual, game) as P & { effects: CardEffects };
  return patch;
}

const counted = (units: UnitCounts, unit: UnitId, amount: number): UnitCounts => {
  const next = { ...units };
  const count = (next[unit] ?? 0) + amount;
  if (count > 0) next[unit] = count;
  else delete next[unit];
  return next;
};

/** One tap of the shop: a card produces in one system, ground forces by planet, and taking the last unit back drops the production. */
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
 * My home: the faction's home tile if it is on the map (for an off-map home with its gate on the map, the tile's own id:
 * the projection keeps its units there and the route graph knows it, see `offMapHomes`); otherwise the slot of my seat, whatever tile stands there; with an
 * empty seat, the first slot with a tile.
 */
export function homeOf(game: Game, pack: DataPack): Home {
  const faction = pack.factions[game.faction];
  if (!faction) return { slot: null, fallback: false };
  const onMap = (tile: string | undefined) => Object.keys(game.map).find(slot => game.map[slot].split('@')[0] === tile);
  const own = onMap(faction.homeTile) ?? (onMap(faction.gateTile) ? faction.homeTile : undefined);
  if (own) return { slot: own, fallback: false };
  const seat = seatSlots(game.playerCount, pack, game.layout)[game.seat - 1];
  if (seat && game.map[seat]) return { slot: seat, fallback: false };
  const first = Object.keys(game.map).find(slot => slot !== '0,0') ?? null;
  return { slot: first, fallback: first !== null };
}

export const homeSlot = (game: Game, pack: DataPack): string | null => homeOf(game, pack).slot;

/**
 * The off-map homes of the players whose gate stands on the map (the Creuss home, LRR 6 note 2): each is a system of its
 * own under its tile id, which the route graph joins to the board by its wormhole alone.
 */
export function offMapHomes(game: Game, pack: DataPack): string[] {
  const onMap = (tile: string | undefined) => tile !== undefined && Object.values(game.map).some(id => id.split('@')[0] === tile);
  const factions = [game.faction, ...(game.opponents ?? []).map(o => o.faction)];
  return [...new Set(factions.flatMap(id => {
    const def = pack.factions[id];
    return def?.gateTile && onMap(def.gateTile) && !onMap(def.homeTile) ? [def.homeTile] : [];
  }))];
}

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
