/**
 * Aerie Hololattice (Argent Flight technology): "Other players cannot move ships through systems that contain your
 * structures. Each planet that contains 1 or more of your structures gains the PRODUCTION 1 ability as if it were a
 * unit."
 *
 * Passive, with two parts. A planet of mine with a structure is a producer of value 1 (a planet with a PDS and no space
 * dock produces; its ground forces may be placed on it, Argent note 1). The first sentence is a check on the other
 * players: a system with one of my structures bars their routes (`stopsPassage`), like a system with other players'
 * ships, so `routeBlocked` is warned of in their entry. A Light/Wave Deflector lifts the ships' bar only, not this one
 * (note 2).
 */
import { planetsOf, systemSlots } from '../../../replay/board';
import '../../points/production';
import '../../points/rivals';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:ah';

export const ability: Ability = {
  tier: 'passive',
  rule: id,
  // A planet with one of my structures produces as a unit of PRODUCTION 1.
  modify: { planetProduction: (value, ctx) => (ctx.structures.pds || ctx.structures.spacedock ? Math.max(value, 1) : value) },
  // The systems where a planet of mine has a space dock or a PDS.
  stopsPassage: ({ game, pack, state }) => systemSlots(game).filter(slot =>
    planetsOf(game, slot, pack).some(planet => state.docks.includes(planet) || (state.pds[planet] ?? 0) > 0)),
  holder: 'self',
};
