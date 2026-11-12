/**
 * Forward Supply Base (action card, After another player activates a system that contains your units): "Gain 3 trade
 * goods. Then, choose another player to gain 1 trade good."
 *
 * A `play` in another player's turn (an entry of the component kind that is not a turn) with the choice `player`: I
 * gain 3 trade goods and that player 1. The condition (the activated system holds my units) is not asked: an entry
 * does not name the activation it answers.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:fsb';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'player', kind: 'player' }],
  play: turn => {
    turn.state.tradeGoods += 3;
    const other = turn.states[String(turn.choices.player)];
    if (other && other !== turn.state) other.tradeGoods += 1;
  },
};
