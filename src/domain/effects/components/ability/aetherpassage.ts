/**
 * Aetherpassage (Empyrean, ability):
 * After a player activates a system: You may allow that player to move their ships through systems that contain
 * your ships.
 *
 * A play waiver, red in pass 1: the Empyrean player allows another player's ships through systems holding Empyrean
 * ships (58.3.2). It is the Empyrean player's choice in another player's turn, so the mover names it in `uses`; it lifts
 * `routeBlocked` only for systems that hold the Empyrean player's ships.
 * Decided (pass 2): a hint effect with a waiver, held for the entry that names it. The waiver is narrowed to a
 * system blocked by ships (an anomaly still stands) in which an opponent whose faction is Empyrean has ships.
 */
import type { Ability } from '../../../../game/abilities/types';

export const id = 'ability:aetherpassage';

export const ability: Ability = {
  holder: 'self',
  tier: 'hint',
  rule: id,
  hintAt: ['activation', 'movement'],
  permit: [{
    code: 'routeBlocked',
    rule: 'You may allow that player to move their ships through systems that contain your ships.',
    when: (warning, ctx) => {
      if (ctx.routeBlockKind(warning) !== 'ships') return false;
      const slot = String(warning.params.systemId);
      return ctx.table.players.some(player => player.id !== ctx.actor && player.faction === 'empyrean' && Object.values(ctx.prior.of(player.id).unitsIn(slot)).some(n => (n ?? 0) > 0));
    },
  }],
};
