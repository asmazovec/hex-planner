/** LRR 25 Control. Source: tirules2 rules-reference/control.md. */
import { describe, expect, test } from 'vitest';
import type { Player } from '../../players';
import { adjust, FACTION, forecast, NEAR, rulesGame, rulesPack, tactical, TARGET } from '../kit';

const pack = rulesPack();
const RIVAL: Player = { id: 'o1', faction: FACTION, vp: 0, seat: 2, color: 2 };

const invasion = (extra: Parameters<typeof tactical>[1] = {}) => tactical(TARGET, {
  moves: [{ from: NEAR, units: { carrier: 1, infantry: 2 } }],
  landings: [{ planetId: 't1', units: { infantry: 2 } }],
  ...extra,
});

describe('LRR 25 Control', () => {
  test('25 (intro): a player starts with control of each planet of their home system', () => {
    const { state } = forecast(rulesGame(), pack);
    expect(state.control.h1).toBe('me');
    expect(state.control.h2).toBe('me');
  });

  test('25.1: a planet gained enters exhausted', () => {
    const { state } = forecast(rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [invasion()] }), pack);
    expect(state.control.t1).toBe('me');
    expect(state.exhausted).toContain('t1');
  });

  test.todo('25.1.1: the first to control a planet takes its card from the deck — not modelled: planet cards are not held');

  test('25.1.2: a planet taken from another player also enters exhausted', () => {
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [invasion()], game: { planetControl: { t1: 'enemy' } } });
    const { state } = forecast(game, pack);
    expect(state.control.t1).toBe('me');
    expect(state.exhausted).toContain('t1');
  });

  test.todo('25.1.3: gaining a planet no one controlled explores it — not modelled: exploration is not planned');

  test('25.2 / 49.5.3: landing on a planet already controlled does not exhaust it again', () => {
    const land = invasion();
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [land], game: { planetControl: { t1: 'me' } } });
    expect(forecast(game, pack).state.exhausted).not.toContain('t1');
  });

  test('25.3: a planet stays the player\'s in later rounds until control is lost', () => {
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, rounds: [[invasion()], [], []] });
    expect(forecast(game, pack).state.control.t1).toBe('me');
  });

  test('25.4: a player keeps control of a planet with no units on it', () => {
    const leave = tactical(NEAR, { moves: [{ from: 't1', units: { infantry: 2 } }] });
    const game = rulesGame({ entries: [adjust({ ground: { t1: { infantry: 2 } } }, 'strategy'), leave], game: { planetControl: { t1: 'me' } } });
    expect(forecast(game, pack).state.control.t1).toBe('me');
  });

  test('25.5: an opponent landing on my planet takes control of it', () => {
    const theirs = tactical(TARGET, { landings: [{ planetId: 't1', units: { infantry: 1 } }] }, { owner: 'o1' });
    const game = rulesGame({
      entries: [theirs],
      game: { planetControl: { t1: 'me' }, opponents: [{ id: 'o1', faction: 'rules-tester', vp: 0, seat: 2, color: 2 }], enemyUnits: { [TARGET]: { o1: { infantry: 1 } } } },
    });
    expect(forecast(game, pack).state.control.t1).toBe('enemy');
  });

  test('25.5 / 25.5.2: an opponent whose landed ground forces all die in the battle there does not take my planet', () => {
    const theirs = tactical(TARGET, {
      landings: [{ planetId: 't1', units: { infantry: 1 } }],
      groundLosses: { t1: { infantry: 1 } },
    }, { owner: RIVAL.id });
    const game = rulesGame({
      entries: [theirs],
      game: { planetControl: { t1: 'me' }, opponents: [RIVAL], enemyUnits: { [TARGET]: { [RIVAL.id]: { infantry: 1 } } } },
    });
    expect(forecast(game, pack).state.control.t1).toBe('me');
  });

  test('25.5.1: the player who placed units on a planet another player controls gains it', () => {
    const game = rulesGame({ units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [invasion()], game: { planetControl: { t1: 'enemy' } } });
    expect(forecast(game, pack).state.control.t1).toBe('me');
  });

  test.todo('25.6: some game effects take control of a planet — not modelled: an adjustment cannot change control');
  test.todo('25.7: losing control of a planet removes the control token from it — not modelled: control is one value, there is no token apart from it');
  test.todo('25 note 1: control tokens are unlimited — not modelled: control tokens are not counted');
});
