/** LRR 86 Supernova. Source: tirules2 rules-reference/supernova.md. */
import { describe, expect, test } from 'vitest';
import { routeReach } from '../../../testing/old/domain/project';
import { FAR, HOME, NEAR, rulesGame, rulesPack, TARGET } from '../kit';
import { flight, row } from './kit-83-101';

const pack = rulesPack();

describe('LRR 86 Supernova', () => {
  test('86.1: a ship cannot move into or through a supernova', () => {
    expect(flight(pack, HOME, NEAR, [], row({ [NEAR]: 'r-supernova' }))).toContain('routeBlocked');
    expect(flight(pack, HOME, TARGET, [NEAR], row({ [NEAR]: 'r-supernova' }))).toContain('routeBlocked');
  });

  test('86.1: the reach of a ship stops before a supernova and does not pass it', () => {
    const reach = routeReach(rulesGame({ map: row({ [NEAR]: 'r-supernova' }) }), [HOME], 2, FAR, pack);
    expect(reach.has(NEAR)).toBe(false);
    expect(reach.has(TARGET)).toBe(false);
  });

  test('86 note 1: a ship that is in a supernova may move out of it', () => {
    expect(flight(pack, NEAR, TARGET, [], row({ [NEAR]: 'r-supernova' }))).toEqual([]);
  });

  test.todo('86 note 2: anomaly limits will apply to all units — not modelled: a future rule change, not in force');
});
