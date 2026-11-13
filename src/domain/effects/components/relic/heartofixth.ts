/**
 * Heart of Ixth (relic, Thunder's Edge): "After any die is rolled, you may exhaust this card to add or subtract 1 from
 * its result."
 *
 * A hint: the plan rolls no dice. Combat, Space Cannon and Bombardment are fought at the table and only their losses
 * are entered, so nothing here is counted or checked; the text stands in the block of the battle.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'relic:heartofixth';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['combat'] };
