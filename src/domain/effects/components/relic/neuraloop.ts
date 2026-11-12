/**
 * Neuraloop (relic): "When a public objective is revealed, you may purge one of your relics to discard that objective
 * and replace it with a random objective from any objective deck; that objective is a public objective, even if it is a
 * secret objective."
 *
 * A hint at the status step, where public objectives are revealed: the objective drawn is random and entered by hand,
 * and the relic purged is entered as spent. Nothing the plan counts is validated by it.
 */
import type { ComponentEffect } from '../../types';

export const id = 'relic:neuraloop';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['status'] };
