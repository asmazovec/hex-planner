/**
 * The Quantumcore (relic, Thunder's Edge): "When you gain this card, gain your breakthrough. You have SYNERGY for all
 * technology types."
 *
 * Decided: a mix. Gaining the relic (an entry's `gains`) also gives the player their faction's breakthrough, which the
 * holdings count; that needs a hook on gaining a component, which the contract does not have yet. SYNERGY (TE rules,
 * Synergy 2) lets a technology of one colour stand for another when researching; the replay checks no prerequisites
 * yet, so that half has nothing to change until it does.
 */
import type { Ability } from '../../../../game/abilities/types';
import { card } from '../../../../game/abilities/emit';
import { breakthroughOf } from '../../breakthrough';

export const id = 'relic:quantumcore';

/** The hooks written for the kernel: they read the board and return events. */
export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'anyone',
  on: {
    // Through the one gain of a breakthrough: its own "when you gain this card" runs too (Stellar Genesis gives Avernus).
    gained: ctx => {
      const breakthrough = breakthroughOf(ctx.pack, ctx.my.faction);
      return breakthrough === undefined || ctx.my.holds(breakthrough) ? undefined : [card.gain(ctx.holder, breakthrough)];
    },
  },
};
