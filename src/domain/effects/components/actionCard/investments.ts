/**
 * Manipulate Investments (action card, Prophecy of Kings): "At the start of the strategy phase: Place a total of 5
 * trade goods from the supply on strategy cards of your choice. You must place these tokens on at least 3 different
 * cards."
 *
 * A hint: the text is shown in the block of its step (its window names no step of the plan, so it has no block), and
 * nothing is counted or lifted. The plan keeps no trade goods on strategy cards: the choice of cards is not replayed,
 * so what lies on a card and who picks it up is not counted. The strategy phase has no step, so the reminder has no
 * block.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:investments';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
