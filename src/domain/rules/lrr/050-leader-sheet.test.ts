/** LRR 50 Leader Sheet. Source: tirules2 rules-reference/leader-sheet.md. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../../data/loadPack';
import { factionSheet } from '../../factionSheet';

const pack = loadPack(['pok']);

describe('LRR 50 Leader Sheet', () => {
  test('50.1: the leader slots hold agent, commander and hero, in that order', () => {
    const sheet = factionSheet(pack.factions.arborec, ['pok']);
    expect(sheet.leaders.map(l => l.type)).toEqual(['agent', 'commander', 'hero']);
  });

  test.todo('50.1.1: the sides with one, two and three hash marks begin face up — not modelled: leader sides are not tracked');

  test('50.2: the sheet has a slot for the faction\'s mech card', () => {
    expect(factionSheet(pack.factions.arborec, ['pok']).mechs).toHaveLength(1);
  });

  test('50.2: without Prophecy of Kings there is no leader sheet: no leaders and no mech', () => {
    const sheet = factionSheet(pack.factions.arborec, []);
    expect(sheet.leaders).toEqual([]);
    expect(sheet.mechs).toEqual([]);
  });

  test.todo('50.3: the quick reference may be tucked under the faction sheet — not modelled: physical component only');
});
