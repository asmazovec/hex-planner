/**
 * A strategy card played, its primary in the turn of its holder and its secondary in anyone's (LRR 83): who may play which
 * side and what it costs, the token, the payment, the tokens it gives, the planets it readies, research with
 * prerequisites and specialties, the structures and units it builds (Construction, Warfare and their Thunder's Edge
 * variants), the speaker and Mecatol. The card's own rules live in `cards/`; the common steps are the old replay's
 * (`applyCard`), run on the board's views, until step 3 moves them over.
 */
import { applyCard } from '../../domain/replay/cards';
import type { CardEntry } from '../../domain/strategy';
import type { Secondary, Strategic } from '../actions';
import type { GameEvent } from '../events';
import { begin, emit, type Ctx } from './context';
import { viaLegacy } from './legacyEffects';
import { cardRoundOf, keepRound } from './track';

export function cardAction(ctx: Ctx, action: Strategic | Secondary): void {
  begin(ctx, 'card');
  viaLegacy(ctx, r => {
    const round = cardRoundOf(ctx.table, ctx.track, r.states);
    applyCard(r.game, r.state, r.entry as CardEntry, ctx.pack, round, r.warnings);
    keepRound(ctx.table, ctx.track, round);
  });
  const held = ctx.board.players[ctx.player]?.strategy.some(s => s.card === action.card) ?? false;
  if (action.kind === 'strategic' && action.card !== undefined && held) {
    const played: GameEvent = { type: 'StrategyCardPlayed', player: ctx.player, card: action.card, cause: { turn: ctx.turn.id, step: 'card' } };
    emit(ctx, [played], { quiet: true });
  }
}
