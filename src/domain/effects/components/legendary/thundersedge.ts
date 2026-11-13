/**
 * Jupiter Brain (Thunder's Edge, Thunder's Edge): "Gain your breakthrough when you gain this card if you do not
 * already have it. You may exhaust this card at the end of your turn to perform another action."
 *
 * Decided: `passive` (a legendary planet is in force while its player controls it). The hook `onGainControl` runs when
 * an entry takes Thunder's Edge: the player gets their breakthrough, ready, unless they hold it already (so an
 * exhausted one is not readied). A game that begins with the planet controlled gives nothing: the start holdings are
 * marked by hand. The other action is a reminder beside the exhaustion the replay makes; the plan counts no actions of a
 * turn, so nothing is waived. The `play` checks only LRR 53.3 with 53.2: the card lies in the play area of whoever
 * controls the planet, and `holds` does not know that for a legendary card.
 */
import { componentById } from '../../../components';
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';
import type { Hooked } from '../../../../game/abilities/types';
import { card } from '../../../../game/abilities/emit';
import { breakthroughOf } from '../../breakthrough';

export const id = 'legendary:thundersedge';
const planet = 'thundersedge';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  play: turn => {
    if (turn.state.control[planet] !== 'me') turn.warnings.push(violation('componentNotHeld', { id, name: componentById(turn.pack, id)?.name ?? id }));
  },
};

/** The hooks written for the kernel: they read the board and return events. */
export const ability: Hooked = {
  holder: 'anyone',
  on: {
    onGainControl: (ctx, got) => {
      const breakthrough = breakthroughOf(ctx.pack, ctx.my.faction);
      return got.planetId !== planet || breakthrough === undefined || ctx.my.holds(breakthrough) ? undefined : [card.gain(ctx.holder, breakthrough)];
    },
  },
};
