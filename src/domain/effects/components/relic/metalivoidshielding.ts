/**
 * Metali Void Shielding (relic, Thunder's Edge): "Each time hits are produced against 1 or more of your non-fighter
 * ships, 1 of those ships may use SUSTAIN DAMAGE as if it had that ability."
 *
 * A hint: Sustain Damage decides which hits destroy a ship (87), and the plan does not assign hits; the player enters
 * the ships lost in the battle as they fell. The text stands in the block of the battle.
 */
import type { ComponentEffect } from '../../types';

export const id = 'relic:metalivoidshielding';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat'] };
