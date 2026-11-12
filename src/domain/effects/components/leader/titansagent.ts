/**
 * Tellurian (Titans of Ul, agent): "Before a hit would be assigned: You may exhaust this card to cancel that hit."
 *
 * Decided: hint. Hits are not rolled by the plan; the reminder stands in the battle and the invasion.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:titansagent';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['combat', 'invasion'] };
