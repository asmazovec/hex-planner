/**
 * Guild Ships (Emirates of Hacan): "You can negotiate transactions with players who are not your neighbor."
 *
 * Decided: a `passive` waiver of `notNeighbor` (94.1). The Hacan is not made a neighbour of anyone (Hacan note 1), so
 * nothing else changes: one transaction with each player per turn still stands (note 3). Pass 1: still the hint it is
 * today. Ruling (Hacan, Guild Ships 2): either player may initiate the negotiation, so a deal with the Hacan is lifted too
 * (`partner`).
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'ability:guild_ships';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  permit: [{ code: 'notNeighbor', rule: 'You can negotiate transactions with players who are not your neighbor.', partner: true }],
};
