/**
 * Greyfire Mutagen (Yin, promissory note): "At the start of a ground combat against 2 or more ground forces that
 * are not controlled by the Yin player: Replace 1 of your opponent's infantry with 1 infantry from your
 * reinforcements. Then, return this card to the Yin player."
 *
 * A hint at the invasion: the replacement of an infantry happens at the start of a ground combat, and the plan
 * simulates no combat. Played through `uses`, the note goes back to the Yin player by itself (69.3).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'promissory:greyfire';

export const ability: Ability = {
  holder: 'self',
  tier: 'hint',
  rule: id,
  hintAt: ['invasion'],
};
