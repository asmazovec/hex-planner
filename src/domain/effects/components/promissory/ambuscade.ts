/**
 * Strike Wing Ambuscade (Argent Flight promissory note): "When 1 or more of your units make a roll for a unit ability:
 * Choose 1 of those units to roll 1 additional die. Then, return this card to the Argent player."
 *
 * A hint: one more die for Space Cannon, Anti-Fighter Barrage or Bombardment. The plan rolls no dice, so nothing is
 * counted; the reminder stands in the blocks of the battle in space and of the invasion.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'promissory:ambuscade';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['combat', 'invasion'] };
