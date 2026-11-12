/**
 * Sling Relay: "ACTION: Exhaust this card to produce 1 ship in any system that contains one of your space docks."
 *
 * Pass 2 makes it a `play`: the component action places the ship chosen (`choices.unit`) in the system chosen
 * (`choices.systemId`) and warns `noProduction` when that system holds none of my space docks; the ship is paid for
 * (ruling 1). The replay already exhausts the card. Today a hint.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:sr';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
