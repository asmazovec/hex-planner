/**
 * Trrakan Aun Zulok (Argent Flight, commander): "When 1 or more of your units make a roll for a unit ability: You may
 * choose 1 of those units to roll 1 additional die."
 *
 * A hint: one more die for a unit ability, as Strike Wing Ambuscade; the plan rolls no dice.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:argentcommander';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['combat', 'invasion'] };
