import { test } from 'vitest';
import { expectShownStanding, expectShownWaived, showUses, uiBench, use } from '../../../../ui/testing/effects';
import { CARD } from '../../../strategy';
import type { Entry } from '../../../types';
import { adjust, bench, quote, secondary } from '../kit';
import prerequisitesMissing from '../../../rules/codes/prerequisitesMissing';
import { id } from './rt_biotic';

uiBench();

/** Declared in pass 2 as `src/domain/rules/codes/prerequisiteMissing.ts`; named by its string until then. */
const CODE = prerequisitesMissing.code;

/** The agenda resolved in the agenda phase of round 1, with what was elected. */
const resolved = (elect: string): Entry => ({ ...adjust({}, 'agenda'), gains: [id], choices: { elect } } as Entry);

/** Round 2 researches a technology one green symbol short, with the law on Home One, which I control. */
const table = () => {
  const research = secondary(CARD.technology, { researched: ['technology:hm'], payment: { planets: ['h1', 'h2'], tradeGoods: 0 } });
  return { research, ...bench({ faction: 'sol', start: { technologies: ['technology:nm'] }, rounds: [[resolved('h1')], [research]] }) };
};

// "When the owner of this planet researches technology, they may exhaust this card to ignore 1 green prerequisite."
// Checks: the research shows the missing prerequisite standing; the player chooses Research Team: Biotic in «Used», and the
// warning then reads as allowed by the card.
// Why the check is redundant here: the owner of the elected planet ignores one green prerequisite by exhausting it,
// and the one missing is green.
test('agenda:rt_biotic chosen in «Used» lets the research go one green prerequisite short', async () => {
  const t = table();
  quote(t.pack, id, 'they may exhaust this card to ignore 1 green prerequisite');
  showUses(t, t.research);
  expectShownStanding(CODE);
  await use('Research Team: Biotic');
  expectShownWaived(CODE, 'Research Team: Biotic');
});
