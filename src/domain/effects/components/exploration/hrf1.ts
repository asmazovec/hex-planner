/**
 * Hazardous Relic Fragment, a hazardous exploration card: "ACTION: Purge 3 of your hazardous relic fragments to gain 1 relic."
 *
 * Decided: `play`. A relic fragment is not discarded when explored but placed faceup in the play area (LRR 35.9), so
 * it must be held, in as many copies as were found; it can change hands in a transaction (35.9.2, 73.1.1). Its ACTION
 * is a component action that purges three fragments of its type, the card named among them, and gains the relic the
 * player draws (entered in the entry's gains, 73.2). Fewer than three fragments of the type is warned of with a new
 * code (relicFragmentsShort, LRR 73.1, step component); nothing is waived.
 *
 * Pass 2: the fragments are held in `Holdings.found`; the play checks three of the type (the unknown fragment counts as
 * any type) and the purge is the entry's `spends`.
 */
import { fragmentEffect } from './batch33/fragments';

export const id = 'exploration:hrf1';

export const effect = fragmentEffect(id);
