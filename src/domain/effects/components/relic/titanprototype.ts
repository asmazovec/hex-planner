/**
 * JR-XS455-O (relic, an agent by the rulings): "ACTION: Exhaust this agent and choose a player, that player may spend 3
 * resources to place a structure on a planet they control. If they do not, they gain 1 trade good."
 *
 * Decided (pass 2): play. Chosen for myself: `choices.structure` and `choices.planetId` place the structure (warned of
 * on a planet I do not control), otherwise 1 trade good. The relic is exhausted by its play as an agent is; the replay
 * exhausts a relic only when its text says "exhaust this card". Pass 1 keeps it the hint it is today.
 */
import type { ComponentEffect } from '../../types';

export const id = 'relic:titanprototype';

export const effect: ComponentEffect = { tier: 'hint', rule: id };
