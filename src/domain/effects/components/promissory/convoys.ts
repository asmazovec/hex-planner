/**
 * Trade Convoys (Emirates of Hacan, promissory note): "ACTION: Place this card faceup in your play area. While this
 * card is in your play area, you may negotiate transactions with players who are not your neighbor. If you activate a
 * system that contains 1 or more of the Hacan player's units, return this card to the Hacan player."
 *
 * Decided: `play` puts the note in the play area (`Shelf.inPlay`); from then on, whatever the round, it waives
 * `notNeighbor` (94.1) in every entry of its holder, because a note in the play area is asked by the waivers. In hand it
 * does nothing (Hacan note 4). When its holder activates a system holding units of the Hacan, `onActivate` returns it:
 * it leaves the holder's holdings and the play area and goes back to the Hacan. One transaction per player per turn
 * still stands (note 3).
 */
import { noteAddress } from '../../../components';
import { card } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'promissory:convoys';

/** Returning to the Hacan player is a hook of the kernel, and so is the play (the note lying in the play area). */
export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'self',
  // Played, the note stays held and lies in the play area: nothing else on the board changes.
  play: ctx => (ctx.my.card(ctx.id) === 'inPlay' ? [] : [{ type: 'CardLaidInPlay', player: ctx.holder, card: ctx.id }]),
  permit: [{ code: 'notNeighbor', rule: 'While this card is in your play area, you may negotiate transactions with players who are not your neighbor.' }],
  on: {
    onActivate: (ctx, activation) => {
      const hacanKey = noteAddress(ctx.id);
      const hacan = hacanKey === undefined ? undefined : ctx.playerOf(hacanKey);
      if (hacan === undefined || hacan === ctx.holder || ctx.my.card(ctx.id) !== 'inPlay') return;
      if (!ctx.of(hacan).standsIn(activation.systemId, activation.planets)) return;
      return [card.lose(ctx.holder, ctx.id), card.gain(hacan, ctx.id)];
    },
  },
};
