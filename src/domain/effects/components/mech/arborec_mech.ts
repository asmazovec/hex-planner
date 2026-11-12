/**
 * Letani Behemoth (Arborec, mech): "DEPLOY: When you would use your Mitosis faction ability you may replace 1 of your
 * infantry with 1 mech from your reinforcements instead."
 *
 * Pass 1: a hint as it is today. Pass 2 makes it a `play` named in the `uses` of the status entry: instead of the
 * infantry Mitosis places, one infantry of mine on a planet becomes a mech. Its PRODUCTION and SUSTAIN DAMAGE are those
 * of a unit, not of this card.
 */
import type { ComponentEffect } from '../../types';

export const id = 'mech:arborec_mech';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
