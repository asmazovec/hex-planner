/**
 * Vaults of the Heir (Mahact, breakthrough):
 * ACTION: Exhaust this card and purge 1 of your technologies to gain 1 relic.
 *
 * A hint: the component action already exhausts the breakthrough (its text says so), and the technology purged and the
 * relic gained are the entry's `spends` and `gains`.
 */
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:mahactbt';

export const effect: ComponentEffect = { tier: 'hint', rule: id, hintAt: ['component'] };
