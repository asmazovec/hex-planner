/**
 * 4X41D "Hyperion" VI (Ordinian, legendary planet, Thunder's Edge): "You may exhaust this card when you pass to draw 1
 * action card and gain 1 command token."
 *
 * To be a `play` effect: the pass entry names the card in `uses` with `choices.ordinianPool` ('tactic', 'fleet' or
 * 'strategy'), and that pool has one more token. The action card is unknown and entered with `gains`.
 *
 */
import { componentById } from '../../../components';
import { violation } from '../../../rules/registry';
import type { ComponentEffect, EffectTurn } from '../../types';

/** The card lies in the play area of whoever controls its planet (53.2, 53.3); used without it, it is warned of. */
const requireControl = (turn: EffectTurn, planet: string): void => {
  if (turn.state.control[planet] !== 'me') turn.warnings.push(violation('componentNotHeld', { id: turn.id, name: componentById(turn.pack, turn.id)?.name ?? turn.id }));
};


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
  play: turn => {
    requireControl(turn, 'ordinian');
    // The action card drawn is unknown, entered with the gains of the entry.
    const pool = turn.choices.ordinianPool;
    if (pool === 'tactic' || pool === 'fleet' || pool === 'strategy') turn.state[pool] += 1;
  },
};
