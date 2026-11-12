/**
 * Merchant Station (frontier exploration): "You may replenish your commodities, or you may convert your commodities
 * to trade goods."
 *
 * To be a `play` effect: the plan counts commodities and trade goods. The entry that explores the frontier token
 * names the card in `uses` and the player's choice in `choices.merchantStation`: 'replenish' fills the commodities
 * up to the faction's value (21.3), 'convert' turns every commodity into a trade good (21.4). Without a choice
 * nothing changes ("may"). Pass 1: the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'exploration:ms1';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
