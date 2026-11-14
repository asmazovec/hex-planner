/** The actions that are not tactical or a card: a component's action, a pass, the status phase, the agenda and a correction. */
import { checkProduction, costOf, producerList } from '../../domain/replay/production';
import { checkSystemOf } from '../../domain/replay/transport';
import { stacksOn } from '../queries';
import type { Entry } from '../../domain/types';
import { begin, checkView, emit, warn, type Ctx } from './context';
import { correction } from './correction';
import { playComponent } from './holdings';
import { checkedPay, shortOf } from './payment';
import { place } from './production';
import { statusAction as status } from './status';

type Of<T extends Entry['type']> = Extract<Entry, { type: T }>;

/** What a component action builds: checked as one of a tactical action in its system, placed, paid for with `effects.payment`, its system checked for what it holds. */
function componentProduction(ctx: Ctx, entry: Of<'component'>): void {
  const made = entry.effects?.production;
  if (!made || Object.values(made.units).every(n => !n)) return;
  let v = checkView(ctx);
  warn(ctx, checkProduction(v.game, v.state, made.systemId, made.units, ctx.pack, made.ground, 'system', undefined, entry));
  const producing = producerList(v.game, v.state, made.systemId, ctx.pack).length > 0;
  place(ctx, made.systemId, made.units, made.ground);
  v = checkView(ctx);
  const cost = costOf(v.game, v.state, made.units, ctx.pack, producing, entry);
  shortOf(ctx, 'resources', cost, checkedPay(ctx, entry.effects?.payment ?? { planets: [], tradeGoods: 0 }, 'resources'));
  warn(ctx, checkSystemOf(stacksOn(ctx.table, ctx.board, ctx.pack, ctx.player), made.systemId));
}

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
