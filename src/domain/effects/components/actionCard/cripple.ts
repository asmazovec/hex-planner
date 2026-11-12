/**
 * Cripple Defenses (action card; "Action"): "Choose 1 planet. Destroy each PDS on that planet."
 *
 * Decided: `play`. It is a component action that changes the board the plan counts: every PDS on the chosen planet
 * (`choices.planet`), whoever's, is destroyed and goes back to its owner's reinforcements. The planet may hold no PDS
 * (ruling): then nothing happens and nothing is warned of.
 *
 * Pass 1: the hint it is today; pass 2 writes the play.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:cripple';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
