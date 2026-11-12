/**
 * Bioplasmosis (Arborec technology): "At the end of the status phase, you may remove any number of infantry from
 * planets you control and place them on 1 or more planets you control in the same or adjacent systems."
 *
 * A hint. The replay checks no movement of ground forces outside a tactical action, so there is nothing to lift, and the
 * status entry holds no ground forces to move: the move is entered by hand. The reminder stands in the status block.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:bio';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['status'] };
