/**
 * Mirage (frontier exploration): "Place the Mirage planet token in this system. Gain the Mirage planet card and ready
 * it. Then, purge this card."
 *
 * To be a `play` effect: the entry that explores the frontier token names the card in `uses`, and the player gains
 * control of the planet Mirage (`control.mirage`), readied, so its legendary card Mirage Flight Academy is in force
 * for them (53.2). The token itself (the planet standing in the active system) is not modelled: the systems of the
 * board take their planets from their tiles.
 */
import { planet } from '../../../../game/abilities/emit';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'exploration:mirage';

export const ability: Ability = {
  tier: 'play',
  rule: id,
  holder: 'self',
  // The planet card comes with the exploration, readied; the legendary card follows with control (53.2).
  play: ctx => [planet.gain(ctx.holder, 'mirage'), planet.ready(ctx.holder, 'mirage')],
};
