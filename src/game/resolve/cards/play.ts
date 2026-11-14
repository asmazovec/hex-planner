/**
 * A strategy card played (LRR 83): who may resolve which side and whether it spends a token, the token, the payment, the
 * tokens it gives, the planets it readies, the card's own effects, the research it lists, the structures and units it
 * builds. Every step reads the board through queries and applies its events; the card's own rule is `cards/<card>.ts`.
 */
import { checkProductionOn, productionDueOn } from '../../../domain/replay/production';
import { checkTokensGiven } from '../../../domain/replay/status';
import { checkSystemOf } from '../../../domain/replay/transport';
import { appliedOn, holderIn } from '../../abilities/registry';
import { groundIn, poolChangeWarnings, stacksOn, tokensOnMapOf } from '../../queries';
import { violation } from '../../../domain/rules/registry';
import { CARD, cardCostOf, cardsHeld, freeTokens, strategyTokensOwedOf, type CardEntry } from '../../../domain/strategy';
import { checkStationStructures } from '../../../domain/thundersEdge';
import { componentById } from '../../../domain/components';
import type { Delta } from '../../events';
import { emit, warn, type Ctx } from '../context';
import { checkedPay, shortOf } from '../payment';
import { place } from '../production';
import { hook } from '../hooks';
import { noteAddress, noteBase } from '../../../domain/components';
import { legacyKey } from '../../keys';
import { ACQUIESCENCE } from '../natives';
import { playerCountOf } from '../../space';
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
      const limit = held.length > 0 ? held.length : cardsHeld(playerCountOf(ctx.table));
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

/** The secondary names a held note of Acquiescence that is another player's (69.2: its owner cannot play it). */
function acquiesced(ctx: Ctx, entry: CardEntry): boolean {
  const mine = legacyKey(ctx.table, ctx.player);
  return (entry.uses ?? []).some(used => noteBase(used) === ACQUIESCENCE && noteAddress(used) !== mine && ctx.board.players[ctx.player]?.cards[used] !== undefined);
}

const POOLS = ['tactic', 'fleet', 'strategy'] as const;

export function playCard(ctx: Ctx): void {
  const entry = ctx.entry as CardEntry;
  const primary = entry.type === 'strategic';
  const effects = entry.effects ?? {};
  // The token the card owes: one, or what the components of the player make of it (the `strategyCost` point).
  const owed = strategyTokensOwedOf(entry, checkPlay(ctx, entry), holderIn(ctx.table, ctx.board, ctx.player), ctx.pack);
  if (owed > 0) {
    const have = ctx.board.players[ctx.player]?.pools.strategy ?? 0;
    if (have < owed) warn(ctx, violation('shortStrategy', { have }));
    // Acquiescence: "You do not have to spend or place a command token to resolve the secondary ability of that strategy card".
    // The check above still counts the token; the note is why none is spent.
    if (primary || !acquiesced(ctx, entry)) {
      emit(ctx, [{ type: 'TokensChanged', player: ctx.player, delta: { strategy: -owed } }], { quiet: true });
      hook(ctx, 'onTokenSpent', [ctx.player], { count: owed, ...(entry.card === undefined ? {} : { card: entry.card }), secondary: !primary });
    }
  }
  // Units a card produces use a unit's PRODUCTION: the combined cost may be reduced (Sarween Tools), as a tactical action's is.
  const faction = ctx.table.players.find(p => p.id === ctx.player)?.faction ?? '';
  const ground = groundIn(ctx.table, ctx.board, ctx.pack, ctx.player);
  const cost = cardCostOf(entry, faction, ground.holder, ctx.pack, units => productionDueOn(ground, units, ctx.pack, entry));
  const paid = checkedPay(ctx, effects.payment ?? { planets: [], tradeGoods: 0 }, cost.kind);
  shortOf(ctx, cost.kind, cost.amount, paid);
  const given = (effects.tokens?.tactic ?? 0) + (effects.tokens?.fleet ?? 0) + (effects.tokens?.strategy ?? 0);
  const bonus = entry.card === CARD.technology ? (effects.researched ?? []).filter(id => componentById(ctx.pack, id)?.kind === 'technology')
    .reduce((sum, id) => sum + appliedOn(ctx.table, ctx.board, ctx.pack, ctx.player, 'researchTokens', 0, { technology: id }).value, 0) : 0;
  warn(ctx, checkTokensGiven(given, freeTokens(entry, ctx.table.expansions, { tokensOnMap: tokensOnMapOf(ctx.board, ctx.player) }) + bonus, 'card'));
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
  warn(ctx, poolChangeWarnings(ctx.table, ctx.board, ctx.pack, ctx.player, effects.tokens, 'card'));
  buildStructures(ctx, effects.structures ?? [], primary, effects.systemId);
  warn(ctx, checkStationStructures(effects.structures ?? [], ctx.pack));
  if (effects.production) {
    // Warfare's secondary uses one space dock in the home system (99.3); another card, a dock of its system.
    // Units entered on Construction (which a law may allow) are limited by the Production of their system, as a tactical action's.
    const source = !primary && entry.card === CARD.warfare ? 'homeDock' : entry.card === CARD.construction ? 'system' : 'card';
    const { systemId, units, ground } = effects.production;
    warn(ctx, checkProductionOn(groundIn(ctx.table, ctx.board, ctx.pack, ctx.player), systemId, units, ctx.pack, ground, source, 'card', entry));
    place(ctx, systemId, units, ground);
    warn(ctx, checkSystemOf(stacksOn(ctx.table, ctx.board, ctx.pack, ctx.player), systemId));
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
