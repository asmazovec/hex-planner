/**
 * The Atrament (Primor, legendary planet): "You may exhaust this card at the end of your turn to place up to 2 infantry
 * from your reinforcements on any planet you control"
 *
 * To be a `play` effect: any entry of my turn names the card in `uses` (the replay exhausts it, its text says so) with
 * `choices.primorPlanet` and `choices.primorInfantry` (1 or 2); the infantry stand on that planet after the entry.
 * The card is played only by the player who controls Primor (53.3).
 */
import { placeUnits } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';
import { requireControlBy } from '../../helpers/cardPlay';
import { controlledPlanets } from '../../helpers/choices';

export const id = 'legendary:primor';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'primorPlanet', kind: 'planet', options: controlledPlanets },
    { key: 'primorInfantry', kind: 'number', range: [0, 2], label: { ru: 'Пехота', en: 'Infantry' } },
  ],
  holder: 'self',
  play: ctx => {
    requireControlBy(ctx, 'primor');
    const planet = ctx.choices.primorPlanet;
    const count = Number(ctx.choices.primorInfantry ?? 0);
    if (typeof planet !== 'string' || count <= 0) return [];
    return [placeUnits(ctx.holder, { planet }, { infantry: count })];
  },
};
