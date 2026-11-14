/**
 * Mirage Flight Academy (Mirage, legendary planet): "You may exhaust this card at the end of your turn to place up to 2
 * fighters from your reinforcements in any system that contains 1 or more of your ships"
 *
 * To be a `play` effect: any entry of my turn names the card in `uses` with `choices.mirageSystem` (a slot) and
 * `choices.mirageFighters` (1 or 2); the fighters stand in that space area after the entry.
 */
import { placeUnits } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import { requireControlBy } from '../../helpers/cardPlay';
import type { ChoiceContext, ComponentEffect } from '../../types';
import { systemsWithUnits } from '../../helpers/choices';

/** The systems of the map where the player has a ship. */
const withShips = (ctx: ChoiceContext): string[] => systemsWithUnits(ctx);


export const id = 'legendary:mirage';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'mirageSystem', kind: 'system', options: withShips },
    { key: 'mirageFighters', kind: 'number', range: [0, 2], label: { ru: 'Истребитель', en: 'Fighter' } },
  ],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    requireControlBy(ctx, 'mirage');
    const system = ctx.choices.mirageSystem;
    const count = Number(ctx.choices.mirageFighters ?? 0);
    if (typeof system !== 'string' || count <= 0) return [];
    return [placeUnits(ctx.holder, { slot: system }, { fighter: count })];
  },
};
