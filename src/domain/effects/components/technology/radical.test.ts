import { describe, expect, test } from 'vitest';
import { bench, effect, endOf, statusTokens, quote } from '../kit';
import { id } from './radical';

describe('technology:radical Radical Advancement', () => {
  // "At the start of the status phase, you may replace one of your non-unit upgrade technologies with a technology of
  //  the same color that has exactly 1 more prerequisite."
  // Checks: the technology is a reminder of the status phase's block.
  // Why the check is NOT redundant here: the plan checks neither colours nor prerequisites of technologies, so there
  // is no rule of research to lift; the swap is entered as a spend and a gain of the status entry.
  test('technology:radical is a hint at the status phase', () => {
    const { pack } = bench({ faction: 'deepwrought', expansions: ['pok', 'te'], start: { technologies: [id] } });
    quote(pack, id, 'a technology of the same color that has exactly 1 more prerequisite');
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toEqual(['status']);
  });

  // Checks: the swap entered by hand in the status entry is counted: Gravity Drive (blue, one prerequisite) goes and
  // Fleet Logistics (blue, two) comes, through the common spends and gains.
  // Why the check is NOT redundant here: the holdings follow what is entered; the technology adds no rule to it.
  test('technology:radical the swap entered as a spend and a gain of the status entry is counted', () => {
    const swap = { ...statusTokens(0, 0, 0), spends: ['technology:gd'], gains: ['technology:fl'] };
    const table = bench({ faction: 'deepwrought', expansions: ['pok', 'te'], start: { technologies: [id, 'technology:gd'] }, entries: [swap] });
    const end = endOf(table);
    expect(end.holdings.technologies).not.toContain('technology:gd');
    expect(end.holdings.technologies).toContain('technology:fl');
  });
});
