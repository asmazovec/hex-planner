/**
 * Distant Suns (Naaz-Rokha Alliance): "When you explore a planet that contains 1 of your mechs: You may draw 1
 * additional card; choose 1 to resolve and discard the rest."
 *
 * A hint. Exploration is not planned (no entry explores and the exploration decks are not counted), so there is
 * nothing to check; the reminder has no step of its own.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'ability:distant_suns';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
