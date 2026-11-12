/**
 * Trilossa Aun Mirik (Argent Flight, agent): "When a player produces ground forces in a system: You may exhaust this
 * card: that player may place those units on any planets they control in that system and any adjacent systems."
 *
 * Pass 1: a hint as it is today. Pass 2 makes it a `play` named in the `uses` of the entry that produces, with a waiver
 * of `productionPlace` (68.3: ground forces go on the planet of the producing unit) narrowed to planets the producer
 * controls in the active system or a system adjacent to it. The replay exhausts the agent.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:argentagent';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
