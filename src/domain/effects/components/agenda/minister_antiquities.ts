/**
 * Minister of Antiquities (directive): "The elected player gains 1 relic."
 *
 * Decided: hint. The relic is drawn at random; the player enters it among what the agenda entry gains, which the
 * plan already counts. Nothing is validated.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:minister_antiquities';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
