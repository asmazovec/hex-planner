/** LRR 59 Nebula. Source: tirules2 rules-reference/nebula.md. */
import { describe, expect, test } from 'vitest';
import { routeReach } from '../../project';
import { codesOf, FAR, FARTHER, HOME, NEAR, rulesGame, rulesPack, tactical, TARGET } from '../kit';

const pack = rulesPack();
const row = (tiles: Partial<Record<string, string>> = {}) =>
  ({ [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty', ...tiles }) as Record<string, string>;

/** A cruiser flies from `from` along `via` into the active system. */
function flight(from: string, active: string, via: string[], map = row(), units = { cruiser: 1 }) {
  const action = tactical(active, { moves: [{ from, units, via }] });
  const game = rulesGame({ map, units: { [from]: units }, entries: [action] });
  return { game, codes: codesOf(game, pack, action) };
}

describe('LRR 59 Nebula', () => {
  test('59.1: a ship can move into a nebula when it is the active system', () => {
    expect(flight(HOME, NEAR, [], row({ [NEAR]: 'r-nebula' })).codes).not.toContain('routeBlocked');
  });

  test('59.1: the reach shown while drawing offers a nebula only as the active system', () => {
    const game = rulesGame({ map: row({ [NEAR]: 'r-nebula' }) });
    expect(routeReach(game, [HOME], 2, NEAR, pack).has(NEAR)).toBe(true);
    expect(routeReach(game, [HOME], 2, FARTHER, pack).has(NEAR)).toBe(false);
  });

  test('59.1.1: a ship cannot move through a nebula', () => {
    expect(flight(HOME, TARGET, [NEAR], row({ [NEAR]: 'r-nebula' })).codes).toContain('routeBlocked');
  });

  test('59.1.1: the reach shown while drawing does not go past a nebula', () => {
    const game = rulesGame({ map: row({ [NEAR]: 'r-nebula' }) });
    expect(routeReach(game, [HOME], 2, TARGET, pack).has(TARGET)).toBe(false);
  });

  test('59.2: a ship that begins its movement in a nebula has a move value of 1', () => {
    expect(flight(HOME, NEAR, [], row({ [HOME]: 'r-nebula' })).codes).not.toContain('speedShort');
    expect(flight(HOME, TARGET, [NEAR], row({ [HOME]: 'r-nebula' })).codes).toContain('speedShort');
  });

  test('59.2: a slow ship beginning in a nebula still has move 1', () => {
    expect(flight(HOME, NEAR, [], row({ [HOME]: 'r-nebula' }), { carrier: 1 } as never).codes).not.toContain('speedShort');
  });

  test('59.2.1: other effects can raise the move of 1: a gravity rift on the way adds its 1', () => {
    expect(flight(HOME, TARGET, [NEAR], row({ [HOME]: 'r-nebula', [NEAR]: 'r-rift' })).codes).not.toContain('speedShort');
  });

  test.todo('59.3: the defender in a nebula applies +1 to space combat rolls — not modelled: no dice');
  test.todo('59 note 1: nobody retreats into a nebula, as it is not the active system — not modelled: no retreat');
  test.todo('59 note 2: the defender\'s +1 does not touch barrage, bombardment or space cannon — not modelled: no dice');
  test.todo('59 note 3: the defender\'s +1 does nothing in ground combat — not modelled: no dice');
  test.todo('59 note 4: a future change puts anomaly movement limits on all units — not modelled: a future rule');
  test.todo('59 note 5: a future change lets ships enter a nebula that is not the active system — not modelled: a future rule');
});
