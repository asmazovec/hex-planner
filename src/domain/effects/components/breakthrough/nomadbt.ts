/**
 * Thunder's Paradox (Nomad, breakthrough, Thunder's Edge): "At the start of any player's turn, you may exhaust 1 of
 * your agents to ready any other agent."
 *
 * A hint with a waiver: named in an entry's «Used» beside the agent exhausted as its cost, it lifts
 * `componentExhausted` (51.4, 71.4) of another agent the entry plays, since that agent was readied at the start of the
 * turn. Narrowed: the warning is of an agent, and the entry uses another agent of mine that was ready before it. The
 * readied agent may be anyone's (Thunder's Paradox note 1); the plan only knows the entry owner's agents.
 */
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:nomadbt';

const isAgent = (component: string): boolean => component.startsWith('leader:') && component.includes('agent');

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
  waive: [{
    code: 'componentExhausted',
    rule: 'you may exhaust 1 of your agents to ready any other agent',
    when: (warning, ctx) => {
      const warned = String(warning.params.id);
      if (!isAgent(warned)) return false;
      // The agent that pays: another agent of mine, named in «Used», that was ready before the entry.
      return (ctx.entry?.uses ?? []).some(other => other !== warned && isAgent(other) && ctx.before.holdings.leaders[other] === 'unlocked');
    },
  }],
};
