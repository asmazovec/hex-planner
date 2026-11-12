/**
 * Propagation (Nekro Virus): "You cannot research technology. When you would research a technology: Gain 3 command
 * tokens instead."
 *
 * To be a `passive` effect: every technology the Nekro player would research (the Technology card's primary and
 * secondary) is not researched, and gives 3 command tokens to distribute instead; the card's tokens are checked
 * against those (`tokensOver`). Gaining a technology is not researching it (Nekro Virus, Propagation note 1), so a
 * technology entered as a gain is still held. Two new points of the count: whether a research is made, and the tokens
 * it gives instead.
 *
 * Pass 1: still the hint it is today; the tests beside it say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:propagation';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
