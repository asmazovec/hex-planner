/**
 * Armada (Barony of Letnev): "The maximum number of non-fighter ships you can have in each system is equal to 2 more
 * than the number of tokens in your fleet pool".
 *
 * The ability does not lift the fleet pool check, it changes its number: a `modify` of the point `fleetLimit`, so the
 * warning of a sixth ship names the limit of five and nothing is listed as waived. Compare `leader/letnevhero.ts`,
 * which lifts the check itself.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'ability:armada';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  modify: { fleetLimit: value => value + 2 },
};
