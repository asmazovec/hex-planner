/**
 * Spy Net (Yssaril, promissory note): "At the start of your turn: Look at the Yssaril player's hand of action
 * cards. Choose 1 of those cards and add it to your hand. Then, return this card to the Yssaril player."
 *
 * Decided: a `play` named in `uses`: the action card of the choice `card` moves from the hand of the Yssaril player
 * (the address of the note, `promissory:spynet@<player>`) to the hand of the player. No transaction is made. A card
 * not in that hand is warned of (`componentUnresolved`) and not moved. The note goes back by itself (69.3).
 */
import { componentById, noteAddress } from '../../../components';
import componentUnresolved from '../../../rules/codes/componentUnresolved';
import { violation } from '../../../rules/registry';
import { card } from '../../../../game/abilities/emit';
import type { Hooked } from '../../../../game/abilities/types';
import type { ComponentEffect } from '../../types';

export const id = 'promissory:spynet';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [{
    key: 'card', kind: 'component', label: { ru: 'Карта из руки', en: 'Card from the hand' },
    options: ({ entry, shared }) => {
      const note = (entry.uses ?? []).find(used => used.startsWith(id));
      const owner = note === undefined ? undefined : noteAddress(note);
      const hand = owner === undefined ? [] : (owner === 'me' ? shared : shared.rivals?.[owner])?.holdings.hand ?? [];
      return [...hand];
    },
  }],
};

export const ability: Hooked = {
  holder: 'self',
  play: ctx => {
    const chosen = ctx.choices.card;
    const key = noteAddress(ctx.id);
    const owner = key === undefined ? undefined : ctx.playerOf(key);
    if (!ctx.held || chosen === undefined || owner === undefined || owner === ctx.holder) return [];
    if (!ctx.of(owner).holds(String(chosen))) {
      ctx.warn(violation(componentUnresolved.code, { id: ctx.id, name: componentById(ctx.pack, id)?.name ?? id, reason: 'the card is not in that hand' }));
      return [];
    }
    return [card.lose(owner, String(chosen)), card.gain(ctx.holder, String(chosen))];
  },
};
