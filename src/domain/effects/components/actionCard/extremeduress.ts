/**
 * Extreme Duress (action card, Thunder's Edge): "At the start of another player's turn, if they have a readied
 * strategy card: If that player's next action is not a strategic action, they discard all of their action cards, give
 * you all of their trade goods, and show you all of their secret objectives."
 *
 * A hint: the text is shown in the block of its step (its window names no step of the plan, so it has no block), and
 * nothing is counted or lifted. Whether it does anything depends on another player's next action, a choice the plan
 * does not make for them; the trade goods received are entered by hand.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:extremeduress';

export const ability: Ability = { holder: 'others', tier: 'hint', rule: id };
