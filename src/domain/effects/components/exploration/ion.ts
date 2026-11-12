/**
 * Ion Storm (frontier exploration): "Place the ion storm token in this system with either side faceup. Then, place
 * this card in the common play area. At the end of the "Move Ships" or "Retreat" substep of a tactical action during
 * which 1 or more of your ships use the ion storm wormhole, flip the ion storm token to its opposing side."
 *
 * A hint at the movement step, for the same reason as Gamma Relay: the token is an alpha or a beta wormhole that the
 * board of the plan does not keep, and a drawn step between systems that are not joined is a jump the route never
 * warns of. The flip depends on which wormhole a ship chose (exploration cards, Ion Storm notes 2-3), which the plan
 * does not record either.
 */
import type { ComponentEffect } from '../../types';

export const id = 'exploration:ion';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['movement'] };
