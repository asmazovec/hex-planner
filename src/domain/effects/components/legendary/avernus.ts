/**
 * The Nucleus (Avernus, Thunder's Edge): "ACTION: Exhaust this card to use the Embers of Muaat's **STAR FORGE** faction
 * ability without spending a command token."
 *
 * Decided: `play` of its component action with the choices `unit` (`destroyer`, or `fighter` for two) and `system`:
 * the units are placed in that system and no strategy token is spent (the play spends none; the replay only exhausts
 * the card). A system without a war sun of the player is warned of (`componentCondition`; Muaat notes, Avernus 3:
 * another player may use it only with a war sun on the board) and the units are placed all the same, as are
 * units beyond the reinforcements (`reinforcementsOut`). It also checks LRR 53.3 with 53.2: the card lies in the play
 * area of whoever controls Avernus.
 */
import { componentById } from '../../../components';
import { unitLimitWarnings } from '../../../replay/production';
import componentCondition from '../../../rules/codes/componentCondition';
import { violation } from '../../../rules/registry';
import type { UnitCounts } from '../../../types';
import type { ComponentEffect } from '../../types';

export const id = 'legendary:avernus';

export const effect: ComponentEffect = {
  tier: 'play',
  rule: id,
  choose: [
    {
      key: 'unit', kind: 'unit', label: { ru: 'Разместить', en: 'Place' },
      options: () => ['destroyer', 'fighter'],
    },
    { key: 'system', kind: 'system', label: { ru: 'В системе', en: 'In the system' } },
  ],
  play: turn => {
    const { state, choices, pack, warnings } = turn;
    const name = componentById(pack, id)?.name ?? id;
    if (state.control.avernus !== 'me') warnings.push(violation('componentNotHeld', { id, name }));
    const unit = choices.unit === 'fighter' ? 'fighter' : choices.unit === 'destroyer' ? 'destroyer' : undefined;
    const system = typeof choices.system === 'string' ? choices.system : undefined;
    if (unit === undefined || system === undefined) return;
    const placed: UnitCounts = { [unit]: unit === 'fighter' ? 2 : 1 };
    if ((state.systems[system]?.warsun ?? 0) < 1) {
      warnings.push(violation(componentCondition.code, { id, name, condition: 'a war sun of yours in the system' }));
    }
    warnings.push(...unitLimitWarnings(state, placed, pack, 'component'));
    const here = (state.systems[system] ??= {});
    here[unit] = (here[unit] ?? 0) + (placed[unit] ?? 0);
  },
};
