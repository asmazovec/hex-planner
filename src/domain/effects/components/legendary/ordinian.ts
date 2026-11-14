/**
 * 4X41D "Hyperion" VI (Ordinian, legendary planet, Thunder's Edge): "You may exhaust this card when you pass to draw 1
 * action card and gain 1 command token."
 *
 * To be a `play` effect: the pass entry names the card in `uses` with `choices.ordinianPool` ('tactic', 'fleet' or
 * 'strategy'), and that pool has one more token. The action card is unknown and entered with `gains`.
 *
 */
import { tokens } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import { requireControlBy } from '../../helpers/cardPlay';
import type { ComponentEffect } from '../../types';



export const id = 'legendary:ordinian';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{
    key: 'ordinianPool', kind: 'option', label: { ru: 'Куда жетон', en: 'Pool' }, options: () => ['tactic', 'fleet', 'strategy'],
    names: {
      tactic: { ru: 'Тактический резерв', en: 'Tactic pool' }, fleet: { ru: 'Резерв флота', en: 'Fleet pool' }, strategy: { ru: 'Стратегический резерв', en: 'Strategy pool' },
    },
  }],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    requireControlBy(ctx, 'ordinian');
    // The action card drawn is unknown, entered with the gains of the entry.
    const pool = ctx.choices.ordinianPool;
    return pool === 'tactic' || pool === 'fleet' || pool === 'strategy' ? [tokens(ctx.holder, { [pool]: 1 })] : [];
  },
};
