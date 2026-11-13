/** Step 89.1 Activation: a command token from the tactic pool goes to the active system; whatever answers the activation follows. */
import { checkActivation } from '../../domain/replay/activation';
import { viewFor } from '../legacyViews';
import { begin, emit, warn, type Ctx } from './context';
import { reactActivation } from './legacyEffects';

export function activation(ctx: Ctx, target: string): void {
  begin(ctx, 'activation');
  const v = viewFor(ctx.table, ctx.board, ctx.pack, ctx.player);
  warn(ctx, checkActivation(v.state, target, ctx.entry as never));
  if (!ctx.tactical.free) {
    emit(ctx, [
      { type: 'TokensChanged', player: ctx.player, delta: { tactic: -1 } },
      { type: 'SystemActivated', player: ctx.player, system: target },
    ], { quiet: true });
  }
  reactActivation(ctx, target);
}
