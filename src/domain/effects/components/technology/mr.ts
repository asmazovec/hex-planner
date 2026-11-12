/**
 * Magmus Reactor (Embers of Muaat, technology): "Your ships can move into supernovas. Each supernova that contains 1
 * or more of your units gains the PRODUCTION 5 ability as if it were 1 of your units."
 *
 * Decided: `passive`, two parts. A waiver of `routeBlocked` (86.1) narrowed to a supernova that is the active system
 * of the entry ("into"); passing through one is Gashlai Physiology's. And a source of production: a supernova system
 * holding my units produces with PRODUCTION 5, so `noProduction` is not made there and `productionOver` counts against
 * 5. Pass 1: still the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:mr';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
