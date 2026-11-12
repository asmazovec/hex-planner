/**
 * I48S (L1Z1X Mindnet, agent): "After a player activates a system: You may exhaust this card to allow that player to
 * replace 1 of their infantry in the active system with 1 mech from their reinforcements."
 *
 * Decided: a `play`. Named in the `uses` of a tactical action, the agent is exhausted (the replay does it) and one
 * infantry in the active system becomes a mech from reinforcements. Faction note 1: only an infantry that stood in
 * the system when it was activated. Pass 2 writes the replacement.
 *
 * Pass 1: the hint it is today; its tests say what it must do.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:l1z1xagent';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
