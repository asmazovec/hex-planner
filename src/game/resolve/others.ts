/** The actions that are not tactical or a card: a component's action, a pass, the status phase, the agenda and a correction. */
import type { Entry } from '../../domain/types';
import { begin, emit, type Ctx } from './context';
import { correction } from './correction';
import { playComponent } from './holdings';
import { componentProduction } from './production';
import { statusAction as status } from './status';

type Of<T extends Entry['type']> = Extract<Entry, { type: T }>;

/** A component's action: the component is played (held, exhausted, removed), and what it produces is built. */
export function componentAction(ctx: Ctx): void {
  begin(ctx, 'component');
  const entry = ctx.entry as Of<'component'>;
  if (entry.componentId !== undefined) playComponent(ctx, entry.componentId, ctx.player);
  componentProduction(ctx, entry);
}

export function passAction(ctx: Ctx): void {
  begin(ctx, 'round');
  emit(ctx, [{ type: 'Passed', player: ctx.player, cause: { turn: ctx.turn.id, step: 'round' } }], { quiet: true });
}

/** The status phase: the objectives are asked against the board before the entry (81.1), then the tokens and the scoring. */
export function statusAction(ctx: Ctx): void {
  begin(ctx, 'status');
  status(ctx);
}

/** An agenda card and a correction both come as the numbers they change. */
export function correctionAction(ctx: Ctx): void {
  begin(ctx, ctx.turn.action.kind === 'agenda' ? 'round' : 'component');
  correction(ctx);
}
