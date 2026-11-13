/**
 * Local Fabricators, an industrial exploration card: "You may gain 1 commodity, or you may spend 1 trade good or 1
 * commodity to place 1 mech from your reinforcements on this planet."
 *
 * Decided: `play`, resolved when the planet is explored (LRR 35.2), with the player's choice (`choices[id]`: gain,
 * place-tradeGood or place-commodity). Gaining stops at the commodity value (21.2). Placing spends the trade good or
 * the commodity and puts one mech on the planet explored. A mech is taken from reinforcements: with none left it is
 * warned of as production is (reinforcementsOut, LRR 72.1; the card's note lets the player take one from a system
 * without their command token, which the plan leaves to them); spending what the player does not have is
 * warned of as any payment is. Nothing is waived.
 *
 * Pass 1: still the hint it is today; the resolution with its choice comes in pass 2.
 */

import { exploredPlanet } from './batch33/attach';
import type { ComponentEffect } from '../../types';
import type { Hooked } from '../../../../game/abilities/types';
import { code, gainCommodities, spendOne } from './batch33/attach';
import { place } from '../../../../game/abilities/emit';
import { violation } from '../../../rules/registry';

export const id = 'exploration:lf1';

/** What is spent to draw or to place: a trade good, or a commodity the card allows (21.7). Short of it, the payment is warned of as any is. */
export const effect: ComponentEffect = {
  tier: 'play', rule: id,
  choose: [{
    key: id, kind: 'option', options: () => ['gain', 'place-tradeGood', 'place-commodity'], label: { ru: 'Что сделать', en: 'What to do' },
    names: {
      gain: { ru: 'Взять 1 продукцию', en: 'Gain 1 commodity' },
      'place-tradeGood': { ru: 'Потратить товар и поставить меха', en: 'Spend a trade good to place a mech' },
      'place-commodity': { ru: 'Потратить продукцию и поставить меха', en: 'Spend a commodity to place a mech' },
    },
  }],
};

/** The hooks written for the kernel: they read the board and return events. */
export const ability: Hooked = {
  holder: 'anyone',
  on: {
    gained: ctx => {
      const choice = ctx.choices[id];
      if (choice === 'gain') return gainCommodities(ctx, 1);
      if (choice !== 'place-tradeGood' && choice !== 'place-commodity') return;
      const spent = spendOne(ctx, choice === 'place-commodity');
      const planetId = exploredPlanet(ctx);
      if (planetId === undefined) return spent;
      for (const warning of ctx.unitLimit({ mech: 1 }, 'component')) ctx.warn(warning);
      if (!ctx.my.planets().some(planet => planet.id === planetId)) ctx.warn(violation(code('placeNotControlled'), { planetId }, 'component'));
      return [...spent, place.units(ctx.holder, { planet: planetId }, { mech: 1 })];
    },
  },
};
