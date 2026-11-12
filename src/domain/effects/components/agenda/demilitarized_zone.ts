/**
 * Demilitarized Zone (agenda):
 * "Attach this card to the elected planet's card. Then, destroy all units on that planet. Player's units cannot
 * land, be produced, or be placed on this planet."
 *
 * A law attached to the elected planet. It forbids what the rules allow: no unit lands, is produced or is
 * placed there. The replay is to warn of it for everyone with a new code (`planetClosed`) at the landing, the
 * production and the placing of structures; nothing lifts it. When resolved, every unit on the planet is destroyed.
 * Pass 1: still the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:demilitarized_zone';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
