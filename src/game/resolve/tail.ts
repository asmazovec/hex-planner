/**
 * What follows the action of a turn (LRR 89 onward): the components it uses are played, what a played component costs is
 * paid, the components it names run their effects (hooks), what it gains and spends is held, the limits of the hand and
 * of the secret objectives are asked. The rules are events on the board; the components' own effects are the hooks.
 */
import { entryLimitsOf } from '../../domain/replay/afterEntry';
import { effectOf } from '../../domain/effects/registry';
import { playedCost } from '../../domain/effects/playedCost';
import { holderIn } from '../abilities/registry';
import { warn, type Ctx } from './context';
import { applyGains, playUses } from './holdings';
import { gainHooks } from './entryHooks';
import { playHooks } from './play';
import { checkedPay, shortOf } from './payment';

/** The cost of what a component entry plays, with what it names in `uses`: paid with the entry's `payment`. */
function payPlayedCost(ctx: Ctx): void {
  const cost = playedCost(ctx.pack, ctx.entry, effectOf);
  if (!cost || ctx.entry.type !== 'component') return;
  const paid = checkedPay(ctx, ctx.entry.payment ?? { planets: [], tradeGoods: 0 }, cost.kind, 'component');
  shortOf(ctx, cost.kind, cost.amount, paid, 'component');
}

export function turnTail(ctx: Ctx): void {
  playUses(ctx);
  payPlayedCost(ctx);
  playHooks(ctx);
  applyGains(ctx);
  gainHooks(ctx);
  const faction = ctx.table.players.find(p => p.id === ctx.player)?.faction ?? '';
  warn(ctx, entryLimitsOf(holderIn(ctx.table, ctx.board, ctx.player), faction, ctx.entry, ctx.pack));
}
