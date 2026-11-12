/**
 * Versatile (Federation of Sol, ability): "When you gain command tokens during the status phase: Gain 1 additional
 * command token."
 *
 * Pass 1: a hint. Decided: `passive` `modify` of the point `tokensGained` at the step `status`: three tokens instead of two,
 * so the fourth is warned of against three (a modify, not a waiver). Leadership and other cards are not "during the status phase".
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:versatile';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
