/**
 * Dominus Orb (relic): "Before you move units during a tactical action, you may purge this card to move and transport
 * units that are in systems that contain 1 of your command tokens."
 *
 * Decided (pass 2): play, a waiver of `sourceActivated` (the move out of a system with my token, 89.2, and the pickup
 * from one, 95.3) for the tactical action that names it in `uses`; the replay already purges the relic. Pass 1 keeps
 * it the hint it is today.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'relic:dominusorb';

export const ability: Ability = {
  holder: 'self',
  tier: 'play',
  rule: id,
  permit: [{
    code: 'sourceActivated',
    rule: 'you may purge this card to move and transport units that are in systems that contain 1 of your command tokens',
    // Only an Orb still held: one already purged is a component not held, and lifts nothing.
    when: (_warning, ctx) => ctx.had.holds(id),
  }],
};
