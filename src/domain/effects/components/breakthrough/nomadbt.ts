/**
 * Thunder's Paradox (Nomad, breakthrough, Thunder's Edge): "At the start of any player's turn, you may exhaust 1 of
 * your agents to ready any other agent."
 *
 * To be a hint with a waiver (pass 2): named in an entry's «Used» beside the agent exhausted as its cost, it lifts
 * `componentExhausted` (51.4, 71.4) of another agent the entry plays, since that agent was readied at the start of the
 * turn. Narrowed: the warning is of an agent, and the entry uses another agent of mine that was ready before it. The
 * readied agent may be anyone's (Thunder's Paradox note 1); the plan only knows the entry owner's agents.
 * Pass 1: the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'breakthrough:nomadbt';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
