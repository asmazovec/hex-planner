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
import { routeBlockKind } from '../../helpers/movement';
import type { ComponentEffect } from '../../types';

export const id = 'ability:aetherpassage';

export const effect: ComponentEffect = {
  tier: 'hint',
  rule: id,
  hintAt: ['activation', 'movement'],
  waive: [{
    code: 'routeBlocked',
    rule: 'You may allow that player to move their ships through systems that contain your ships.',
    when: (warning, ctx) => {
      if (routeBlockKind(warning, ctx) !== 'ships') return false;
      const slot = String(warning.params.systemId);
      return ctx.game.opponents.some(player => {
        if (player.faction !== 'empyrean') return false;
        const state = player.id === 'me' ? ctx.shared : ctx.shared.rivals?.[player.id];
        const ships = state ? state.systems[slot] : ctx.game.enemyUnits[slot]?.[player.id];
        return Object.values(ships ?? {}).some(n => (n ?? 0) > 0);
      });
    },
  }],
};
