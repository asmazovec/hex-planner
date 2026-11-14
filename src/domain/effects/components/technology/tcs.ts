/**
 * Temporal Command Suite (Nomad, technology): "After any player's agent becomes exhausted, you may exhaust this card to
 * ready that agent; if you ready another player's agent, you may perform a transaction with that player."
 *
 * A `play` with waivers. Named in «Used» of the entry that exhausts an agent of mine, it readies that
 * agent after the entry (the card itself is exhausted by its own words, which the replay already does). Named in an
 * entry with a transaction, it lifts `notNeighbor` and `transactionRepeated` (94.1, 60.1) for that entry: the
 * transaction needs no neighbour and may be a second one with that player this turn (Nomad, Temporal Command Suite
 * notes 1 and 3). Another player's agent exhausted in their own turn is not modelled: the plan asks the owner of an
 * entry only.
 */
import { card } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'technology:tcs';

const isAgent = (component: string): boolean => component.startsWith('leader:') && component.includes('agent');

export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'self',
  play: ctx => {
    if (!ctx.held) return [];
    // The agents the entry exhausted (its own action, or «Used») are readied at once.
    const exhausted = [ctx.entry?.type === 'component' ? ctx.entry.componentId : undefined, ...(ctx.entry?.uses ?? [])];
    return [...new Set(exhausted)].flatMap(agent => (agent !== undefined && isAgent(agent) && ctx.my.card(agent) === 'exhausted' ? [card.ready(ctx.holder, agent)] : []));
  },
  permit: [
    { code: 'notNeighbor', rule: "if you ready another player's agent, you may perform a transaction with that player" },
    { code: 'transactionRepeated', rule: "if you ready another player's agent, you may perform a transaction with that player" },
  ],
};
