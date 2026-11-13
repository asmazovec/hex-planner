/**
 * The checks of a round's flow, over the turns of the round: a turn outside the action phase (LRR 40.2), a turn after the
 * player passed (3.3; secondaries stay allowed, 3.3.2), a pass before the primary of each card the player holds (3.4, 82.2).
 * A rival's cards are not planned, so only the viewer's passes are checked against cards.
 */
import { isTurn } from '../../domain/replay/round';
import { violation } from '../../domain/rules/registry';
import type { Warning } from '../../domain/types';
import type { Ctx } from './context';

export function checkFlow(ctx: Ctx): Warning[] {
  const { track, player, entry } = ctx;
  if (!isTurn(entry, ctx.pack)) return [];
  if (entry.phase !== 'action') return [violation('actionOutsidePhase', {})];
  if (track.passed.includes(player)) return entry.type === 'pass' ? [] : [violation('actionAfterPass', {})];
  if (entry.type !== 'pass') return [];
  track.passed.push(player);
  if (player !== ctx.table.viewer) return [];
  const unplayed = (track.held[player] ?? []).filter(card => !(track.primaries[player] ?? []).includes(card));
  return unplayed.length > 0 ? [violation('passBeforeStrategy', { cards: unplayed.length })] : [];
}
