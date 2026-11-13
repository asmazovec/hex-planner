/**
 * Diplomacy (LRR 32): the primary picks a system with a planet of mine, other than Mecatol Rex, where every other player
 * puts a token from reinforcements; both sides ready up to two of my exhausted planets, the base primary every one of
 * mine in that system.
 */
import { MECATOL_PLANETS } from '../../../domain/mecatol';
import { systemPlanets } from '../../../domain/replay/board';
import { readyLimit } from '../../../domain/replay/cards/diplomacy';
import { violation } from '../../../domain/rules/registry';
import { ownerOf } from '../../queries';
import { checkView, emit, warn } from '../context';
import type { CardRule } from './rule';

export const diplomacy: CardRule = {
  apply: ({ ctx, effects, entry, primary }) => {
    const limit = readyLimit(entry, ctx.table.expansions);
    const readied = effects.readied?.length ?? 0;
    if (limit !== null && readied > limit) warn(ctx, violation('readyOverLimit', { limit, readied }));
    const systemId = effects.systemId;
    if (!primary || !systemId) return;
    const planets = systemPlanets(checkView(ctx).game, systemId, ctx.pack);
    if (planets.some(p => MECATOL_PLANETS.includes(p.id)) || !planets.some(p => ownerOf(ctx.board, p.id) === ctx.player)) {
      warn(ctx, violation('diplomacySystem', { systemId }));
    }
    // The other players' tokens come from reinforcements, not their pools; one who already has a token there places none.
    emit(ctx, ctx.table.players.filter(p => p.id !== ctx.player && !ctx.board.systems[systemId]?.tokens.includes(p.id))
      .map(p => ({ type: 'SystemActivated' as const, player: p.id, system: systemId })), { quiet: true });
  },
};
