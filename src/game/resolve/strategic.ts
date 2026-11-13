/**
 * A strategy card played, its primary in the turn of its holder and its secondary in anyone's (LRR 83). The steps every
 * card has are `cards/play.ts`, each card's own rule is `cards/<card>.ts`; what this does is mark the card played.
 */
import type { Secondary, Strategic } from '../actions';
import type { GameEvent } from '../events';
import { playCard } from './cards/play';
import { begin, emit, type Ctx } from './context';

export function cardAction(ctx: Ctx, action: Strategic | Secondary): void {
  begin(ctx, 'card');
  playCard(ctx);
  const held = ctx.board.players[ctx.player]?.strategy.some(s => s.card === action.card) ?? false;
  if (action.kind === 'strategic' && action.card !== undefined && held) {
    const played: GameEvent = { type: 'StrategyCardPlayed', player: ctx.player, card: action.card, cause: { turn: ctx.turn.id, step: 'card' } };
    emit(ctx, [played], { quiet: true });
  }
}
