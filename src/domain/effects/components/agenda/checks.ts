/**
 * Checks and Balances (agenda):
 * "For: When a player chooses a strategy card during the strategy phase, they give that strategy card to another
 * player who does not have 1 (or a player who does not have 2 in a three- or four-player game), if able. Against:
 * Each player readies only 3 of their planets at the end of this agenda phase."
 *
 * Hint only: under "For" the strategy card a player chooses is given to another player, whose choice the
 * plan does not know (the cards of my round are set by hand); "Against" readies only 3 planets once, entered by hand.
 * Nothing is validated.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:checks';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
