/**
 * Terragenesis (Titans of Ul): "After you explore a planet that does not have a sleeper token: You may place or move
 * 1 sleeper token onto that planet."
 *
 * Decided: hint. The plan counts neither exploration nor sleeper tokens; the reminder stands where a planet is gained,
 * in the invasion.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'ability:terragenesis';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['invasion'] };
