/**
 * AI Development Algorithm (technology, Prophecy of Kings): "When you research a unit upgrade technology, you may
 * exhaust this card to ignore any 1 prerequisite. When 1 or more of your units use PRODUCTION, you may exhaust this
 * card to reduce the combined cost of the produced units by the number of unit upgrade technologies that you own."
 *
 * Decided: played by naming it in an entry's `uses` (it is exhausted, so once a round). In the entry that researches
 * a unit upgrade it waives a missing prerequisite, one only: the replay has no prerequisite check yet (90.9 note 1),
 * pass 2 adds it for everyone. In the entry that produces it takes the number of unit upgrades owned off the cost of
 * that production.
 * Pass 1: a hint, as it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'technology:aida';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
