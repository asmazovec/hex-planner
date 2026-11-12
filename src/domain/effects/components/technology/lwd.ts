/**
 * Light/Wave Deflector: "Your ships can move through systems that contain other players' ships."
 *
 * Pass 2 makes it a `passive` waiver of `routeBlocked` (58.3.2), narrowed with `when` to the systems blocked only by
 * other players' ships; a nebula, an asteroid field and a supernova still block. Today a hint.
 */
import { routeBlockKind } from '../../helpers/movement';
import type { ComponentEffect } from '../../types';

export const id = 'technology:lwd';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  waive: [{
    code: 'routeBlocked',
    rule: 'Your ships can move through systems that contain other players\' ships.',
    when: (warning, ctx) => routeBlockKind(warning, ctx) === 'ships',
  }],
};
