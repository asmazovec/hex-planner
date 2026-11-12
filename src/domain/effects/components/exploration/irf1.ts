/**
 * Industrial Relic Fragment, a industrial exploration card: "ACTION: Purge 3 of your industrial relic fragments to gain 1 relic."
 *
 * Decided: `play`. A relic fragment is not discarded when explored but placed faceup in the play area (LRR 35.9), so
 * it must be held, in as many copies as were found; it can change hands in a transaction (35.9.2, 73.1.1). Its ACTION
 * is a component action that purges three fragments of its type, the card named among them, and gains the relic the
 * player draws (entered in the entry's gains, 73.2). Fewer than three fragments of the type is warned of with a new
 * code (relicFragmentsShort, LRR 73.1, step component); nothing is waived.
 *
 * Pass 1: still the hint it is today; the fragments held, the check and the purge come in pass 2.
 */
import type { ComponentEffect } from '../../types';

export const id = 'exploration:irf1';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
