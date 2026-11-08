/** LRR 49 Invasion. Source: tirules2 rules-reference/invasion.md. */
import { describe, expect, test } from 'vitest';
import { MECATOL_PLANET, MECATOL_TILE } from '../../mecatol';
import type { Opponent } from '../../types';
import { codesOf, forecast, HOME, NEAR, rulesGame, rulesPack, tactical, TARGET } from '../kit';

const pack = rulesPack();
const rival: Opponent = { id: 'o1', faction: 'rules-tester', vp: 0, seat: 2, color: 2 };

describe('LRR 49 Invasion', () => {
  const invasion = (extra: Parameters<typeof tactical>[1] = {}) => tactical(TARGET, {
    moves: [{ from: NEAR, units: { carrier: 1, infantry: 2 } }],
    landings: [{ planetId: 't1', units: { infantry: 2 } }],
    ...extra,
  });

  test.todo('49.1: units in the active system may bombard — not modelled: no bombardment');

  test('49.2: ground forces land from the space area of the active system', () => {
    const land = invasion();
    const { state } = forecast(rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [land] }), pack);
    expect(state.ground.t1).toEqual({ infantry: 2 });
    expect(state.systems[TARGET]).toEqual({ carrier: 1 });
  });

  test('49.2: landing more ground forces than stand in the space area is warned about', () => {
    const land = invasion({ landings: [{ planetId: 't1', units: { infantry: 3 } }] });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [land] });
    expect(codesOf(game, pack, land)).toContain('landingOverLimit');
  });

  test('49.2: ground forces lost in the space combat are no longer in the space area to land', () => {
    const land = invasion({ losses: { infantry: 1 } });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [land] });
    expect(codesOf(game, pack, land)).toContain('landingOverLimit');
    expect(forecast(game, pack).state.ground.t1).toEqual({ infantry: 1 });
  });

  test('49.2: ground forces land only on planets of the active system', () => {
    // h1 lies in the home system, not in the active one.
    const land = invasion({ landings: [{ planetId: 'h1', units: { infantry: 2 } }] });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [land], game: { planetControl: { h1: 'enemy' } } });
    expect(codesOf(game, pack, land).length).toBeGreaterThan(0);
    expect(forecast(game, pack).state.control.h1).not.toBe('me');
  });

  test('49.2: a landing on a planet outside the active system is named as such, and its ground forces stay in space', () => {
    const land = invasion({ landings: [{ planetId: 'h1', units: { infantry: 2 } }] });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [land] });
    expect(codesOf(game, pack, land)).toContain('landingOutsideSystem');
    expect(forecast(game, pack).state.systems[TARGET]).toEqual({ carrier: 1, infantry: 2 });
  });

  test('49.2: ground forces may be committed to several planets of the system', () => {
    const land = invasion({ landings: [{ planetId: 't1', units: { infantry: 1 } }, { planetId: 't2', units: { infantry: 1 } }] });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [land] });
    const { state } = forecast(game, pack);
    expect([state.control.t1, state.control.t2]).toEqual(['me', 'me']);
    expect(codesOf(game, pack, land)).toEqual([]);
  });

  test('49.2.1: a committed ground force stands on the planet', () => {
    const { state } = forecast(rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [invasion()] }), pack);
    expect(state.ground.t1?.infantry).toBe(2);
  });

  test('49.2.2: the planet may hold another player\'s ground forces', () => {
    const land = invasion();
    const game = rulesGame({
      units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [land],
      game: { planetControl: { t1: 'enemy' }, enemyGround: { t1: { o1: { infantry: 1 } } } },
    });
    expect(codesOf(game, pack, land)).toEqual([]);
  });

  test('49.2.3: with nothing committed the action goes on to production, the ground forces staying in space', () => {
    const stay = invasion({ landings: [] });
    const { state } = forecast(rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [stay] }), pack);
    expect(state.systems[TARGET]).toEqual({ carrier: 1, infantry: 2 });
    expect(state.control.t1).toBeUndefined();
  });

  test.todo('49.3: space cannon on the planet fires at committed ground forces — not modelled: no space cannon defense');
  test.todo('49.3.1: the active player orders several space cannon defenses — not modelled: no space cannon defense');

  test('49.4: the losses of the ground combat are taken off the planet after the landing', () => {
    const land = invasion({ groundLosses: { t1: { infantry: 1 } } });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [land] });
    expect(forecast(game, pack).state.ground.t1).toEqual({ infantry: 1 });
    expect(codesOf(game, pack, land)).toEqual([]);
  });

  test.todo('49.4.1: the active player orders combats on several planets — not modelled: no combat sequence');

  test('49.5: the active player gains control of a planet that still holds their ground forces', () => {
    const { state } = forecast(rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [invasion()] }), pack);
    expect(state.control.t1).toBe('me');
  });

  test('49.5: no control is gained when none of the committed ground forces survive', () => {
    const land = invasion({ groundLosses: { t1: { infantry: 2 } } });
    const { state } = forecast(rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [land] }), pack);
    expect(state.control.t1).not.toBe('me');
  });

  test('49.5: a landing that puts no ground force on the planet gains no control', () => {
    // Nothing to land: the landing is warned about and the planet stays as it was.
    const land = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }] });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1 } }, entries: [land], game: { planetControl: { t1: 'enemy' } } });
    expect(forecast(game, pack).state.control.t1).toBe('enemy');
  });

  test('49.5: an opponent\'s landing that puts no ground force on my planet does not take it', () => {
    const theirs = tactical(TARGET, { landings: [{ planetId: 't1', units: { infantry: 1 } }] }, { owner: 'o1' });
    const game = rulesGame({ entries: [theirs], game: { planetControl: { t1: 'me' }, opponents: [rival] } });
    expect(codesOf(game, pack, theirs)).toContain('landingOverLimit');
    expect(forecast(game, pack).state.control.t1).toBe('me');
  });

  test('49.5: an opponent whose committed ground forces all fall does not take my planet', () => {
    const theirs = tactical(TARGET, {
      landings: [{ planetId: 't1', units: { infantry: 1 } }],
      groundLosses: { t1: { infantry: 1 } },
    }, { owner: 'o1' });
    const game = rulesGame({
      entries: [theirs],
      game: { planetControl: { t1: 'me' }, opponents: [rival], enemyUnits: { [TARGET]: { o1: { carrier: 1, infantry: 1 } } } },
    });
    expect(forecast(game, pack).state.control.t1).toBe('me');
  });

  test('49.5: a planet I take from an opponent is no longer theirs in their own count', () => {
    const game = rulesGame({
      units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [invasion()],
      game: { planetControl: { t1: 'enemy' }, planetOwner: { t1: 'o1' }, opponents: [rival] },
    });
    const { state } = forecast(game, pack);
    expect(state.control.t1).toBe('me');
    expect(state.rivals?.o1.control.t1).not.toBe('me');
  });

  test('49.5.1: structures of another player on a planet I take are destroyed: its space dock goes', () => {
    const game = rulesGame({
      units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [invasion()],
      game: { planetControl: { t1: 'enemy' }, docks: ['t1'] },
    });
    expect(forecast(game, pack).state.docks).not.toContain('t1');
  });

  test('49.5.1: structures of another player on a planet I take are destroyed: its PDS go', () => {
    const game = rulesGame({
      units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [invasion()],
      game: { planetControl: { t1: 'enemy' }, pds: { t1: 1 } },
    });
    expect(forecast(game, pack).state.pds.t1 ?? 0).toBe(0);
  });

  test('49.5.1: my space dock on a planet an opponent takes is destroyed', () => {
    const theirs = tactical(TARGET, { landings: [{ planetId: 't1', units: { infantry: 1 } }] }, { owner: 'o1' });
    const game = rulesGame({
      entries: [theirs],
      game: { planetControl: { t1: 'me' }, docks: ['t1'], opponents: [rival], enemyUnits: { [TARGET]: { o1: { carrier: 1, infantry: 1 } } } },
    });
    const { state } = forecast(game, pack);
    expect(state.control.t1).toBe('enemy');
    expect(state.docks).not.toContain('t1');
  });

  test('49.5.2: a planet gained enters exhausted and cannot pay in the same action', () => {
    const land = invasion({ production: {}, payment: { planets: ['t1'], tradeGoods: 0 } });
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [land] });
    expect(forecast(game, pack).state.exhausted).toContain('t1');
    expect(codesOf(game, pack, land)).toContain('planetExhausted');
  });

  test('49.5.3: landing on a planet the player already controls changes nothing about it', () => {
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [invasion()], game: { planetControl: { t1: 'me' } } });
    const { state } = forecast(game, pack);
    expect(state.control.t1).toBe('me');
    expect(state.exhausted).not.toContain('t1');
  });

  test('49.5.4: when both sides are wiped out the defender keeps the planet', () => {
    const land = invasion({ landings: [], losses: { infantry: 2 } });
    const game = rulesGame({
      units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [land],
      game: { planetControl: { t1: 'enemy' }, enemyGround: { t1: { o1: { infantry: 1 } } } },
    });
    expect(forecast(game, pack).state.control.t1).toBe('enemy');
  });

  test.todo('49 note 1: committed units count as on the planet from the commit step — not modelled: no effects keyed to steps');
  test.todo('49 note 2: a planet gained uncontrolled is explored — not modelled: no exploration');
  test.todo('49 note 3: a legendary planet brings its ability card, which keeps its own state — not modelled: ability cards are not tracked');

  test('49 note 4: ground forces cannot be committed to Mecatol Rex while the custodians token is on it', () => {
    const mecatol = '0,-1';
    const land = tactical(mecatol, {
      moves: [{ from: HOME, units: { carrier: 1, infantry: 1 } }],
      landings: [{ planetId: MECATOL_PLANET, units: { infantry: 1 } }],
    });
    const game = rulesGame({ map: { ...rulesGame().map, [mecatol]: MECATOL_TILE }, units: { [HOME]: { carrier: 1, infantry: 1 } }, entries: [land] });
    expect(codesOf(game, pack, land)).toContain('custodians');
  });
});
