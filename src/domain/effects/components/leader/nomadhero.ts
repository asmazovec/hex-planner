/**
 * Ahk-Syl Siven, Probability Matrix (Nomad, hero): "ACTION: Place this card near the game board. your flagship and
 * units it transports can move out of systems that contain your command tokens during this game round. At the end of
 * that game round, purge this card."
 *
 * A `play` with a waiver for the round (pass 2): the hero is played by a component action (and purged by it, as
 * every hero), and from that entry to the end of the round `sourceActivated` (58.3.3) is lifted for a move out of a
 * system with my command token whose units are the flagship and what it transports: ground forces and fighters, no
 * other ship. The flagship may also pick up ground forces in such a system (Nomad, Ahk-Syl Siven note 2), so the
 * pickup's `sourceActivated` of the transport step is lifted the same way when the flagship's group makes it.
 *
 */
import type { Move } from '../../../replay/state';
import type { ComponentEffect, WaiverContext } from '../../types';

export const id = 'leader:nomadhero';

const RULE = 'your flagship and units it transports can move out of systems that contain your command tokens during this game round';

/** The flagship, and what it transports: ground forces and fighters. */
const CARGO = new Set(['flagship', 'infantry', 'mech', 'fighter']);

const moves = (ctx: WaiverContext): Move[] => (ctx.entry?.type === 'tactical' ? ctx.entry.moves : []);
const hasFlagship = (ctx: WaiverContext): boolean => moves(ctx).some(move => (move.units.flagship ?? 0) > 0);

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  waive: [
    {
      code: 'sourceActivated',
      rule: RULE,
      lasts: 'round',
      when: (warning, ctx) => {
        if (!hasFlagship(ctx)) return false;
        if (warning.params.context === 'pickup') {
          // The flagship picks up where my token lies: the carrier of the pickup is the flagship's group.
          return moves(ctx).some(move => move.pickupOf === undefined && move.from === warning.params.from && (move.units.flagship ?? 0) > 0);
        }
        const out = moves(ctx).filter(move => move.from === warning.params.from);
        return out.length > 0 && out.every(move => Object.entries(move.units).every(([unit, count]) => !count || CARGO.has(unit)));
      },
    },
  ],
};
