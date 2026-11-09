/** LRR 101 Wormholes. Source: tirules2 rules-reference/wormholes.md. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../../data/loadPack';
import { routeDistances, routeReach, routeSteps } from '../../project';
import { codesOf, FAR, FARTHER, HOME, NEAR, rulesGame, rulesPack, tactical, TARGET } from '../kit';
import { row } from './kit-83-101';

const pok = loadPack(['pok']);
const pack = rulesPack(p => {
  Object.assign(p.tiles, pok.tiles);
  Object.assign(p.planets, pok.planets);
  p.tiles['r-ab'] = { id: 'r-ab', number: 'r-ab', planetIds: [], kind: 'system', wormholes: ['alpha', 'beta'] };
});

describe('LRR 101 Wormholes', () => {
  test('101.1: alpha and beta wormholes do not join each other', () => {
    const game = rulesGame({ map: row({ [HOME]: 'r-alpha', [FARTHER]: 'r-beta' }) });
    expect(routeDistances(game, HOME, pack).get(FARTHER)).toBe(4);
  });

  test('101.1: beta joins beta as alpha joins alpha', () => {
    expect(routeSteps(rulesGame({ map: row({ [HOME]: 'r-beta', [FARTHER]: 'r-beta' }) }), [HOME, FARTHER], pack)).toBe(1);
  });

  test.todo('101.2: with a PDS upgrade Space Cannon fires through wormholes — not modelled: Space Cannon is not resolved');
  test.todo('101.3: players are neighbours and trade through wormholes — not modelled: neighbours and transactions are not computed');

  test('101.4: delta and gamma wormholes follow the same rules: matching ones join their systems', () => {
    expect(routeSteps(rulesGame({ map: row({ [HOME]: '17', [FARTHER]: '51' }) }), [HOME, FARTHER], pack)).toBe(1);
  });

  test('101.4.1: the delta wormholes are on the Creuss Gate and the Creuss home system', () => {
    expect(pok.tiles['17']?.wormholes).toEqual(['delta']);
    expect(pok.tiles['51']?.wormholes).toEqual(['delta']);
  });

  test('101.4.2: the gamma wormholes are on the wormhole nexus', () => {
    expect(['82A', '82B'].every(id => pok.tiles[id]?.wormholes.includes('gamma'))).toBe(true);
  });

  test.todo('101.4.2: gamma wormholes found in exploration — not modelled: exploration tokens are not tracked');

  test('101 note 1: a system with a wormhole is no anomaly: ships move through it freely', () => {
    expect(pok.tiles['39']?.anomaly).toBeUndefined();
    const action = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
    const game = rulesGame({ map: row({ [NEAR]: 'r-alpha' }), units: { [HOME]: { cruiser: 1 } }, entries: [action] });
    expect(codesOf(game, pack, action)).toEqual([]);
  });

  test('101 note 2: several wormholes of one type are separate: three alpha systems are each one step from the others', () => {
    const game = rulesGame({ map: row({ [HOME]: 'r-alpha', [TARGET]: 'r-alpha', [FARTHER]: 'r-alpha' }) });
    expect([routeSteps(game, [HOME, TARGET], pack), routeSteps(game, [HOME, FARTHER], pack), routeSteps(game, [TARGET, FARTHER], pack)]).toEqual([1, 1, 1]);
  });

  test('101 note 3: a system is not adjacent to itself, even with two wormholes in it', () => {
    const game = rulesGame({ map: row({ [HOME]: '82B' }) });
    expect(routeReach(game, [HOME], 1, FARTHER, pack).has(HOME)).toBe(false);
  });

  test('101 note 4: the path chosen through a wormhole takes one step', () => {
    const action = tactical(FARTHER, { moves: [{ from: HOME, units: { carrier: 1 } }] });
    const game = rulesGame({ map: row({ [HOME]: 'r-alpha', [FARTHER]: 'r-alpha' }), units: { [HOME]: { carrier: 1 } }, entries: [action] });
    expect(codesOf(game, pack, action)).toEqual([]);
  });

  test('101 note 4.1: systems joined both by an edge and a wormhole are one step apart', () => {
    expect(routeSteps(rulesGame({ map: row({ [HOME]: 'r-alpha', [NEAR]: 'r-alpha' }) }), [HOME, NEAR], pack)).toBe(1);
  });

  test('101 note 4.2: systems joined by two types of wormhole are one step apart', () => {
    expect(routeSteps(rulesGame({ map: row({ [HOME]: 'r-ab', [FARTHER]: '82B' }) }), [HOME, FARTHER], pack)).toBe(1);
  });

  test('101 note 4.3: a ship may go back and forth through a wormhole if its move allows', () => {
    // A cruiser II (move 3) goes FARTHER -> HOME -> FARTHER through the alpha wormholes, then on to FAR.
    const action = tactical(FAR, { moves: [{ from: FARTHER, units: { cruiser: 1 }, via: [HOME, FARTHER] }] });
    const game = rulesGame({
      map: row({ [HOME]: 'r-alpha', [FARTHER]: 'r-alpha' }), units: { [FARTHER]: { cruiser: 1 } }, entries: [action],
      game: { upgrades: { me: ['cruiser'], opponents: {} } },
    });
    expect(codesOf(game, pack, action)).toEqual([]);
    expect(routeReach(game, [FARTHER, HOME, FARTHER], 3, FAR, pack).has(FAR)).toBe(true);
  });

  test.todo('101 note 5: the Creuss and wormholes — pointer to the faction notes, nothing to model');
});
