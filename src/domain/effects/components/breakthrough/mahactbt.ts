/**
 * Vaults of the Heir (Mahact, breakthrough):
 * ACTION: Exhaust this card and purge 1 of your technologies to gain 1 relic.
 *
 * A hint: the component action already exhausts the breakthrough (its text says so), and the technology purged and the
 * relic gained are the entry's `spends` and `gains`.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'breakthrough:mahactbt';

export const ability: Ability = { holder: 'self', tier: 'hint', rule: id, hintAt: ['component'] };
