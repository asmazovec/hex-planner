/**
 * Archon's Gift (Xxcha, breakthrough): "You can spend influence as if it were resources. You can spend resources as if
 * it were influence."
 *
 * Decided: a `passive` waiver of `shortResources` and `shortInfluence`, narrowed to the shortfall that the paying
 * planets cover when each is spent for its other value: a planet is spent for one or the other, never both (ruling 1),
 * so it is worth the greater of its two values. Nothing else changes (ruling 3): a dock's Production value still counts
 * the resources only.
 *
 * Pass 1: the hint it is today; the tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:xxchabt';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
