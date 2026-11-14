/**
 * Airo Shir Aur, Benediction (Mahact, hero):
 * ACTION: Move all units in the space area of any system to an adjacent system that contains a different
 * player's ships. Space combat is resolved in that system. neither player can retreat or resolve abilities that
 * would move their ships. Then, purge this card.
 *
 * A play, red in pass 1: the component action moves every unit of the space area of one system to an adjacent one
 * that holds another player's ships (`choices.from`, `choices.to`); the replay already purges the hero.
 * Decided (pass 2): `play` with two system choices. Every unit of my space area in `from` is added to `to`; a system
 * chosen as both, or none chosen, does nothing. A `to` that holds no other player's ships is warned of (componentCondition); whether it is adjacent is not
 * checked; the battle is the player's, entered as losses of a later entry.
 */
import { componentById } from '../../../components';
import componentCondition from '../../../rules/codes/componentCondition';
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';
import { placeUnits, removeUnits } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import { othersHaveShips } from '../../helpers/cardPlay';

export const id = 'leader:mahacthero';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'from', kind: 'system', label: { ru: 'Откуда', en: 'From' } },
    { key: 'to', kind: 'system', label: { ru: 'Куда', en: 'To' } },
  ],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const from = ctx.choices.from === undefined ? undefined : String(ctx.choices.from);
    const to = ctx.choices.to === undefined ? undefined : String(ctx.choices.to);
    if (from === undefined || to === undefined || from === to) return [];
    // The target must hold a different player's ships; whether it is adjacent is not checked.
    if (ctx.held && !othersHaveShips(ctx, to)) ctx.warn(violation(componentCondition.code, { id, name: componentById(ctx.pack, id)?.name ?? id, condition: "a different player's ships" }));
    const moving = ctx.my.unitsIn(from);
    return Object.values(moving).some(count => (count ?? 0) > 0) ? [removeUnits(ctx.holder, { slot: from }, moving), placeUnits(ctx.holder, { slot: to }, moving)] : [];
  },
};
