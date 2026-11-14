/**
 * Alliance (promissory note, Prophecy of Kings): "When you receive this card, if you are not the <color> player, you
 * must place it faceup in your play area. While this card is in your play area, you can use the <color> player's
 * commander ability, if it is unlocked. When you activate a system that contains 1 or more of the <color> player's
 * units, return this card to the <color> player."
 *
 * To be `passive` with an automatic return: while I hold another player's Alliance, their commander, if they have it
 * unlocked, is in force for me as if it were mine, so whatever it modifies or waives holds for my entries; activating
 * a system with any unit of the owner returns the card (promissory notes, Alliance 2, 4).
 */
import type { Ability } from '../../../../game/abilities/types';
import { returnOnActivation } from '../../helpers/returnNote';

export const id = 'promissory:<color>_an';

/** The owner's unlocked commander is in force for the holder (`holderOf`, `Holder.others`); the card goes back on activation. */
export const ability: Ability = {
  tier: 'passive',
  rule: id,
  holder: 'anyone',
  on: { restrict: ctx => returnOnActivation(ctx, id) },
};
