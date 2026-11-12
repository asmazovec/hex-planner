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
import type { ComponentEffect } from '../../types';

export const id = 'agenda:schematics';

export const effect: ComponentEffect = {
  tier: 'passive',
  rule: id,
  waive: [{
    code: prerequisitesMissing.code,
    rule: 'If any player owns a war sun technology, all players may ignore all prerequisites on war sun technologies.',
    when: (warning, ctx) => {
      if (techOf(ctx.pack, String(warning.params.id))?.upgrade !== 'warsun') return false;
      const owner = ctx.entry?.owner;
      // The owner's holdings before the entry: researching War Sun itself does not make the prerequisites ignored ("from then on").
      const all = [ctx.before.holdings, ...(owner === undefined ? [] : [ctx.shared.holdings]), ...Object.entries(ctx.shared.rivals ?? {}).filter(([who]) => who !== owner).map(([, rival]) => rival.holdings)];
      return all.some(holdings => holdings.technologies.some(tech => techOf(ctx.pack, tech)?.upgrade === 'warsun'));
    },
  }],
};
