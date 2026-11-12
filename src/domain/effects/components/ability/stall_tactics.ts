/**
 * Stall Tactics (Yssaril Tribes): "ACTION: Discard 1 action card from your hand"
 *
 * Nothing of its own to count: the component action discards the card it `spends`, as any entry does. A hint.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:stall_tactics';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
};
