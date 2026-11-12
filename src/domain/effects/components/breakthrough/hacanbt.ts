/**
 * Auto-Factories (Emirates of Hacan, breakthrough, Thunder's Edge): "When you produce 3 or more non-fighter ships,
 * place 1 command token from your reinforcements into your fleet pool."
 *
 * Decided: `passive` once the breakthrough is held: a production of three or more non-fighter ships in one use of
 * PRODUCTION puts one token into the fleet pool. Fighters and ground forces do not count. It needs a point of the
 * count asked by the production step. Pass 1: still the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:hacanbt';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
