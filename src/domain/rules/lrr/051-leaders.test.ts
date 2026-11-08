/** LRR 51 Leaders. Source: tirules2 rules-reference/leaders.md. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../../data/loadPack';
import { factionSheet } from '../../factionSheet';
import type { ExpansionId } from '../../types';

const packs: ExpansionId[][] = [['pok'], ['pok', 'te']];
const typesOf = (faction: string, expansions: ExpansionId[]) =>
  factionSheet(loadPack(expansions).factions[faction], expansions).leaders.map(l => l.type);

describe('LRR 51 Leaders', () => {
  test('51.1: every faction except the Nomad has one agent, one commander and one hero', () => {
    for (const expansions of packs) {
      const pack = loadPack(expansions);
      for (const faction of Object.values(pack.factions)) {
        if (!faction.sheet || faction.id === 'nomad') continue;
        const types = factionSheet(faction, expansions).leaders.map(l => l.type);
        expect([faction.id, ...types]).toEqual([faction.id, 'agent', 'commander', 'hero']);
      }
    }
  });

  test('51.1: a Thunder\'s Edge leader that replaces one leaves still exactly one of its type', () => {
    expect(typesOf('jolnar', ['pok', 'te'])).toEqual(['agent', 'commander', 'hero']);
  });

  test('51.1.1: the Nomad have two more agents, five leaders in all', () => {
    expect(typesOf('nomad', ['pok'])).toEqual(['agent', 'agent', 'agent', 'commander', 'hero']);
  });

  test('51.2: the leaders are on the sheet only with Prophecy of Kings, even with Thunder\'s Edge', () => {
    expect(typesOf('arborec', ['te'])).toEqual([]);
  });

  test.todo('51.2.1: each leader goes in the slot of its type, hash marks up — not modelled: leader sides are not tracked');
  test.todo('51.2.2: the two extra Nomad agents go in the play area readied — not modelled: leader state is not tracked');
  test.todo('51.3: agents — heading only');
  test.todo('51.4: an agent starts readied, exhausts on use and readies in the status phase — not modelled: leader state is not tracked');
  test.todo('51.5: commanders — heading only');
  test.todo('51.6: a commander must be unlocked by its condition — not modelled: unlocks are not tracked');
  test.todo('51.6.1: every commander has its own unlock condition — not modelled: unlocks are not tracked');
  test.todo('51.6.2: a commander whose condition is met flips to its unlocked side — not modelled: unlocks are not tracked');
  test.todo('51.6.3: unlock conditions are not checked in the middle of resolving an effect — not modelled: unlocks are not tracked');
  test.todo('51.6.4: an unlocked commander never flips back — not modelled: unlocks are not tracked');
  test.todo('51.7: a commander cannot be exhausted — not modelled: leader state is not tracked');
  test.todo('51.8: the Alliance note shares a commander\'s ability — not modelled: promissory notes are not tracked');
  test.todo('51.8.1: the owner keeps using a commander shared by Alliance — not modelled: promissory notes are not tracked');
  test.todo('51.9: heroes — heading only');
  test.todo('51.10: a hero must be unlocked to be used — not modelled: unlocks are not tracked');
  test.todo('51.10.1: a hero unlocks with three scored objectives of any kind — not modelled: objectives are not tracked');
  test.todo('51.10.2: victory points do not count toward a hero\'s unlock — not modelled: objectives are not tracked');
  test.todo('51.10.3: a hero whose condition is met flips to its unlocked side — not modelled: unlocks are not tracked');
  test.todo('51.10.4: an unlocked hero never flips back — not modelled: unlocks are not tracked');
  test.todo('51.11: a hero cannot be exhausted — not modelled: leader state is not tracked');
  test.todo('51.12: a hero is purged once its ability is resolved — not modelled: leader state is not tracked');
  test.todo('51.12.1: the Titans hero attaches to Elysium instead of being purged — not modelled: leader state is not tracked');
  test.todo('51 note 1: a commander does not apply to the effect that unlocked it — not modelled: unlocks are not tracked');
  test.todo('51 note 2: a commander may unlock between two abilities of one timing window — not modelled: unlocks are not tracked');
  test.todo('51 note 3: notes on single leaders are on the faction pages — not modelled: leader abilities are shown, not applied');
});
