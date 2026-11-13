/**
 * Arms Reduction (agenda, directive): "For: Each player destroys all but 2 of their dreadnoughts and all but 4 of
 * their cruisers. Against: At the start of the next strategy phase, each player exhausts each of their planets that
 * have a technology specialty."
 *
 * Decided: play. The "For" outcome changes the board the plan counts: an agenda entry that resolves it (gains the
 * directive) destroys the dreadnoughts beyond 2 and the cruisers beyond 4. Which ones stay is the player's choice when
 * they stand in more than one system, and that choice has no field yet. "Against" exhausts planets at a later phase
 * and is not modelled.
 */
import type { ComponentEffect } from '../../types';
import type { Hooked } from '../../../../game/abilities/types';
import type { GameEvent } from '../../../../game/abilities/types';

export const id = 'agenda:arms_reduction';

/** Keeps the first `keep` units of a type over the systems in order and destroys the rest. */
export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
};

/** The hooks written for the kernel: they read the board and return events. */
export const ability: Hooked = {
  holder: 'anyone',
  on: {
    gained: ctx => {
      const events: GameEvent[] = [];
      for (const [unit, keep] of [['dreadnought', 2], ['cruiser', 4]] as const) {
        let left = keep;
        for (const [slot, system] of Object.entries(ctx.board.systems)) {
          const have = system.ships[ctx.holder]?.[unit] ?? 0;
          if (have === 0) continue;
          const stay = Math.min(have, left);
          left -= stay;
          if (have > stay) events.push({ type: 'UnitsRemoved', player: ctx.holder, at: { slot }, units: { [unit]: have - stay } });
        }
      }
      return events;
    },
  },
};
