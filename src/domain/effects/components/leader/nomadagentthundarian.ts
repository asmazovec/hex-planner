/**
 * The Thundarian (Nomad, agent): "After the "Roll Dice" step of combat: You may exhaust this card. If you do, hits are
 * not assigned to either player's units. Return to the start of this combat round's "Roll Dice" step."
 *
 * A hint at the combat step: the plan rolls no dice.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:nomadagentthundarian';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat'] };
