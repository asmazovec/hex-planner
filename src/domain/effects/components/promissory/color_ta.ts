/**
 * Trade Agreement (promissory note): "When the <color> player replenishes commodities: The <color> player gives you
 * all of their commodities. Then, return this card to the <color> player."
 *
 * A hint at the card step, where the Trade strategy card replenishes commodities. Whether the holder plays it is the
 * holder's choice in another player's turn, and the opponents' strategy cards are not planned; the commodities it
 * moves can be entered as a transaction by hand. Nothing is validated.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'promissory:<color>_ta';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['card'] };
