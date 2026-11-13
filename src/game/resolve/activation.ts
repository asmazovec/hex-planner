/** Step 89.1 Activation: a command token from the tactic pool goes to the active system; whatever answers the activation follows. */
import { violation } from '../../domain/rules/registry';
import { poolsOf, tokensOnMap } from '../queries';
import { begin, emit, warn, type Ctx } from './context';
import { hook } from './hooks';
import { playNamed } from './legacyEffects';
import { planetsIn } from '../space';

export function activation(ctx: Ctx, target: string): void {
  begin(ctx, 'activation');
  if (!ctx.tactical.free) {
    // The system already holds my token (5.2), or the tactic pool is empty (20.4).
    if (tokensOnMap(ctx.board, ctx.player).includes(target)) warn(ctx, violation('systemHasToken', { systemId: target }));
    const tactic = poolsOf(ctx.board, ctx.player).tactic;
    if (tactic < 1) warn(ctx, violation('poolNegative', { pool: 'tactic', have: tactic - 1 }, 'activation'));
    emit(ctx, [
      { type: 'TokensChanged', player: ctx.player, delta: { tactic: -1 } },
      { type: 'SystemActivated', player: ctx.player, system: target },
    ], { quiet: true });
  }
  // Whatever answers the activation: every player's components in force, then those the entry names for it.
  hook(ctx, 'onActivate', ctx.table.players.map(p => p.id), { activator: ctx.player, systemId: target, planets: planetsIn(ctx.table, ctx.board, ctx.pack, target) });
  playNamed(ctx, 'activation');
}
