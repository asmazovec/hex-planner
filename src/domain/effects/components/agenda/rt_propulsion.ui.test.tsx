import { test } from 'vitest';
import { expectShownStanding, expectShownWaived, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { CARD } from '../../../strategy';
import type { AnyWarningCode, Entry } from '../../../types';
import { adjust, bench, quote, secondary } from '../kit';
import { id } from './rt_propulsion';

uiBench();

/** Declared in pass 2 as `src/domain/rules/codes/prerequisiteMissing.ts`; named by its string until then. */
const CODE = 'prerequisiteMissing' as AnyWarningCode;

/** The agenda resolved in the agenda phase of round 1, with what was elected. */
const resolved = (elect: string): Entry => ({ ...adjust({}, 'agenda'), gains: [id], choices: { elect } } as Entry);

/** Round 2 researches a technology one blue symbol short, with the law on Home One, which I control. */
const table = () => {
  const research = secondary(CARD.technology, { researched: ['technology:fl'], payment: { planets: ['h1', 'h2'], tradeGoods: 0 } });
  return { research, ...bench({ faction: 'sol', start: { technologies: ['technology:amd'] }, rounds: [[resolved('h1')], [research]] }) };
};

// "When the owner of this planet researches technology, they may exhaust this card to ignore 1 blue prerequisite."
// Checks: the research shows the missing prerequisite standing; the player chooses Research Team: Propulsion in «Used», and the
// warning then reads as allowed by the card.
// Why the check is redundant here: the owner of the elected planet ignores one blue prerequisite by exhausting it,
// and the one missing is blue.
test.fails('agenda:rt_propulsion chosen in «Used» lets the research go one blue prerequisite short', async () => {
  const t = table();
  quote(t.pack, id, 'they may exhaust this card to ignore 1 blue prerequisite');
  showUses(t, t.research);
  expectShownStanding(CODE);
  await use('Research Team: Propulsion');
  expectShownWaived(CODE, 'Research Team: Propulsion');
});
