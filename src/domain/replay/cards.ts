/** Strategy cards: who may resolve which side of which card, its token, payment and distribution; each card's own effects are its handler's. */
import { violation } from '../rules/registry';
import { cardCost, cardsHeld, costsStrategyToken, freeTokens, heldCards, type CardEntry } from '../strategy';
import type { DataPack, Game, GameState, Round, Warning } from '../types';
import { handlerOf, type CardRound } from './cards/index';
import { pay, readyPlanets } from './payment';
import { placeProduction } from './production';
import { addUpgrades } from './state';
import { checkPoolChange, checkTokensGiven } from './status';
import { checkSystem } from './transport';

/** A round's cards before its entries: only my own cards are planned; `states` holds every player's state by id (`me` and the opponents). */
export const cardRound = (round: Round, playerCount: number, states: Record<string, GameState>): CardRound =>
  ({ held: { me: heldCards(round, playerCount) }, primaries: {}, secondaries: {}, freeSecondary: {}, states });

/**
 * Who may resolve this side of the card (83.3, 83.4, 83.7, 82.1, 92.4.2), and whether it spends a strategy token.
 * A primary is the holder's: one of a card not held costs a token and is warned about. A secondary is the other
 * players', once a round. With no card of the round chosen, the entry's own `forToken` stands for the round.
 */
function checkPlay(game: Game, entry: CardEntry, round: CardRound, player: string, warnings: Warning[]): boolean {
  const card = entry.card;
  // No card chosen yet is no play of anything.
  if (card === undefined) return costsStrategyToken(entry);
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
    return costsStrategyToken(entry, { held });
  }
  const secondaries = (round.secondaries[player] ??= []);
  const repeated = secondaries.includes(card);
  secondaries.push(card);
  if (held.includes(card)) warnings.push(violation('ownSecondary', {}));
  if (repeated) warnings.push(violation('secondaryRepeated', {}));
  return costsStrategyToken(entry, { free: !repeated && (round.freeSecondary[card] ?? []).includes(player) });
}

/** Applies what a strategy card can track; everything else about it is shown only. */
export function applyCard(game: Game, state: GameState, entry: CardEntry, pack: DataPack, round: CardRound, warnings: Warning[]): void {
  const primary = entry.type === 'strategic';
  // An entry of an opponent no longer in the game is replayed as mine.
  const player = entry.owner && entry.owner in round.states ? entry.owner : 'me';
  if (checkPlay(game, entry, round, player, warnings)) {
    if (state.strategy < 1) warnings.push(violation('shortStrategy', { have: state.strategy }));
    state.strategy -= 1;
  }
  const effects = entry.effects ?? {};
  const cost = cardCost(entry, game.faction, state.upgrades, pack);
  const paid = pay(state, effects.payment ?? { planets: [], tradeGoods: 0 }, cost.kind, pack, warnings);
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
  // The card's own effects see the upgrades owned before this entry.
  handlerOf(entry.card).apply?.({ game, state, entry, pack, round, player, primary, warnings });
  addUpgrades(state, entry.upgrades);
  warnings.push(...checkPoolChange(game, state, pack, effects.tokens, 'card'));
  // TODO(P2-026) #ws:structures #type:check #rule:24.2 #rule:24.3 #rule:24-note-1 #rule:24-note-2 #rule:63.3 #rule:79.3 #rule:85.4 #rule:85.5 #rule:85.6 #test:024-construction #test:063-pds #test:079-space-dock #test:085-structures #size:m #construction #limits — Строения ставятся без проверок: 1 база и 2 PDS на планету, не больше двух на основное и одно на второстепенное Construction, только своя планета и планета системы второстепенного; второй док молча теряется
  for (const { kind, planetId } of effects.structures ?? []) {
    if (kind === 'pds') state.pds[planetId] = (state.pds[planetId] ?? 0) + 1;
    else if (!state.docks.includes(planetId)) state.docks.push(planetId);
  }
  // TODO(P2-030) #ws:production #type:check #rule:99.3 #test:099-warfare #size:s #warfare #card-production — Производство карты (второстепенное Warfare) не проверяет домашнюю систему, базу и её Production
  if (effects.production) {
    placeProduction(game, state, effects.production.systemId, effects.production.units, pack, effects.production.ground);
    warnings.push(...checkSystem(game, state, effects.production.systemId, pack));
  }
}
