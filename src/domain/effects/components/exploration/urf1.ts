/**
 * Unknown Relic Fragment (frontier exploration): "The card counts as a relic fragment of any type."
 *
 * A hint with no step. Relic fragments lie in the play area (35.9) but the holdings of the plan keep no exploration
 * card (`gain` in src/domain/replay/holdings.ts), so there is no count of fragments for it to stand in; a relic gained
 * by purging fragments is entered with `gains`. Nothing is validated.
 */
import type { ComponentEffect } from '../../types';

export const id = 'exploration:urf1';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
