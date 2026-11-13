/**
 * Coalescence (Titans of Ul): "If your flagship or your AWAKEN faction ability places your units into the same space
 * area or onto the same planet as another player's units, your units must participate in combat during "Space
 * Combat" or "Ground Combat" steps."
 *
 * Decided: hint. Combat is not simulated; the reminder stands in the battle and the invasion.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'ability:coalescence';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['combat', 'invasion'] };
