/**
 * Publicize Weapon Schematics (agenda): "For: If any player owns a war sun technology, all players may ignore all
 * prerequisites on war sun technologies. All war suns lose SUSTAIN DAMAGE. Against: Each player that owns a war sun
 * technology discards all of their action cards."
 *
 * A waiver of a check the plan does not have yet: technology prerequisites (90.8). While any player owns a war sun
 * technology, every player ignores the prerequisites of war sun technologies. The loss of SUSTAIN DAMAGE is combat
 * and only a reminder.
 */
import prerequisitesMissing from '../../../rules/codes/prerequisitesMissing';
import { techOf } from '../../../replay/research';
import type { Ability } from '../../../../game/abilities/types';

export const id = 'agenda:schematics';

export const ability: Ability = {
  holder: 'self',
  tier: 'passive',
  rule: id,
  permit: [{
    code: prerequisitesMissing.code,
    rule: 'If any player owns a war sun technology, all players may ignore all prerequisites on war sun technologies.',
    when: (warning, ctx) => {
      if (techOf(ctx.pack, String(warning.params.id))?.upgrade !== 'warsun') return false;
      // The holdings before the turn: researching War Sun itself does not make the prerequisites ignored ("from then on").
      return ctx.table.players.some(player => ctx.prior.of(player.id).cards('technology').some(card => techOf(ctx.pack, card.id)?.upgrade === 'warsun'));
    },
  }],
};
