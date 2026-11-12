/**
 * Imperia (Mahact, ability):
 * While another player's command token is in your fleet pool, you can use the ability of that player's
 * commander, if it is unlocked.
 *
 * A passive waiver, red in pass 1: the commander of another player, unlocked by that player, can be used by the Mahact
 * player, so `componentNotHeld` of such a commander named in `uses` is lifted. Whose tokens are in the fleet pool is not
 * tracked, so that condition is not checked.
 * Decided (pass 2): the waiver is narrowed to a commander of an opponent's faction that the opponent holds unlocked.
 * A leader of another type, a locked commander and the commander of a faction nobody plays stay warned of. The ability
 * is printed on the Mahact sheet: another faction's warning stands, since a passive effect holds for the faction sheet.
 */
import { componentById } from '../../../components';
import type { ComponentEffect } from '../../types';

export const id = 'ability:imperia';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  waive: [{
    code: 'componentNotHeld',
    rule: "you can use the ability of that player's commander, if it is unlocked.",
    when: (warning, ctx) => {
      const def = componentById(ctx.pack, String(warning.params.id));
      if (def?.kind !== 'leader' || def.detail?.type !== 'commander') return false;
      return ctx.game.opponents.some(player => {
        if (player.faction !== def.faction) return false;
        const held = player.id === 'me' ? ctx.shared : ctx.shared.rivals?.[player.id];
        return held?.holdings.leaders[def.id] === 'unlocked';
      });
    },
  }],
};
