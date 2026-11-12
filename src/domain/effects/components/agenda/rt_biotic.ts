/**
 * Research Team: Biotic (agenda):
 * "Attach this card to the elected planet's card. When the owner of this planet researches technology, they may
 * exhaust this card to ignore 1 green prerequisite."
 *
 * A law attached to the elected planet. Its owner may exhaust it to ignore 1 green prerequisite: a
 * waiver of the prerequisite check (90.12, a new code `prerequisiteMissing`), held by the entry that names the card in
 * its `uses` (exhausting it, as its text says), narrowed to one missing biotic prerequisite and to the player who
 * controls the elected planet. Pass 1: still the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:rt_biotic';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
