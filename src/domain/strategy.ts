import { strategyCardSet } from './cards';
import { appliedFor } from './effects/entryApply';
import type { Holder } from './effects/registry';
import { type PaymentKind } from './payment';
import { CARD, handlerOf } from './replay/cards/index';
import { LEADERSHIP_FREE } from './replay/cards/leadership';
import { productionCost } from './unitStats';
import type { TokensOn } from './readers';
import type { CardEffects, DataPack, ExpansionId, StructureKind, UnitCounts, UnitId } from './types';
import type { TurnDeeds, TurnFacts, RoundFacts } from '../game/turnFacts';
import type { Shelf } from './shelf';

export { readyLimit } from './replay/cards/diplomacy';
export { researchCount, researchLimit } from './replay/cards/technology';
export { CARD };

export type CardEntry = Extract<TurnFacts, { type: 'strategic' | 'secondary' }>;
/** A strategy card played, for what does not ask whose turn it is. */
export type CardDeeds = Extract<TurnDeeds, { type: 'strategic' | 'secondary' }>;

/** The tokens a player takes in the status phase; abilities may give more, which only warns. */
export const STATUS_TOKENS = 2;

/** Strategy cards a player takes in a round. */
export const cardsHeld = (playerCount: number): number => (playerCount <= 4 ? 2 : 1);

/** The cards that are mine this round: the main one, and with 3 or 4 players the second one too. */
export const heldCards = (round: Pick<RoundFacts, 'strategyCard' | 'backupCard'>, playerCount: number): number[] =>
  (cardsHeld(playerCount) > 1 ? [round.strategyCard, round.backupCard] : [round.strategyCard]).filter((card): card is number => card !== null);

/**
 * Whether a primary is played for a token: the cards held this round decide (83.3); the entry's own flag, set when it was
 * planned, counts only while no card of the round is chosen.
 */
export const primaryForToken = (entry: CardDeeds, held: number[]): boolean =>
  (held.length > 0 ? entry.card !== undefined && !held.includes(entry.card) : entry.forToken === true);

/**
 * A secondary or a primary for a token, except Leadership's secondary, which the card makes free of tokens, and a
 * secondary Trade's primary made free. `held`: the cards of the round, which decide what a primary costs once chosen.
 */
export function costsStrategyToken(entry: CardDeeds, play: { held?: number[]; free?: boolean } = {}): boolean {
  if (entry.type === 'secondary') return !handlerOf(entry.card).freeSecondary && !play.free;
  return primaryForToken(entry, play.held ?? []);
}

/** The same for a holder: what they hold is what stood before the entry. */
export function strategyTokensOwedOf(entry: CardEntry, play: { held?: number[]; free?: boolean }, holder: Holder, pack: DataPack): number {
  if (!costsStrategyToken(entry, play)) return 0;
  return Math.max(0, appliedFor(pack, holder, entry, 'strategyCost', 1, { card: entry.card, secondary: entry.type === 'secondary' }, holder).value);
}

/**
 * What a card gives to distribute: Leadership's own and bought tokens, the token Warfare's primary gains before
 * Thunder's Edge. `before`, the state before the entry: Warfare gains a token only when the chosen system held one of mine (99 note 1).
 */
export const freeTokens = (entry: CardEntry, expansions: ExpansionId[], before?: TokensOn): number =>
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

/** The same with the combined cost of the units asked of whoever knows the board (`due`). */
export function cardCostOf(
  entry: CardEntry, factionId: string, who: Shelf | Holder, pack: DataPack, due?: (units: UnitCounts) => number,
): { kind: PaymentKind; amount: number } {
  if (handlerOf(entry.card).placesFree?.(entry, { pack, faction: factionId })) return { kind: 'resources', amount: 0 };
  const own = handlerOf(entry.card).cost?.(entry, 'holdings' in who ? who.holdings : who, { pack, faction: factionId });
  if (own) return own;
  const units = entry.effects?.production?.units ?? {};
  // With the board, the units are asked as the check asks them: the combined cost (Sarween Tools, Particle Synthesis) counts.
  return { kind: 'resources', amount: due ? due(units) : productionCost(units, factionId, who, pack, entry) };
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

/**
 * The off-map homes whose gate stands on the map (the Creuss home, LRR 6 note 2): each is a system of its own under its
 * tile id, which the route graph joins to the board by its wormhole alone. The map says it by itself: a gate tile is
 * there, and the home tile it leads to is not.
 */
const OFF_MAP = new WeakMap<DataPack, [string, string][]>();
export function offMapHomes(game: { map: Record<string, string> }, pack: DataPack): string[] {
  let gates = OFF_MAP.get(pack);
  if (!gates) OFF_MAP.set(pack, gates = [...new Map(Object.values(pack.factions).flatMap(def => (def.gateTile ? [[def.gateTile, def.homeTile] as [string, string]] : []))).entries()]);
  if (gates.length === 0) return [];
  const onMap = new Set(Object.values(game.map).map(id => id.split('@')[0]));
  return gates.flatMap(([gate, home]) => (onMap.has(gate) && !onMap.has(home) ? [home] : []));
}

/** A faction's start units split by where they stand: ships in the space of the home system, ground forces on its planet (LRR 43.1; the one with the space dock). */
export function splitStartUnits(units: UnitCounts, planetId: string | undefined, pack: DataPack): { space: UnitCounts; ground: UnitCounts } {
  const space: UnitCounts = {};
  const ground: UnitCounts = {};
  for (const id of Object.keys(units) as UnitId[]) {
    (planetId !== undefined && pack.units[id]?.ground ? ground : space)[id] = units[id];
  }
  return { space, ground };
}

export type HomeNote =
  | { kind: 'foreign'; seat: number; other: string; mine: string }
  | { kind: 'noHome'; seat: number };
