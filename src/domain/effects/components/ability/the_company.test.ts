import { describe, expect, test } from 'vitest';
import { startForFaction } from '../../../holdings';
import { bench, effect, quote } from '../kit';
import { id } from './the_company';

describe('ability:the_company The Company', () => {
  // "During setup, take the 2 additional Nomad faction agents and place them next to your faction sheet; you have 3 agents"
  // Checks: a Nomad start holds three agents, all unlocked.
  // Why nothing is lifted here: no rule of the plan limits the agents; the start gives a faction every agent of its
  // sheet (LRR 51.4), and the Nomad's sheet lists three.
  test('ability:the_company the Nomad begin with three agents unlocked', () => {
    const { pack } = bench({ faction: 'nomad', expansions: ['pok'] });
    quote(pack, id, 'you have 3 agents');
    expect(startForFaction({}, '', 'nomad', pack).leaders).toEqual({
      'leader:nomadagentmercer': 'unlocked', 'leader:nomadagentthundarian': 'unlocked', 'leader:nomadagentartuno': 'unlocked',
    });
  });

  // Checks: another faction begins with its one agent only.
  test('ability:the_company another faction begins with one agent', () => {
    const { pack } = bench({ faction: 'nomad', expansions: ['pok'] });
    expect(Object.keys(startForFaction({}, '', 'naaz', pack).leaders ?? {})).toEqual(['leader:naazagent']);
  });

  test('ability:the_company is a hint with no step', () => {
    const { pack } = bench({ faction: 'nomad', expansions: ['pok'] });
    expect(effect(pack, id).tier).toBe('hint');
    expect(effect(pack, id).hintAt).toBeUndefined();
  });
});
