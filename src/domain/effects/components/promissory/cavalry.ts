/**
 * The Cavalry (Nomad, promissory note): "At the start of a space combat against a player other than the Nomad: During
 * this combat, treat 1 of your non-fighter ships as if it has the SUSTAIN DAMAGE ability, combat value, and
 * ANTI-FIGHTER BARRAGE value of the Nomad's flagship. Return this card to the Nomad player at the end of the combat."
 *
 * A hint at the combat step: it changes combat values only, and the plan does not play out combat.
 */
import type { ComponentEffect } from '../../types';

export const id = 'promissory:cavalry';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat'] };
