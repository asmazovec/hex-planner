/**
 * Imperial Arms Vault (Hope's End, legendary planet): "You may exhaust this card at the end of your turn to place 1
 * mech from your reinforcements on any planet you control or draw 1 action card"
 *
 * To be a `play` effect: any entry of my turn names the card in `uses` with `choices.hopesend` = 'mech' and
 * `choices.hopesendPlanet`; the mech stands on that planet after the entry. The other branch draws an unknown card,
 * entered with `gains`, and changes nothing else.
 */
import { placeUnits } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import { planetsOf, systemSlots } from '../../../replay/board';
import { requireControlBy } from '../../helpers/cardPlay';
import type { ChoiceContext, ComponentEffect } from '../../types';

/** The planets of the map the player controls. */
const controlled = (ctx: ChoiceContext): string[] =>
  [...new Set(systemSlots(ctx.game).flatMap(slot => planetsOf(ctx.game, slot, ctx.pack)))].filter(planet => ctx.state.control[planet] === 'me');


export const id = 'legendary:hopesend';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [
    {
      key: 'hopesend', kind: 'option', label: { ru: 'Что сделать', en: 'Which' }, options: () => ['mech', 'card'],
      names: { mech: { ru: 'Мех', en: 'Mech' }, card: { ru: 'Карта действия', en: 'Action card' } },
    },
    { key: 'hopesendPlanet', kind: 'planet', options: controlled },
  ],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    requireControlBy(ctx, 'hopesend');
    const target = ctx.choices.hopesendPlanet;
    // The other branch draws an unknown card, entered with the gains of the entry.
    if (ctx.choices.hopesend !== 'mech' || typeof target !== 'string') return [];
    ctx.unitLimit({ mech: 1 }).forEach(ctx.warn);
    return [placeUnits(ctx.holder, { planet: target }, { mech: 1 })];
  },
};
