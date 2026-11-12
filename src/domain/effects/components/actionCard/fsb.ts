/**
 * Forward Supply Base (action card, After another player activates a system that contains your units): "Gain 3 trade
 * goods. Then, choose another player to gain 1 trade good."
 *
 * A `play` in another player's turn (an entry of the component kind that is not a turn) with the choice `player`: I
 * gain 3 trade goods and that player 1. Pass 1 keeps it the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:fsb';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
