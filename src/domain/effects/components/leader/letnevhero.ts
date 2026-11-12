/**
 * Darktalon Treilla, Dark Matter Affinity (Barony of Letnev, hero): "ACTION: Place this card near the game board. the
 * number of non-fighter ships you can have in systems is not limited by laws or by the number of command tokens in
 * your fleet pool during this game round. At the end of that game round, purge this card."
 *
 * A `play` effect with nothing to count: the hero is played by a component action (the replay purges a hero when it
 * is played) and from that entry to the end of the round the fleet pool check (37.1) is lifted for its player.
 */
import type { ComponentEffect } from '../../types';

export const id = 'leader:letnevhero';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  waive: [{
    code: 'fleetPool',
    rule: 'the number of non-fighter ships you can have in systems is not limited by laws or by the number of command tokens in your fleet pool during this game round',
    lasts: 'round',
  }],
};
