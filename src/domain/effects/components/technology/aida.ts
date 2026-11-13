/**
 * AI Development Algorithm (technology, Prophecy of Kings): "When you research a unit upgrade technology, you may
 * exhaust this card to ignore any 1 prerequisite. When 1 or more of your units use PRODUCTION, you may exhaust this
 * card to reduce the combined cost of the produced units by the number of unit upgrade technologies that you own."
 *
 * Decided: played by naming it in an entry's `uses` (it is exhausted, so once a round). In the entry that researches
 * a unit upgrade it waives a missing prerequisite, one only: the replay has no prerequisite check yet (90.9 note 1),
 * pass 2 adds it for everyone. In the entry that produces it takes the number of unit upgrades owned off the cost of
 * that production.
 * Pass 2: the prerequisite waiver and the reduction of the cost.
 */
import { techOf } from '../../../replay/research';
import prerequisitesMissing from '../../../rules/codes/prerequisitesMissing';
import type { ComponentEffect } from '../../types';
import type { Hooked } from '../../../../game/abilities/types';

export const id = 'technology:aida';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  // The production half: the combined cost falls by the unit upgrades the owner holds (asked when a unit used PRODUCTION).
  modify: {
    productionCost: (value, { holdings, pack }) => Math.max(0, value - holdings.technologies.filter(tech => techOf(pack, tech)?.upgrade !== undefined).length),
  },
};

export const ability: Hooked = {
  holder: 'self',
  permit: [{
    code: prerequisitesMissing.code,
    rule: 'When you research a unit upgrade technology, you may exhaust this card to ignore any 1 prerequisite.',
    // One symbol only, and only of a unit upgrade.
    when: (warning, { pack }) => Number(warning.params.missing) <= 1 && techOf(pack, String(warning.params.id))?.upgrade !== undefined,
  }],
};
