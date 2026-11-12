/**
 * Demilitarized Zone (cultural exploration, Prophecy of Kings): "Return all structures on this planet to your
 * reinforcements. Then, return all ground forces on this planet to the space area. Attach: Units cannot be committed
 * to, produced on, or placed on this planet. During the agenda phase, this planet's planet card can be traded as part
 * of a transaction."
 *
 * Decided: `play` plus a new check. Played in the `uses` of the tactical action whose landing takes control of the
 * planet: the player's structures there go back, the ground forces go up to the space area of the system (control of
 * the planet stays, 12.2), and the card is attached to the planet (`attachments`, 35.8). From then on a landing or a
 * production onto that planet is warned of for everyone with a new code (`planetDemilitarized`, the card's own text;
 * step invasion). Trading the planet card in the agenda phase is not modelled (no agenda phase). Pass 1: the hint it was.
 */
import type { ComponentEffect } from '../../types';

export const id = 'exploration:dmz';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
