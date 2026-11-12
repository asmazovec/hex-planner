/** Strategy cards: who may resolve which side of which card, its token, payment and distribution; each card's own effects are its handler's. */
import { violation } from '../rules/registry';
import { CARD, cardCost, cardsHeld, freeTokens, heldCards, strategyTokensOwed, type CardEntry } from '../strategy';
import { checkStationStructures } from '../thundersEdge';
import type { DataPack, Game, GameState, Round, Warning } from '../types';
import { handlerOf, type CardRound } from './cards/index';
import { pay, readyPlanets } from './payment';
import { checkProduction, costOf, placeProduction, producerList } from './production';
import { holderOf } from '../effects/registry';
import { research } from './holdings';
import { checkPoolChange, checkTokensGiven } from './status';
import { buildStructures } from './structures';
import { checkSystem } from './transport';

/** A round's cards before its entries: only my own cards are planned; `states` holds every player's state by id (`me` and the opponents). */
export const cardRound = (round: Round, playerCount: number, states: Record<string, GameState>): CardRound =>
  ({ held: { me: heldCards(round, playerCount) }, primaries: {}, secondaries: {}, freeSecondary: {}, states });

/**
 * Who may resolve this side of the card (83.3, 83.4, 83.7, 82.1, 92.4.2), and whether it spends a strategy token.
 * A primary is the holder's: one of a card not held costs a token and is warned about. A secondary is the other
 * players', once a round. With no card of the round chosen, the entry's own `forToken` stands for the round.
 */
function checkPlay(game: Game, entry: CardEntry, round: CardRound, player: string, warnings: Warning[]): { held?: number[]; free?: boolean } {
  const card = entry.card;
  // No card chosen yet is no play of anything.
  if (card === undefined) return {};
  const held = round.held[player] ?? [];
  if (entry.type === 'strategic') {
    const primaries = (round.primaries[player] ??= []);
    if (held.length > 0 && !held.includes(card)) warnings.push(violation('foreignPrimary', {}));
    else if (held.length > 0 || !entry.forToken) {
      const repeated = primaries.includes(card);
      primaries.push(card);
      const limit = held.length > 0 ? held.length : cardsHeld(game.playerCount);
      if (repeated || primaries.length > limit) warnings.push(violation('primaryRepeated', { held: limit }));
    }
    return { held };
  }
  const secondaries = (round.secondaries[player] ??= []);
  const repeated = secondaries.includes(card);
  secondaries.push(card);
  if (held.includes(card)) warnings.push(violation('ownSecondary', {}));
  if (repeated) warnings.push(violation('secondaryRepeated', {}));
  return { free: !repeated && (round.freeSecondary[card] ?? []).includes(player) };
}

/** Applies what a strategy card can track; everything else about it is shown only. */
export function applyCard(game: Game, state: GameState, entry: CardEntry, pack: DataPack, round: CardRound, warnings: Warning[]): void {
  const primary = entry.type === 'strategic';
  // An entry of an opponent no longer in the game is replayed as mine.
  const player = entry.owner && entry.owner in round.states ? entry.owner : 'me';
  // The token the card owes: one, or what the components of the player make of it (the `strategyCost` point).
  const owed = strategyTokensOwed(entry, checkPlay(game, entry, round, player, warnings), game, state, round.states.me ?? state, pack);
  if (owed > 0) {
    if (state.strategy < owed) warnings.push(violation('shortStrategy', { have: state.strategy }));
    state.strategy -= owed;
  }
  const effects = entry.effects ?? {};
  const cost = cardCost(entry, game.faction, holderOf(game, state), pack);
  // Units a card produces use a unit's PRODUCTION: the combined cost may be reduced (Sarween Tools), as a tactical action's is.
  if (effects.production && cost.kind === 'resources' && !handlerOf(entry.card).cost) {
    cost.amount = costOf(game, state, effects.production.units, pack, producerList(game, state, effects.production.systemId, pack).length > 0, entry);
  }
  const paid = pay(state, effects.payment ?? { planets: [], tradeGoods: 0 }, cost.kind, pack, warnings, { faction: game.faction, shared: round.states.me });
  if (cost.amount > paid) {
    warnings.push(violation(cost.kind === 'influence' ? 'shortInfluence' : 'shortResources', { needed: cost.amount, paid }));
  }
  const given = (effects.tokens?.tactic ?? 0) + (effects.tokens?.fleet ?? 0) + (effects.tokens?.strategy ?? 0);
  warnings.push(...checkTokensGiven(given, freeTokens(entry, game.expansions, state), 'card'));
  for (const pool of ['tactic', 'fleet', 'strategy'] as const) {
    const change = effects.tokens?.[pool] ?? 0;
    state[pool] += change;
    if (change < 0 && state[pool] < 0) warnings.push(violation('poolNegative', { pool, have: state[pool] }));
  }
  readyPlanets(state, effects.readied ?? [], warnings);
  // The card's own effects see the technologies held before this entry.
  handlerOf(entry.card).apply?.({ game, state, entry, pack, round, player, primary, warnings });
  research(state, effects.researched, pack);
  warnings.push(...checkPoolChange(game, state, pack, effects.tokens, 'card'));
  buildStructures(game, state, effects.structures ?? [], primary, effects.systemId, pack, warnings);
  warnings.push(...checkStationStructures(effects.structures ?? [], pack));
  if (effects.production) {
    // Warfare's secondary uses one space dock in the home system (99.3); another card, a dock of its system.
    // Units entered on Construction (which a law may allow) are limited by the Production of their system, as a tactical action's.
    const source = !primary && entry.card === CARD.warfare ? 'homeDock' : entry.card === CARD.construction ? 'system' : 'card';
    const { systemId, units, ground } = effects.production;
    warnings.push(...checkProduction(game, state, systemId, units, pack, ground, source, 'card', entry));
    placeProduction(game, state, effects.production.systemId, effects.production.units, pack, effects.production.ground);
    warnings.push(...checkSystem(game, state, effects.production.systemId, pack));
  }
}
