/**
 * Forward Supply Base (action card, After another player activates a system that contains your units): "Gain 3 trade
 * goods. Then, choose another player to gain 1 trade good."
 *
 * A `play` in another player's turn (an entry of the component kind that is not a turn) with the choice `player`: I
 * gain 3 trade goods and that player 1. The condition (the activated system holds my units) is not asked: an entry
 * does not name the activation it answers.
 */
import { tradeGoods } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:fsb';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'player', kind: 'player' }],
  holder: 'self',
  play: ctx => {
    const other = ctx.playerOf(String(ctx.choices.player));
    return [tradeGoods(ctx.holder, 3), ...(other !== undefined && other !== ctx.holder ? [tradeGoods(other, 1)] : [])];
  },
};
