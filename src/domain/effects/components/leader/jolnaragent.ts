/**
 * Doctor Sucaban (Universities of Jol-Nar, agent): "When a player spends resources to research: You may exhaust this
 * card to allow that player to remove any number of their infantry from the game board. For each unit removed, reduce
 * the resources spent by 1."
 *
 * Decided: `play`. Named in the `uses` of an entry that researches with resources (the Technology card), the agent
 * (exhausted by the replay, as any agent used) removes the infantry chosen in the entry's `choices` (planet id to the
 * number removed, never more than stand there) and lowers the cost of the research by that number: the payment check
 * then runs against the lower cost, nothing is listed as waived. Used for another player it is not modelled: an
 * opponent's entry does not change my state.
 *
 * Pass 1: a hint, as the guide asks; the play is written in pass 2.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:jolnaragent';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
