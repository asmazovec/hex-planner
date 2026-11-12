/**
 * Metali Void Armaments (relic, Thunder's Edge): "During the "Anti-Fighter Barrage" step of space combat, you may
 * resolve ANTI-FIGHTER BARRAGE 6 (x3) against your opponent's units."
 *
 * A hint: Anti-Fighter Barrage is a roll of dice in space combat (9, 78.3); the plan rolls none and enters only the
 * losses. The text stands in the block of the battle.
 */
import type { ComponentEffect } from '../../types';

export const id = 'relic:metalivoidarmaments';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat'] };
