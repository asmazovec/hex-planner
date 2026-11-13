/**
 * Impulse Core (Yin, faction technology): "At the start of a space combat, you may destroy 1 of your cruisers or
 * destroyers in the active system to produce 1 hit against your opponent's ships; that hit must be assigned by
 * your opponent to 1 of their non-fighters ships if able."
 *
 * A hint at combat: a hit at the start of a space combat; the ship destroyed is entered as a loss.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:ic';

export const ability: Ability = {
  holder: 'self',
  tier: 'hint',
  rule: id,
  hintAt: ['combat'],
};
