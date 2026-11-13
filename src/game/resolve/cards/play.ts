/**
 * A strategy card played (LRR 83): who may resolve which side and whether it spends a token, the token, the payment, the
 * tokens it gives, the planets it readies, the card's own effects, the research it lists, the structures and units it
 * builds. Every step reads the board through queries and applies its events; the card's own rule is `cards/<card>.ts`.
 */
import { holderOf } from '../../../domain/effects/registry';
import { checkProduction } from '../../../domain/replay/production';
import { researchTokensGiven } from '../../../domain/replay/research';
import { checkPoolChange, checkTokensGiven } from '../../../domain/replay/status';
import { checkSystem } from '../../../domain/replay/transport';
import { violation } from '../../../domain/rules/registry';
import { CARD, cardCost, cardsHeld, freeTokens, strategyTokensOwed, type CardEntry } from '../../../domain/strategy';
import { checkStationStructures } from '../../../domain/thundersEdge';
import { componentById } from '../../../domain/components';
import type { Delta } from '../../events';
import { checkView, emit, warn, type Ctx } from '../context';
import { checkedPay, shortOf } from '../payment';
import { place } from '../production';
import { tokenSpent } from '../legacyEffects';
import { buildStructures } from '../structures';
import { ruleOf } from './index';

/**
 * Who may resolve this side of the card (83.3, 83.4, 83.7, 82.1, 92.4.2), and whether it spends a strategy token.
 * A primary is the holder's: one of a card not held costs a token and is warned about. A secondary is the other
 * players', once a round. With no card of the round chosen, the entry's own `forToken` stands for the round.
 */
function checkPlay(ctx: Ctx, entry: CardEntry): { held?: number[]; free?: boolean } {
  const card = entry.card;
  if (card === undefined) return {};
  const { track, player } = ctx;
  const held = track.held[player] ?? [];
  if (entry.type === 'strategic') {
    const primaries = (track.primaries[player] ??= []);
    if (held.length > 0 && !held.includes(card)) warn(ctx, violation('foreignPrimary', {}));
    else if (held.length > 0 || !entry.forToken) {
      const repeated = primaries.includes(card);
      primaries.push(card);
      const limit = held.length > 0 ? held.length : cardsHeld(checkView(ctx).game.playerCount);
      if (repeated || primaries.length > limit) warn(ctx, violation('primaryRepeated', { held: limit }));
    }
    return { held };
  }
  const secondaries = (track.secondaries[player] ??= []);
  const repeated = secondaries.includes(card);
  secondaries.push(card);
  if (held.includes(card)) warn(ctx, violation('ownSecondary', {}));
  if (repeated) warn(ctx, violation('secondaryRepeated', {}));
  return { free: !repeated && (track.freeSecondary[card] ?? []).includes(player) };
}

const POOLS = ['tactic', 'fleet', 'strategy'] as const;

export function playCard(ctx: Ctx): void {
  const entry = ctx.entry as CardEntry;
  const primary = entry.type === 'strategic';
  const effects = entry.effects ?? {};
  // The token the card owes: one, or what the components of the player make of it (the `strategyCost` point).
  let v = checkView(ctx);
  const owed = strategyTokensOwed(entry, checkPlay(ctx, entry), v.game, v.state, v.shared, ctx.pack);
  if (owed > 0) {
    const have = ctx.board.players[ctx.player]?.pools.strategy ?? 0;
    if (have < owed) warn(ctx, violation('shortStrategy', { have }));
    emit(ctx, [{ type: 'TokensChanged', player: ctx.player, delta: { strategy: -owed } }], { quiet: true });
    tokenSpent(ctx, owed, entry.card, !primary);
  }
  // Units a card produces use a unit's PRODUCTION: the combined cost may be reduced (Sarween Tools), as a tactical action's is.
  v = checkView(ctx);
  const cost = cardCost(entry, v.game.faction, holderOf(v.game, v.state), ctx.pack, { game: v.game, state: v.state });
  const paid = checkedPay(ctx, effects.payment ?? { planets: [], tradeGoods: 0 }, cost.kind);
  shortOf(ctx, cost.kind, cost.amount, paid);
  v = checkView(ctx);
  const given = (effects.tokens?.tactic ?? 0) + (effects.tokens?.fleet ?? 0) + (effects.tokens?.strategy ?? 0);
  const bonus = entry.card === CARD.technology ? researchTokensGiven(ctx.pack, v.game, v.state, v.shared, effects.researched) : 0;
  warn(ctx, checkTokensGiven(given, freeTokens(entry, ctx.table.expansions, v.state) + bonus, 'card'));
  for (const pool of POOLS) {
    const change = effects.tokens?.[pool] ?? 0;
    if (change === 0) continue;
    const have = ctx.board.players[ctx.player]?.pools[pool] ?? 0;
    if (change < 0 && have + change < 0) warn(ctx, violation('poolNegative', { pool, have: have + change }));
    emit(ctx, [{ type: 'TokensChanged', player: ctx.player, delta: { [pool]: change } as Delta }], { quiet: true });
  }
  readyPlanets(ctx, effects.readied ?? []);
  // The card's own effects see the technologies held before this entry.
  ruleOf(entry.card).apply?.({ ctx, entry, effects, primary });
  // The Technology card researches with every check in its rule; a play with no card chosen only adds what it lists.
  if (entry.card !== CARD.technology) {
    emit(ctx, (effects.researched ?? []).filter(id => componentById(ctx.pack, id)?.kind === 'technology')
      .map(technology => ({ type: 'TechnologyResearched' as const, player: ctx.player, technology })), { quiet: true });
  }
  v = checkView(ctx);
  warn(ctx, checkPoolChange(v.game, v.state, ctx.pack, effects.tokens, 'card', v.shared));
  buildStructures(ctx, effects.structures ?? [], primary, effects.systemId);
  warn(ctx, checkStationStructures(effects.structures ?? [], ctx.pack));
  if (effects.production) {
    // Warfare's secondary uses one space dock in the home system (99.3); another card, a dock of its system.
    // Units entered on Construction (which a law may allow) are limited by the Production of their system, as a tactical action's.
    const source = !primary && entry.card === CARD.warfare ? 'homeDock' : entry.card === CARD.construction ? 'system' : 'card';
    const { systemId, units, ground } = effects.production;
    v = checkView(ctx);
    warn(ctx, checkProduction(v.game, v.state, systemId, units, ctx.pack, ground, source, 'card', entry));
    place(ctx, systemId, units, ground);
    v = checkView(ctx);
    warn(ctx, checkSystem(v.game, v.state, systemId, ctx.pack));
  }
}

/** Planets readied: one not mine is warned of; one of mine that was exhausted is ready again. */
function readyPlanets(ctx: Ctx, planets: string[]): void {
  for (const planetId of planets) {
    if (ctx.board.planets[planetId]?.owner !== ctx.player) warn(ctx, violation('readyNotControlled', { planetId }, 'card'));
  }
  emit(ctx, planets.filter(id => ctx.board.planets[id]?.owner === ctx.player && ctx.board.planets[id].exhausted)
    .map(planet => ({ type: 'PlanetReadied' as const, player: ctx.player, planet })), { quiet: true });
}
