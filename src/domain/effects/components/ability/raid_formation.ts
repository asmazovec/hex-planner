/**
 * Raid Formation (Argent Flight): "When 1 or more of your units uses ANTI-FIGHTER BARRAGE: for each hit produced in
 * excess of your opponent's fighters, choose 1 of your opponent's ships that has SUSTAIN DAMAGE to become damaged."
 *
 * A hint: hits and damaged ships come from dice the plan does not roll. The reminder stands in the block of the battle.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:raid_formation';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat'] };
