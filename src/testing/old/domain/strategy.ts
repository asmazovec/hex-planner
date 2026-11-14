import type { CardPlay, Round, Entry, Game, GameState, DataPack, Holdings, Payment, CardEffects } from '../../../domain/types';
import { type CardEntry, heldCards, primaryForToken, strategyTokensOwedOf, cardCostOf, type HomeNote } from '../../../domain/strategy';
import { holderOf, type Holder, effectOf } from '../../../domain/effects/registry';
import { type PaymentKind } from '../../../domain/payment';
import { productionDue } from '../../../domain/replay/production';
import { autoPay } from './payment';
import { playedCost } from '../../../domain/effects/playedCost';
import { seatSlots } from '../../../domain/mapBuilder';

export { controlsMecatol } from '../../../domain/replay/cards/imperial';
export type CardPatch = CardPlay & { type?: CardEntry['type'] };
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
export const isMainPrimary = (entry: Entry, held: number[]): boolean =>
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
 * How many strategy tokens the entry owes: `costsStrategyToken` says whether a token is owed at all, and the `strategyCost`
 * point asks the components in force for the player, and those the entry names in `uses` or `spends`, how many (a faction
 * ability, an agent or a card that makes the token free). `state` is the owner's board before the entry, `shared` mine.
 */
export function strategyTokensOwed(
  entry: CardEntry, play: { held?: number[]; free?: boolean }, game: Pick<Game, 'faction'>, state: GameState, shared: GameState, pack: DataPack,
): number {
  return strategyTokensOwedOf(entry, play, holderOf(game, state, shared), pack);
}
/** What the entry owes in resources or influence: Leadership's bought tokens, Technology's research, or the units it produces. */
export function cardCost(
  entry: CardEntry, factionId: string, who: Holdings | Holder, pack: DataPack, at?: { game: Game; state: GameState },
): { kind: PaymentKind; amount: number } {
  return cardCostOf(entry, factionId, who, pack, at && (units => productionDue(at.game, at.state, units, pack, entry)));
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
