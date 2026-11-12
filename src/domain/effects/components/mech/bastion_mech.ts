/**
 * A3 Valiance (Last Bastion, mech): "When this unit is destroyed, if it was galvanized, galvanize up to 3 of your
 * infantry in its system."
 *
 * A hint: it triggers on a unit destroyed (in combat, entered by hand as a loss) and gives galvanize tokens, which only
 * add dice. Nothing the plan counts changes. The mech's printed numbers (cost 2, combat 6, Sustain Damage) come from
 * the pack, not from this file.
 */
import type { ComponentEffect } from '../../types';

export const id = 'mech:bastion_mech';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat', 'invasion'] };
