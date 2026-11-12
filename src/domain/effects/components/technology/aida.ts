/**
 * AI Development Algorithm (technology, Prophecy of Kings): "When you research a unit upgrade technology, you may
 * exhaust this card to ignore any 1 prerequisite. When 1 or more of your units use PRODUCTION, you may exhaust this
 * card to reduce the combined cost of the produced units by the number of unit upgrade technologies that you own."
 *
 * Decided: played by naming it in an entry's `uses` (it is exhausted, so once a round). In the entry that researches
 * a unit upgrade it waives a missing prerequisite, one only: the replay has no prerequisite check yet (90.9 note 1),
 * pass 2 adds it for everyone. In the entry that produces it takes the number of unit upgrades owned off the cost of
 * that production.
 * Pass 2: the prerequisite waiver. The production half is missing: see the comment on `effect`.
 */
import { techOf } from '../../../replay/research';
import prerequisitesMissing from '../../../rules/codes/prerequisitesMissing';
import type { ComponentEffect } from '../../types';

export const id = 'technology:aida';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  waive: [{
    code: prerequisitesMissing.code,
    rule: 'When you research a unit upgrade technology, you may exhaust this card to ignore any 1 prerequisite.',
    // One symbol only, and only of a unit upgrade.
    when: (warning, { pack }) => Number(warning.params.missing) <= 1 && techOf(pack, String(warning.params.id))?.upgrade !== undefined,
  }],
  // The production half ("reduce the combined cost ... by the number of unit upgrade technologies that you own") needs
  // the owner's holdings in the context of the point `productionCost`, which has the faction only: not modelled yet.
};
