/**
 * Mageon Implants (Yssaril, faction technology): "ACTION: Exhaust this card to look at another player's hand of
 * action cards. Choose 1 of those cards and add it to your hand."
 *
 * Decided: a `play`: the component action exhausts it (its text, the replay does that) and the action card of the
 * choice `card` moves from the hand of the player of the choice `from` to the player's. Any player, not only a
 * neighbour, so no transaction is made. A card not in that hand is warned of (`componentUnresolved`) and not moved.
 */
import { card } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';
import { componentById } from '../../../components';
import componentUnresolved from '../../../rules/codes/componentUnresolved';
import { violation } from '../../../rules/registry';
import { handOf } from '../../helpers/choices';

export const id = 'technology:mi';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  choose: [
    { key: 'from', kind: 'player', label: { ru: 'Чья рука', en: 'Whose hand' } },
    {
      key: 'card', kind: 'component', label: { ru: 'Карта из руки', en: 'Card from the hand' }, when: chosen => chosen.from !== undefined,
      options: ctx => handOf(ctx, String(ctx.chosen.from)),
    },
  ],
  holder: 'self',
  play: ctx => {
    const { from: whose, card: chosen } = ctx.choices;
    const from = whose === undefined ? undefined : ctx.playerOf(String(whose));
    if (!ctx.held || from === undefined || chosen === undefined || from === ctx.holder) return [];
    if (!ctx.of(from).holds(String(chosen))) {
      ctx.warn(violation(componentUnresolved.code, { id, name: componentById(ctx.pack, id)?.name ?? id, reason: 'the card is not in that hand' }));
      return [];
    }
    return [card.lose(from, String(chosen)), card.gain(ctx.holder, String(chosen))];
  },
};
