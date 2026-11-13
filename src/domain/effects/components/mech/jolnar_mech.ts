/**
 * Shield Paling (Universities of Jol-Nar, mech): "Your infantry on this planet are not affected by your Fragile faction
 * ability."
 *
 * A hint in the block of the invasion. Fragile changes combat rolls, which the plan does not make, so lifting it for
 * some infantry changes nothing the plan counts. (A `hintAt` on a mech is kept by the registry but not shown yet: a
 * known limit of the foundation.)
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'mech:jolnar_mech';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['invasion'] };
