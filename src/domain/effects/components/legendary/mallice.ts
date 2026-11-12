/**
 * Exterrix Headquarters (Mallice, the wormhole nexus flipped, legendary planet): "You may exhaust this card at the end
 * of your turn to gain 2 trade goods or convert all of your commodities to trade goods."
 *
 * To be a `play` effect: any entry of my turn names the card in `uses` with `choices.exterrix` = 'tradeGoods' (2 more
 * trade goods) or 'convert' (every commodity becomes a trade good, 21.4). Pass 1: the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'legendary:mallice';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
