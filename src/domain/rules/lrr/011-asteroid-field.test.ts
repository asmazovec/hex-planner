/** LRR 11 Asteroid Field. Source: tirules2 rules-reference/asteroid-field.md. A cruiser I moves 2. */
import { describe, expect, test } from 'vitest';
import { codesOf, FAR, FARTHER, HOME, NEAR, rulesGame, rulesPack, tactical, TARGET } from '../kit';

const pack = rulesPack(p => {
  // Like tile 79: an asteroid field holding an alpha wormhole.
  p.tiles['r-asteroid-alpha'] = { id: 'r-asteroid-alpha', number: 'r-asteroid-alpha', planetIds: [], kind: 'system', wormholes: ['alpha'], anomaly: 'asteroid' };
});
const row = (tiles: Partial<Record<string, string>> = {}) =>
  ({ [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty', ...tiles }) as Record<string, string>;

/** A cruiser flies from `from` along `via` into the active system. */
function flight(from: string, active: string, via: string[], map = row(), units = { cruiser: 1 }) {
  const action = tactical(active, { moves: [{ from, units, via }] });
  const game = rulesGame({ map, units: { [from]: units }, entries: [action] });
  return { game, codes: codesOf(game, pack, action) };
}

describe('LRR 11 Asteroid Field', () => {
  test('11.1: a ship cannot move into an asteroid field', () => {
    expect(flight(HOME, NEAR, [], row({ [NEAR]: 'r-asteroid' })).codes).toContain('routeBlocked');
  });

  test('11.1: a ship cannot move through an asteroid field', () => {
    expect(flight(HOME, TARGET, [NEAR], row({ [NEAR]: 'r-asteroid' })).codes).toContain('routeBlocked');
  });

  test('11.1: a wormhole does not open an asteroid field: a ship cannot enter it through its wormhole either', () => {
    const map = row({ [HOME]: 'r-alpha', [FARTHER]: 'r-asteroid-alpha' });
    expect(flight(HOME, FARTHER, [], map).codes).toContain('routeBlocked');
  });

  test.todo('11 note 1: Antimass Deflectors let ships move through asteroid fields — not modelled: technologies are not counted in routes');
  test.todo('11 note 2: a future change puts the movement limits of anomalies on all units — not modelled: an announcement, no rule yet');
});
