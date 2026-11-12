/**
 * Fleet Logistics: "During each of your turns of the action phase, you may perform 2 actions instead of 1."
 *
 * A hint. In the plan every action is an entry of its own and no check counts the actions of a turn, so two actions in
 * a row are two entries and nothing is warned of; there is nothing to lift.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:fl';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['round'] };
