/**
 * Ionian Fuel Refinery (Tempesta, Thunder's Edge): "You may exhaust this card after you activate a system to apply +1
 * to the move value of 1 of your ships during this tactical action."
 *
 * Decided: `play` with a waiver of `speedShort` for the tactical entry that names the card in `uses`, narrowed by
 * `oneShipShort` to one ship (a single ship of its type in the moves) short by one system, and to the first such
 * warning of the entry. Not a `modify` of `speed`: a modify is passive and changes every ship of the faction, the card
 * one ship once. The `play` checks LRR 53.3 with 53.2: the card lies in the play area of whoever controls Tempesta.
 */
import { componentById } from '../../../components';
import { violation } from '../../../rules/registry';
import type { ComponentEffect } from '../../types';
import type { Hooked } from '../../../../game/abilities/types';

export const id = 'legendary:tempesta';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  play: turn => {
    if (turn.state.control.tempesta !== 'me') turn.warnings.push(violation('componentNotHeld', { id, name: componentById(turn.pack, id)?.name ?? id }));
  },
};

export const ability: Hooked = {
  holder: 'self',
  permit: [{
    code: 'speedShort',
    rule: 'apply +1 to the move value of 1 of your ships during this tactical action',
    when: (warning, ctx) => ctx.oneShipShort(warning, 1),
  }],
};
