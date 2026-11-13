/**
 * Ember Colossus (Embers of Muaat, mech): "When you use your Star Forge faction ability in this system or an adjacent
 * system, you may place 1 infantry from your reinforcements with this unit."
 *
 * Decided: applied by the play of Star Forge (`ability/star_forge.ts`): each of my mechs in the system Star Forge
 * places in, or in a system adjacent to it, gets one infantry placed with it. The mech itself stays a hint: nothing is
 * counted when Star Forge is not used. Pass 1: still the hint it is today.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'mech:muaat_mech';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id };
