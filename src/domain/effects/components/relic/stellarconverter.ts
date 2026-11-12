/**
 * Stellar Converter (relic): "ACTION: Choose 1 non-home, non-legendary planet other than Mecatol Rex in a system that
 * is adjacent to 1 or more of your units that have BOMBARDMENT, destroy all units on that planet and purge its
 * attachments and its planet card. Then, place the destroyed planet token on that planet and purge this card."
 *
 * Decided (pass 2): play. `choices.planetId` is destroyed: every unit on it is gone and nobody controls it any more; a
 * target the card does not allow (my own planet, a home or legendary planet, Mecatol Rex, no unit with BOMBARDMENT
 * adjacent) is warned of. The replay already purges the relic. Pass 1 keeps it the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'relic:stellarconverter';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
