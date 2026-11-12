/**
 * Aerie Hololattice (Argent Flight technology): "Other players cannot move ships through systems that contain your
 * structures. Each planet that contains 1 or more of your structures gains the PRODUCTION 1 ability as if it were a
 * unit."
 *
 * Pass 1: a hint as it is today. Pass 2 makes it passive with a change of the count: a planet of mine with a structure
 * is a producer of value 1 (a planet with a PDS and no space dock produces; its ground forces may be placed on it,
 * Argent note 1). Its first sentence is a check on the other players: their routes through a system with my structures
 * are blocked (`routeBlocked`), Light/Wave Deflector or not (note 2).
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:ah';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
