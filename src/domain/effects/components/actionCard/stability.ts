/**
 * Political Stability (action card, When you would return your strategy card(s) during the status phase): "Do not
 * return your strategy card(s). You do not choose strategy cards during the next strategy phase."
 *
 * A hint at the status step: no check of the plan asks which strategy card a player has in the next round, so keeping
 * the cards breaks nothing to lift.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:stability';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
