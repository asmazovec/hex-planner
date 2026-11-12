/**
 * Future Sight (Nomad): "During the Agenda phase, after an outcome that you voted for or predicted is resolved: Gain 1
 * trade good."
 *
 * A hint. The agenda phase, its votes and its outcomes are not planned, so the trade good has no moment to be counted
 * at; one gained is entered by hand.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:future_sight';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
