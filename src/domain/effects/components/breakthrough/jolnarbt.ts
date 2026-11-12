/**
 * Specialist Compounds (Universities of Jol-Nar, breakthrough, Thunder's Edge): "When you research technology using the
 * 'Technology' strategy card, you may exhaust a planet that has a technology specialty instead of spending resources;
 * if you do, you must research a technology of that color."
 *
 * Decided: a passive waiver of `shortResources` on the payment of the Technology card. The warning is lifted when the
 * payment exhausts a planet with a technology specialty and every technology researched has that color; a unit upgrade
 * has none, so it is never covered (tirules2, Jol-Nar, Specialized Compounds 1, 2). The breakthrough is in force once
 * held. Its synergy ability is not in the pack's text and is not modelled.
 *
 * Pass 1: a hint, as the guide asks; the waiver is written in pass 2.
 */
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:jolnarbt';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
