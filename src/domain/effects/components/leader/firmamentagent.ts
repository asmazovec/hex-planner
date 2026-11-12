/**
 * Myru Vos (The Firmament, agent): "When a player moves ships: You may exhaust this card; if you do, SPACE CANNON cannot
 * be used against those ships. If they are not transporting units, they can also move through other players' ships."
 *
 * Decided: a waiver of the route check (`routeBlocked`, LRR 58.3.2) for the entry that names the agent in `uses`,
 * narrowed to a system blocked by other players' ships (not an anomaly, not a hyperlane) and to a move that transports
 * nothing; and only while the agent is ready before the entry (an exhausted card cannot be exhausted again). The SPACE
 * CANNON part is a reminder of the combat: the plan rolls no dice.
 *
 * Pass 1: still the hint it is today; the waiver comes in pass 2.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:firmamentagent';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
