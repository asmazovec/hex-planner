/**
 * Propagation (Nekro Virus): "You cannot research technology. When you would research a technology: Gain 3 command
 * tokens instead."
 *
 * A `passive` effect with a `modify` of `researchTokens`: every technology the Nekro player would research (the
 * Technology card's primary and secondary) is not researched and gives 3 command tokens to distribute instead; the
 * card's tokens are checked against those (`tokensOver`). Gaining a technology is not researching it (Nekro Virus,
 * Propagation note 1), so a technology entered as a gain is still held.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:propagation';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  modify: { researchTokens: () => 3 },
};
