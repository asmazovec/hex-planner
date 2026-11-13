/**
 * Dunlain Reaper (Barony of Letnev, mech): "DEPLOY: At the start of a round of ground combat, you may spend 2 resources
 * to replace 1 of your infantry in that combat with 1 mech."
 *
 * Today a hint of the invasion. What it does changes the board and the resources (an infantry becomes a mech, two
 * resources are paid), which the plan counts; but it happens inside a round of ground combat and an entry has no
 * field for a deploy yet, so it is not replayed (see the test.todo of its test).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'mech:letnev_mech';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['invasion'] };
