/**
 * Ahk Siever (Crimson Rebellion, commander): "At the end of a combat between any players: Gain 1 commodity or convert 1
 * of your commodities to a trade good."
 *
 * Decided: a reminder of combat. The combats of any players are not simulated, and their end is not an entry of the
 * plan; the commodity or trade good gained is entered by hand.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:crimsoncommander';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat'] };
