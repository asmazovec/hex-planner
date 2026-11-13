/**
 * Dart and Tai (Naaz-Rokha Alliance, commander): "After you gain control of a planet that was controlled by another
 * player: You may explore that planet."
 *
 * A hint. Exploration is not planned, so nothing is counted or checked.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'leader:naazcommander';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
