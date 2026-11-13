/**
 * Spatial Conduit Cylinder (Universities of Jol-Nar, faction technology): "You may exhaust this card after you activate
 * a system that contains 1 or more of your units; that system is adjacent to all other systems that contain 1 or more
 * of your units during this activation."
 *
 * A hint in the block of the movement. The plan already takes two marked systems that are not joined as a jump of one
 * step and checks nothing between them (src/domain/movement.ts), so a ship flying straight from a system of mine into
 * the active system is never warned of: there is no check to lift. Exhausting the card is entered in the `uses` of the
 * entry, which the replay plays for any component. A gravity rift left on the way still counts (tirules2, Jol-Nar,
 * Spatial Conduit Cylinder 2), as it does for every route.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:scc';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['movement'] };
