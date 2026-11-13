/**
 * Bunker (action card; "At the start of an invasion"): "During this invasion, apply -4 to the result of each
 * BOMBARDMENT roll against planets you control."
 *
 * A hint in the invasion block (the step the data gives its window): it changes dice, and the plan rolls none. What
 * Bombardment destroys is entered by hand as losses, so there is nothing of the card to count or to check.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'actionCard:bunker';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
