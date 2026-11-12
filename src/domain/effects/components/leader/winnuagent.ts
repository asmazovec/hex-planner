/**
 * Berekar Berekon (Winnu, agent): "When 1 or more of a player's units use PRODUCTION: You may exhaust this card to
 * reduce the combined cost of the produced units by 2."
 *
 * Decided: `play` with a waiver. The agent is named in `uses` of the entry that produces (the replay exhausts it); the
 * `shortResources` warning of that production is lifted when the shortfall is 2 or less. A `play` effect cannot change
 * a number of the count, so the reduction is a waiver narrowed to what 2 resources cover. Ruling (Winnu, Berekar
 * Berekon 1): production limits still apply.
 */
import { readyToPlay } from '../../../replay/holdings';
import type { ComponentEffect } from '../../types';

export const id = 'leader:winnuagent';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  waive: [{
    code: 'shortResources',
    rule: 'You may exhaust this card to reduce the combined cost of the produced units by 2',
    // The cost is 2 less: a shortfall of 2 or less is none. An agent not ready (exhausted, locked) reduces nothing.
    when: ({ params }, { game, pack, before }) =>
      Number(params.needed) - Number(params.paid) <= 2 && readyToPlay(pack, before.holdings, game.faction, before.control).has(id),
  }],
};
