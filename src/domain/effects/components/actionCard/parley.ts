/**
 * Parley (action card, After another player commits units to land on a planet you control): "Return the committed
 * units to the space area."
 *
 * A hint at the invasion step: it undoes another player's commitment to land; that player's entry is entered with the
 * landing it ends with, so nothing is counted here.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:parley';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
