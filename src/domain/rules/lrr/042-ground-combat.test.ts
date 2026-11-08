/** LRR 42 Ground Combat. Source: tirules2 rules-reference/ground-combat.md. */
import { describe, expect, test } from 'vitest';
import { adjust, codesOf, forecast, NEAR, rulesGame, rulesPack, tactical, TARGET } from '../kit';

const pack = rulesPack();

describe('LRR 42 Ground Combat', () => {
  test('42 (intro): a planet holding another player\'s ground forces can still be landed on, with no warning', () => {
    const land = tactical(TARGET, {
      moves: [{ from: NEAR, units: { carrier: 1, infantry: 2 } }],
      landings: [{ planetId: 't1', units: { infantry: 2 } }],
    });
    const game = rulesGame({
      units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [land],
      game: { planetControl: { t1: 'enemy' }, enemyGround: { t1: { o1: { infantry: 1 } } } },
    });
    expect(codesOf(game, pack, land)).toEqual([]);
  });

  test.todo('42.1: each ground force rolls a die against its combat value — not modelled: the planner records the outcome, not the dice');
  test.todo('42.1.1: a combat value with several burst icons rolls that many dice — not modelled: no dice');

  test('42.2: the player removes their own ground forces destroyed on the planet', () => {
    const land = tactical(TARGET, {
      moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }],
      landings: [{ planetId: 't1', units: { infantry: 1 } }],
      groundLosses: { t1: { infantry: 2 } },
    });
    const game = rulesGame({
      units: { [NEAR]: { carrier: 1, infantry: 1 } },
      entries: [adjust({ ground: { t1: { infantry: 2 } } }, 'strategy'), land],
      game: { planetControl: { t1: 'me' } },
    });
    expect(forecast(game, pack).state.ground.t1).toEqual({ infantry: 1 });
    expect(codesOf(game, pack, land)).toEqual([]);
  });

  test('42.2: a landed unit destroyed in the combat never reaches the planet: what lands is what survives', () => {
    // The editor moves a landed unit that falls out of the landing and into the losses of the action.
    const land = tactical(TARGET, {
      moves: [{ from: NEAR, units: { carrier: 1, infantry: 3 } }],
      landings: [{ planetId: 't1', units: { infantry: 2 } }],
      losses: { infantry: 1 },
    });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 3 } }, entries: [land], game: { planetControl: { t1: 'enemy' } } });
    const { state } = forecast(game, pack);
    expect(state.ground.t1).toEqual({ infantry: 2 });
    expect(state.systems[TARGET]).toEqual({ carrier: 1 });
    expect(codesOf(game, pack, land)).toEqual([]);
  });

  test('42.2: losing more ground forces on a planet than stand there is warned about', () => {
    const land = tactical(TARGET, {
      moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }],
      landings: [{ planetId: 't1', units: { infantry: 1 } }],
      groundLosses: { t1: { infantry: 3 } },
    });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 1 } }, entries: [land], game: { planetControl: { t1: 'me' } } });
    expect(codesOf(game, pack, land)).toContain('unitsMissing');
  });

  test('42.2.1: a destroyed ground force leaves the board', () => {
    const land = tactical(TARGET, {
      moves: [{ from: NEAR, units: { carrier: 1, infantry: 2 } }],
      landings: [{ planetId: 't1', units: { infantry: 1 } }],
      losses: { infantry: 1 },
    });
    const { state } = forecast(rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [land] }), pack);
    const infantry = [...Object.values(state.systems), ...Object.values(state.ground)].reduce((sum, u) => sum + (u.infantry ?? 0), 0);
    expect(infantry).toBe(1);
  });

  test.todo('42.3: rounds repeat while both players have ground forces on the planet — not modelled: only the result is recorded');
  test.todo('42.4: the combat ends when one player or neither has ground forces left — not modelled: only the result is recorded');
  test.todo('42.4.1: start of combat and start of round share a window in the first round — not modelled: no timing windows');
  test.todo('42.4.2: end of combat and end of round share a window in the last round — not modelled: no timing windows');

  test('42.4.3: the player with ground forces left wins and holds the planet', () => {
    const land = tactical(TARGET, {
      moves: [{ from: NEAR, units: { carrier: 1, infantry: 2 } }],
      landings: [{ planetId: 't1', units: { infantry: 1 } }],
      losses: { infantry: 1 },
    });
    const game = rulesGame({
      units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [land],
      game: { planetControl: { t1: 'enemy' }, enemyGround: { t1: { o1: { infantry: 1 } } } },
    });
    expect(forecast(game, pack).state.control.t1).toBe('me');
  });

  test('42.4.4: when every attacker falls there is no winner and the defender keeps the planet', () => {
    // Every landed unit fell, so the editor leaves no landing and counts them in the losses.
    const land = tactical(TARGET, {
      moves: [{ from: NEAR, units: { carrier: 1, infantry: 2 } }],
      landings: [],
      losses: { infantry: 2 },
    });
    const game = rulesGame({
      units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [land],
      game: { planetControl: { t1: 'enemy' }, enemyGround: { t1: { o1: { infantry: 1 } } } },
    });
    expect(forecast(game, pack).state.control.t1).toBe('enemy');
  });

  test('42.4.4: a draw recorded as losses on the planet still leaves the planet with the defender', () => {
    const land = tactical(TARGET, {
      moves: [{ from: NEAR, units: { carrier: 1, infantry: 2 } }],
      landings: [{ planetId: 't1', units: { infantry: 2 } }],
      groundLosses: { t1: { infantry: 2 } },
    });
    const game = rulesGame({
      units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [land],
      game: { planetControl: { t1: 'enemy' }, enemyGround: { t1: { o1: { infantry: 1 } } } },
    });
    expect(forecast(game, pack).state.control.t1).toBe('enemy');
  });

  test.todo('42 note 1: start of combat windows come before the roll — not modelled: no timing windows');
  test.todo('42 note 2: end of combat windows come after hits are assigned — not modelled: no timing windows');
  test.todo('42 note 3: combats on several planets are fought one by one before control is established — not modelled: no combat sequence');
  test.todo('42 note 4: one secret objective may be scored per ground combat — not modelled: objectives are not tracked');
  test.todo('42 note 5: Sustain Damage may cancel a hit in ground combat — not modelled: no hits or damage state');
  test.todo('42 note 6: nobody retreats from a ground combat — not modelled: no retreat');
  test.todo('42 note 7: a 0 on the die counts as 10 — not modelled: no dice');
});
