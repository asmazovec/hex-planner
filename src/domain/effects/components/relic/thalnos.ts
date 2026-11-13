/**
 * The Crown of Thalnos (relic): "During each combat round, this card's owner may reroll any number of their dice,
 * applying +1 to the results, any units that reroll dice but do not produce at least 1 hit are destroyed."
 *
 * A hint at the combat step: the plan rolls no dice; the units lost are entered as losses.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'relic:thalnos';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['combat'] };
