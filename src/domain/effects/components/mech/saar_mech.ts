/**
 * Scavenger Zeta (Clan of Saar, mech): "DEPLOY: After you gain control of a planet, you may spend 1 trade good to place
 * 1 mech on that planet"
 *
 * Today a hint of the invasion. The deploy changes what the plan counts (a mech from reinforcements on the planet, one
 * trade good spent), but an entry has no field for a deploy yet, so it is not replayed (see the test.todo of its test).
 */
import type { ComponentEffect } from '../../types';

export const id = 'mech:saar_mech';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['invasion'] };
