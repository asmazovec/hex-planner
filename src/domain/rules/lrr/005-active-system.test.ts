/** LRR 5 Active System. Source: tirules2 rules-reference/active-system.md. */
import { describe, expect, test } from 'vitest';
import { CARD } from '../../strategy';
import { codesOf, FAR, FARTHER, forecast, HOME, NEAR, primary, rulesGame, rulesPack, secondary, tactical, TARGET } from '../kit';

const pack = rulesPack();
const rival = { id: 'o1', faction: 'rules-tester', vp: 0, seat: 2, color: 2 };

describe('LRR 5 Active System', () => {
  test('5.1: a tactical action activates a system with a token from the tactic pool, and no other pool', () => {
    const { state } = forecast(rulesGame({ entries: [tactical(TARGET)] }), pack);
    expect([state.tactic, state.fleet, state.strategy]).toEqual([2, 3, 2]);
    expect(state.tokensOnMap).toEqual([TARGET]);
  });

  test('5.2: a player cannot activate a system holding their own token, whichever action put it there', () => {
    const again = tactical(TARGET);
    expect(codesOf(rulesGame({ entries: [tactical(TARGET), again] }), pack, again)).toContain('systemHasToken');
    // Construction's secondary before Thunder's Edge leaves a token in the chosen system.
    const afterCard = tactical(TARGET);
    const construction = secondary(CARD.construction, { systemId: TARGET, structures: [{ kind: 'pds', planetId: 't1' }] });
    const game = rulesGame({ entries: [construction, afterCard], game: { planetControl: { t1: 'me' } } });
    expect(codesOf(game, pack, afterCard)).toContain('systemHasToken');
  });

  test('5.3: another player\'s token does not stop me activating the system', () => {
    const mine = tactical(TARGET);
    const game = rulesGame({ entries: [tactical(TARGET, {}, { owner: rival.id }), mine], game: { opponents: [rival] } });
    expect(codesOf(game, pack, mine)).toEqual([]);
  });

  test('5.4: the system stays active through the action: the arrival and the landing all happen in it', () => {
    const action = tactical(TARGET, {
      moves: [{ from: NEAR, units: { carrier: 1, infantry: 2 } }],
      landings: [{ planetId: 't1', units: { infantry: 2 } }],
    });
    const { state } = forecast(rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [action] }), pack);
    expect(state.systems[TARGET]).toEqual({ carrier: 1 });
    expect(state.ground.t1).toEqual({ infantry: 2 });
    expect(state.control.t1).toBe('me');
  });

  test('5 note 1: a ship may move into a nebula only when it is the active system', () => {
    const map = { [HOME]: 'r-home', [NEAR]: 'r-nebula', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };
    const into = tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }] });
    expect(codesOf(rulesGame({ map, units: { [HOME]: { cruiser: 1 } }, entries: [into] }), pack, into)).toEqual([]);
    const through = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
    expect(codesOf(rulesGame({ map, units: { [HOME]: { cruiser: 1 } }, entries: [through] }), pack, through)).toContain('routeBlocked');
  });

  test('5 note 2: a strategic action activates no system: Construction\'s primary leaves no token', () => {
    const card = primary(CARD.construction, { structures: [{ kind: 'pds', planetId: 't1' }] });
    const { state } = forecast(rulesGame({ entries: [card], game: { planetControl: { t1: 'me' } } }), pack);
    expect(state.tokensOnMap).toEqual([]);
  });

  test.todo('5 note 2.1: "when a system is activated" effects do not trigger in component or strategic actions — not modelled: such effects are not');

  test('5 note 3: activation comes first, then movement: the token goes down even when nothing moves', () => {
    const { state } = forecast(rulesGame({ entries: [tactical(TARGET)] }), pack);
    expect(state.tokensOnMap).toContain(TARGET);
  });
});
