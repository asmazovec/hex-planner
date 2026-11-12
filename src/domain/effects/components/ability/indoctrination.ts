/**
 * Indoctrination (Yin Brotherhood): "At the start of a ground combat: You may spend 2 influence to replace 1 of
 * your opponent's participating infantry with 1 infantry from your reinforcements."
 *
 * A hint at the invasion: the influence is spent and the infantry replaced at the start of a ground combat, which
 * the plan does not simulate.
 */
import type { ComponentEffect } from '../../types';

export const id = 'ability:indoctrination';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
  hintAt: ['invasion'],
};
