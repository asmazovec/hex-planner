/**
 * Holy Planet of Ixth (agenda):
 * "Attach this card to the elected planet's card. The planet's owner gains 1 victory point. Units on this planet
 * cannot use PRODUCTION. When a player gains control of this planet, they gain 1 victory point. When a player
 * loses control of this planet, they lose 1 victory point."
 *
 * A law attached to the elected planet: the units there cannot use PRODUCTION (a `modify` of the
 * point `productionValue` of a dock on that planet to 0, so a production there is over its value), and the player who
 * controls it has 1 victory point more (the point `vp`, gained and lost with the control). Pass 1: still a hint.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:holy_planet_of_ixth';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
