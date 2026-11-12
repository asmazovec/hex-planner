/**
 * Local Fabricators, an industrial exploration card: "You may gain 1 commodity, or you may spend 1 trade good or 1
 * commodity to place 1 mech from your reinforcements on this planet."
 *
 * Decided: `play`, resolved when the planet is explored (LRR 35.2), with the player's choice (`choices[id]`: gain,
 * place-tradeGood or place-commodity). Gaining stops at the commodity value (21.2). Placing spends the trade good or
 * the commodity and puts one mech on the planet explored. A mech is taken from reinforcements: with none left it is
 * warned of as production is (reinforcementsOut, LRR 72.1; the card's note lets the player take one from a system
 * without their command token, which the plan leaves to them); spending what the player does not have is
 * warned of as any payment is. Nothing is waived.
 *
 * Pass 1: still the hint it is today; the resolution with its choice comes in pass 2.
 */
import type { ComponentEffect } from '../../types';

export const id = 'exploration:lf1';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
