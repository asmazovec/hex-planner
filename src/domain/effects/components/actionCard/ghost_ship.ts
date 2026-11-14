/**
 * Ghost Ship (action card; "Action"): "Place 1 destroyer from your reinforcements in a non-home system that contains a
 * wormhole and does not contain other players' ships."
 *
 * Decided: `play`. A component action that puts 1 destroyer in the system chosen (`choices.system`, a map slot). A
 * system outside the card's words (no wormhole, a home system, other players' ships there) is warned of
 * (`ghostShipSystem`, a code of this card); the destroyer is placed all the same. A wormhole token counts as a wormhole.
 */
import { placeUnits } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';
import ghostShipSystem from '../../../rules/codes/ghostShipSystem';
import { violation } from '../../../rules/registry';
import { othersHaveShips } from '../../helpers/cardPlay';

export const id = 'actionCard:ghost_ship';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  choose: [{ key: 'system', kind: 'system' }],
  holder: 'self',
  play: ctx => {
    const slot = String(ctx.choices.system ?? '');
    if (!slot) return [];
    const reason = ctx.tileKind(slot) === 'home' ? 'home'
      : ctx.wormholes(slot).length === 0 ? 'wormhole'
        : othersHaveShips(ctx, slot) ? 'ships' : undefined;
    if (reason) ctx.warn(violation(ghostShipSystem.code, { systemId: slot, reason }, 'component'));
    return [placeUnits(ctx.holder, { slot }, { destroyer: 1 })];
  },
};
