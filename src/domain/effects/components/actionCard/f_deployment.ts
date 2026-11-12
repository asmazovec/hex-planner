/**
 * Frontline Deployment (action card; "Action"): "Place 3 infantry from your reinforcements on 1 planet you control."
 *
 * Decided: `play`. A component action that puts 3 infantry on the planet chosen (`choices.planet`), all three on that
 * one planet (ruling). A planet the player does not control is warned of (a new code, `componentTarget`, see the
 * report); the infantry are placed all the same, as a warning forbids nothing.
 *
 * Pass 1: the hint it is today; pass 2 writes the play.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:f_deployment';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
