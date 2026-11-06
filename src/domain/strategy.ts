import { strategyCardSet } from './cards';
import { seatSlots } from './mapBuilder';
import { autoPay, type PaymentKind } from './payment';
import { productionCost } from './unitStats';
import type { CardEffects, CardPlay, DataPack, Entry, ExpansionId, Game, GameState, Round, StructureKind, UnitCounts, UnitId } from './types';

export type CardEntry = Extract<Entry, { type: 'strategic' | 'secondary' }>;
export type CardPatch = CardPlay & { type?: CardEntry['type'] };

/** Initiative numbers, the same in every card set. */
export const CARD = { leadership: 1, diplomacy: 2, politics: 3, construction: 4, trade: 5, warfare: 6, technology: 7, imperial: 8 } as const;

/** The tokens a player takes in the status phase; abilities may give more, which only warns. */
export const STATUS_TOKENS = 2;
const INFLUENCE_PER_TOKEN = 3;
const SECOND_RESEARCH = 6;
const SECONDARY_RESEARCH = 4;

/** Strategy cards a player takes in a round. */
export const cardsHeld = (playerCount: number): number => (playerCount <= 4 ? 2 : 1);

const isMainPrimary = (entry: Entry): boolean =>
  entry.type === 'strategic' && !entry.forToken && entry.status !== 'cancelled';

/** Whether the round's plan already holds as many primaries as cards are held. */
export const primaryPlayed = (round: Round, playerCount: number): boolean =>
  round.entries.filter(isMainPrimary).length >= cardsHeld(playerCount);

/** The planned card a new primary starts with: the first not played yet. The other card counts only when two are held. */
export function plannedCard(round: Round, playerCount: number): number | undefined {
  const played = round.entries.filter(isMainPrimary).map(e => (e as CardEntry).card);
  const planned = cardsHeld(playerCount) > 1 ? [round.strategyCard, round.backupCard] : [round.strategyCard];
  return planned.find((card): card is number => card !== null && !played.includes(card));
}

/** A secondary or a primary for a token, except Leadership's secondary, which the card makes free of tokens. */
export const costsStrategyToken = (entry: CardEntry): boolean =>
  entry.type === 'secondary' ? entry.card !== CARD.leadership : entry.forToken === true;

/** What a card gives to distribute: Leadership's own and bought tokens, the token Warfare's primary gains before Thunder's Edge. */
export function freeTokens(entry: CardEntry, expansions: ExpansionId[]): number {
  const primary = entry.type === 'strategic';
  if (entry.card === CARD.leadership) return (primary ? 3 : 0) + (entry.effects?.boughtTokens ?? 0);
  return primary && entry.card === CARD.warfare && !expansions.includes('te') ? 1 : 0;
}

const techCost = (entry: CardEntry): number => {
  const count = entry.upgrades?.length ?? 0;
  return entry.type === 'strategic' ? Math.max(0, count - 1) * SECOND_RESEARCH : count * SECONDARY_RESEARCH;
};

/** What the entry owes in resources or influence: only these three cards ask for a countable amount. */
export function cardCost(entry: CardEntry, factionId: string, upgrades: UnitId[], pack: DataPack): { kind: PaymentKind; amount: number } {
  const { card, effects } = entry;
  if (card === CARD.leadership) return { kind: 'influence', amount: (effects?.boughtTokens ?? 0) * INFLUENCE_PER_TOKEN };
  if (card === CARD.technology) return { kind: 'resources', amount: techCost(entry) };
  return { kind: 'resources', amount: productionCost(effects?.production?.units ?? {}, factionId, upgrades, pack) };
}

/** Whether something was chosen, which locks the mode and the card. A payment only follows a choice. */
export function hasChoices(entry: CardEntry, round: Round): boolean {
  const e = entry.effects ?? {};
  return Object.values(e.tokens ?? {}).some(Boolean) || Boolean(e.boughtTokens) || Boolean(e.systemId) || Boolean(e.speaker) || Boolean(e.mecatol)
    || Boolean(e.readied?.length) || Boolean(e.freeSecondary?.length) || Boolean(e.structures?.length) || e.production !== undefined
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
  const own = onMap(faction.homeTile) ?? (onMap(faction.gateTile) ? faction.homeTile : undefined);
  if (own) return { slot: own, fallback: false };
  const seat = seatSlots(game.playerCount, pack, game.layout)[game.seat - 1];
  if (seat && game.map[seat]) return { slot: seat, fallback: false };
  const first = Object.keys(game.map).find(slot => slot !== '0,0') ?? null;
  return { slot: first, fallback: first !== null };
}

export const homeSlot = (game: Game, pack: DataPack): string | null => homeOf(game, pack).slot;

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
