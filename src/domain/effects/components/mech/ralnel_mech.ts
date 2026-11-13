/**
 * Alarum (Ral Nel Consortium, mech): "At the end of a round of combat on this planet, you may move up to 2 of your
 * ground forces to this planet from planets in adjacent systems."
 *
 * Decided: a reminder of the invasion. Rounds of ground combat are not simulated, so the moment the mech speaks of is
 * not an entry of the plan.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'mech:ralnel_mech';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['invasion'] };
