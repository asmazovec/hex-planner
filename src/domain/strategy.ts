import { autoPay, type PaymentKind } from './payment';
import { productionCost } from './unitStats';
import type { CardEffects, CardPlay, DataPack, Entry, Game, GameState, Round, StructureKind, UnitId } from './types';

export type CardEntry = Extract<Entry, { type: 'strategic' | 'secondary' }>;
export type CardPatch = CardPlay & { type?: CardEntry['type'] };

/** Initiative numbers, the same in every card set. */
export const CARD = { leadership: 1, diplomacy: 2, politics: 3, construction: 4, trade: 5, warfare: 6, technology: 7, imperial: 8 } as const;

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

/** One tap of the shop: a card produces in one system, and taking the last unit back drops the production. */
export function withProduction(effects: CardEffects, systemId: string, unit: UnitId, amount: 1 | -1): CardEffects {
  const units = { ...(effects.production?.units ?? {}) };
  const count = (units[unit] ?? 0) + amount;
  if (count > 0) units[unit] = count;
  else delete units[unit];
  const next = { ...effects, production: { systemId, units } };
  if (Object.keys(units).length === 0) delete (next as CardEffects).production;
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

/** The system holding my home planets, or the gate that stands for them on the map. */
export function homeSlot(game: Game, pack: DataPack): string | null {
  const faction = pack.factions[game.faction];
  if (!faction) return null;
  const tiles = [faction.homeTile, faction.gateTile];
  return Object.keys(game.map).find(slot => tiles.includes(game.map[slot].split('@')[0])) ?? null;
}
