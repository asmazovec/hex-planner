/**
 * Spy (action card, Action): "Choose 1 player. That player gives you 1 random action card from their hand."
 *
 * A hint: the card taken is random and another player's hand is not known to the plan; the card received is entered
 * as a gain. Playing Spy itself discards it as any component action does.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:spy';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
