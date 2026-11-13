/** The actions that are not tactical or a card: a component's action, a pass, the status phase, the agenda and a correction. */
import { applyComponent, applyScored } from '../../domain/replay/holdings';
import { applyComponentProduction } from '../../domain/replay/production';
import { applyAdjustment } from '../../domain/replay/state';
import { applyStatusTokens, checkObjectives } from '../../domain/replay/status';
import type { Entry } from '../../domain/types';
import { begin, emit, type Ctx } from './context';
import { viaLegacy } from './legacyEffects';

type Of<T extends Entry['type']> = Extract<Entry, { type: T }>;

/** A component's action: the component is played (held, exhausted, removed), and what it produces is built. */
export function componentAction(ctx: Ctx): void {
  begin(ctx, 'component');
  viaLegacy(ctx, r => {
    const entry = r.entry as Of<'component'>;
    applyComponent(r.state, entry, ctx.pack, r.warnings, r.game.faction, r.states);
    applyComponentProduction(r.game, r.state, entry, ctx.pack, r.warnings);
  });
}

export function passAction(ctx: Ctx): void {
  begin(ctx, 'round');
  emit(ctx, [{ type: 'Passed', player: ctx.player, cause: { turn: ctx.turn.id, step: 'round' } }], { quiet: true });
}

/** The status phase: the objectives are asked against the board before the entry (81.1), then the tokens and the scoring. */
export function statusAction(ctx: Ctx): void {
  begin(ctx, 'status');
  viaLegacy(ctx, r => {
    const entry = r.entry as Of<'statusTokens'>;
    checkObjectives(r.game, r.state, r.shared, entry, ctx.pack, r.warnings);
    applyStatusTokens(r.game, r.state, entry, ctx.pack, r.warnings, r.shared);
    applyScored(r.state, r.shared, entry.scored, ctx.pack);
  });
}

/** An agenda card and a correction both come as the numbers they change. */
export function correctionAction(ctx: Ctx): void {
  begin(ctx, ctx.turn.action.kind === 'agenda' ? 'round' : 'component');
  viaLegacy(ctx, r => applyAdjustment(r.state, r.entry as Of<'adjustment'>, r.warnings));
}
