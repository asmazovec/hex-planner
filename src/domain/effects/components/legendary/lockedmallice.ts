/**
 * Exterrix Headquarters (Mallice on the wormhole nexus before it flips, legendary planet): "You may exhaust this card
 * at the end of your turn to gain 2 trade goods or convert all of your commodities to trade goods."
 *
 * The same card as `legendary:mallice` under the planet id of the other side of tile 82. To be a `play` effect: any
 * entry of my turn names the card in `uses` with `choices.exterrix` = 'tradeGoods' or 'convert'. Pass 1: the hint it
 * is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'legendary:lockedmallice';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
