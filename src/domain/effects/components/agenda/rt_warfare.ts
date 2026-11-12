/**
 * Research Team: Warfare (agenda):
 * "Attach this card to the elected planet's card. When the owner of this planet researches technology, they may
 * exhaust this card to ignore 1 red prerequisite."
 *
 * A law attached to the elected planet. Its owner may exhaust it to ignore 1 red prerequisite: a
 * waiver of the prerequisite check (90.12, a new code `prerequisiteMissing`), held by the entry that names the card in
 * its `uses`, narrowed to one missing warfare prerequisite and to the player who controls the elected planet.
 * Pass 1: still the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'agenda:rt_warfare';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
