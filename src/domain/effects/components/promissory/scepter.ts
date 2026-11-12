/**
 * Scepter of Dominion (Mahact, promissory note):
 * At the start of the strategy phase: Choose 1 non-home system that contains your units, each other player who
 * has a token on the Mahact player's command sheet places a token from their reinforcements in that system.
 * Then, return this card to the Mahact player.
 *
 * A hint: the tokens on the Mahact command sheet are not tracked. Its return to the Mahact player once played is the
 * replay's own (69.3, "Then, return this card").
 */
import type { ComponentEffect } from '../../types';

export const id = 'promissory:scepter';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['round'] };
