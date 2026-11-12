/**
 * Wormhole Reconstruction (agenda):
 * "For: All systems that contain either an alpha or beta wormhole are adjacent to each other. Against: Each player
 * places a command token from their reinforcements in each system that contains a wormhole and 1 or more of their
 * ships."
 *
 * A law: while it is in play (the "For" outcome, 8.20) every system with an alpha or a beta wormhole is
 * adjacent to every other. Adjacency is not a number and no check is lifted: the neighbours of a transaction (60.2,
 * `notNeighbor`) and the reach of a route are to count the new adjacency, so no warning is made at all. To become a
 * `passive` effect asked at a new point of adjacency. The "Against" outcome (tokens in wormhole systems) is a one-time
 * change entered by hand, and the card is then discarded (7.6). Pass 1: still the hint it is today.
 */
import { wormholeSlots } from '../../../movement';
import type { ComponentEffect } from '../../types';

export const id = 'agenda:wormhole_recon';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  // "All systems that contain either an alpha or beta wormhole are adjacent to each other."
  links: ({ game, pack, shared }) => {
    const holes = [...new Set([...wormholeSlots(game, pack, 'alpha', shared?.wormholeTokens), ...wormholeSlots(game, pack, 'beta', shared?.wormholeTokens)])];
    return holes.flatMap((a, i) => holes.slice(i + 1).map((b): readonly [string, string] => [a, b]));
  },
};
