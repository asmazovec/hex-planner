/**
 * Hegemonic Trade Policy (Winnu, technology): "Exhaust this card when 1 or more of your units use PRODUCTION; swap the
 * resource and influence values of 1 planet you control during that use of Production."
 *
 * Decided: `play` with a waiver. The technology is named in `uses` of the entry that produces (the replay exhausts it);
 * the `shortResources` warning of that production is lifted when the swap of one paying planet covers the shortfall
 * (its influence less its resources, for the best planet of the payment). Ruling 1 (it changes the Production value
 * of a dock on that planet) is not modelled.
 *
 * Pass 1: the hint it is today; the tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:htp';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
