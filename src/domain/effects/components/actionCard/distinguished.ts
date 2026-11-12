/**
 * Distinguished Councilor (action card; "After you cast votes on an outcome of an agenda"): "Cast 5 additional votes
 * for that outcome."
 *
 * A hint with no step: votes are not counted by the plan, and the agenda phase has no block.
 */
import type { ComponentEffect } from '../../types';

export const id = 'actionCard:distinguished';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
