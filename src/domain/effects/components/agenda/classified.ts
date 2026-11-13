/**
 * Classified Document Leaks (agenda): "The elected secret objective becomes a public objective - place it near the
 * other public objectives in the common play area."
 *
 * A hint: it changes who may score an objective, and the plan does not check which objectives a player may score;
 * the points scored are entered by the player.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'agenda:classified';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
