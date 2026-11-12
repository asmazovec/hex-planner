/**
 * LRR 61 Objective Cards, as the status phase checks them (the other points of the section are in 061-objective-cards.test.ts):
 * 61.5.1 the requirement, 61.6 one of each kind, 61.8 once a game, 61.10 a cost, 61.16 the home system, 61.21 the secret limit.
 * The components of these tests are throwaway effects of the registry (`withEffect`), never a component's own file.
 */
import { describe, expect, test } from 'vitest';
import { withEffect } from '../../effects/points/status.kit';
import type { Entry } from '../../types';
import { adjust, codesOf, forecast, rulesGame, rulesPack, statusTokens } from '../kit';

/** The status entry that scores `ids`. */
const scoring = (...ids: string[]): Entry => ({ ...statusTokens(2, 0, 0), scored: ids } as Entry);
const PUBLIC = 'publicObjective:develop';
const PUBLIC_2 = 'publicObjective:lead';
const SECRET = 'secretObjective:dtgs';
const SECRETS = ['secretObjective:ans', 'secretObjective:btgk', 'secretObjective:ctr', 'secretObjective:csl'];
const start = (me: Record<string, string[]>) => ({ start: { me, opponents: {} } });

describe('LRR 61 Objective Cards: the status phase checks what it scores', () => {
  test('61.5.1: an objective whose requirement is not met is warned of, with what it counts', () => {
    const own = rulesPack();
    withEffect(own, PUBLIC, { tier: 'play', rule: PUBLIC, requirement: () => ({ have: 1, need: 2 }) });
    const status = scoring(PUBLIC);
    const warnings = forecast(rulesGame({ entries: [status] }), own).warnings[status.id];
    expect(warnings.find(w => w.code === 'objectiveUnmet')).toMatchObject({ params: { objective: PUBLIC, have: 1, need: 2 }, rule: '61.5', step: 'status' });
  });

  test('61.5.1: an objective whose requirement is met makes no warning, and scores', () => {
    const own = rulesPack();
    withEffect(own, PUBLIC, { tier: 'play', rule: PUBLIC, requirement: () => ({ have: 2, need: 2 }) });
    const status = scoring(PUBLIC);
    const game = rulesGame({ entries: [status] });
    expect(codesOf(game, own, status)).not.toContain('objectiveUnmet');
    expect(forecast(game, own).state.holdings.scored).toContain(PUBLIC);
  });

  test('61.5.1: the requirement is asked against the board before the status entry', () => {
    const own = rulesPack();
    let seen = '';
    withEffect(own, PUBLIC, {
      tier: 'play', rule: PUBLIC,
      requirement: ctx => { seen = `${ctx.entry.id} ${ctx.state.holdings.scored.length} ${ctx.objective}`; return { have: 1, need: 1 }; },
    });
    const status = scoring(PUBLIC);
    forecast(rulesGame({ entries: [status] }), own);
    expect(seen).toBe(`${status.id} 0 ${PUBLIC}`);
  });

  test('61.5: the play of a scored objective runs with the status entry', () => {
    const own = rulesPack();
    withEffect(own, PUBLIC, { tier: 'play', rule: PUBLIC, play: turn => { turn.state.tradeGoods += 1; } });
    expect(forecast(rulesGame({ entries: [scoring(PUBLIC)] }), own).state.tradeGoods).toBe(1);
  });

  test('61.6: more than one public objective in a status phase is warned of', () => {
    const status = scoring(PUBLIC, PUBLIC_2);
    const warnings = forecast(rulesGame({ entries: [status] }), rulesPack()).warnings[status.id];
    expect(warnings.find(w => w.code === 'objectivesPerPhase')?.params).toEqual({ kind: 'public', count: 2 });
  });

  test('61.6: one public and one secret objective are within the limit', () => {
    const status = scoring(PUBLIC, SECRET);
    expect(codesOf(rulesGame({ entries: [status] }), rulesPack(), status)).not.toContain('objectivesPerPhase');
  });

  test('61.8: an objective the player scored before is warned of when scored again', () => {
    const first = scoring(PUBLIC);
    const again = scoring(PUBLIC);
    const game = rulesGame({ rounds: [[first], [again]] });
    expect(codesOf(game, rulesPack(), first)).not.toContain('objectiveRepeated');
    expect(codesOf(game, rulesPack(), again)).toContain('objectiveRepeated');
  });

  test('61.16: a public objective scored without every home planet is warned of', () => {
    const status = scoring(PUBLIC);
    const game = rulesGame({ entries: [status], game: { planetControl: { h1: 'enemy' } } });
    expect(forecast(game, rulesPack()).warnings[status.id].find(w => w.code === 'scoreWithoutHome')?.params).toEqual({ objective: PUBLIC });
  });

  test('61.16: with every home planet held nothing is warned of', () => {
    const status = scoring(PUBLIC);
    expect(codesOf(rulesGame({ entries: [status] }), rulesPack(), status)).not.toContain('scoreWithoutHome');
  });

  test('61.16: a secret objective is no public one: it is scored without the home system', () => {
    const status = scoring(SECRET);
    const game = rulesGame({ entries: [status], game: { planetControl: { h1: 'enemy' } } });
    expect(codesOf(game, rulesPack(), status)).not.toContain('scoreWithoutHome');
  });

  test('61.21: a fourth secret objective, scored or not, is warned of against three', () => {
    const draw: Entry = { ...adjust({}), gains: SECRETS.slice(3) };
    const game = rulesGame({ entries: [draw], game: start({ secrets: SECRETS.slice(0, 2), scored: SECRETS.slice(2, 3) }) });
    expect(forecast(game, rulesPack()).warnings[draw.id].find(w => w.code === 'secretsOverLimit')?.params).toEqual({ secrets: 4, limit: 3 });
  });

  test('61.21: three secret objectives are within the limit', () => {
    const draw: Entry = { ...adjust({}), gains: SECRETS.slice(2, 3) };
    const game = rulesGame({ entries: [draw], game: start({ secrets: SECRETS.slice(0, 2) }) });
    expect(codesOf(game, rulesPack(), draw)).not.toContain('secretsOverLimit');
  });

  test('61.21.1: a component that changes the secret objective limit changes the number the check runs against', () => {
    const own = rulesPack();
    withEffect(own, 'technology:hm', { tier: 'passive', rule: 'technology:hm', modify: { secretLimit: value => value + 1 } });
    const draw: Entry = { ...adjust({}), gains: SECRETS.slice(3) };
    const game = rulesGame({ entries: [draw], game: start({ technologies: ['technology:hm'], secrets: SECRETS.slice(0, 2), scored: SECRETS.slice(2, 3) }) });
    expect(codesOf(game, own, draw)).not.toContain('secretsOverLimit');
  });

  test('61.10: an objective scored by spending reads the cost of the status entry (`spend`) in its own play', () => {
    const own = rulesPack();
    withEffect(own, PUBLIC, { tier: 'play', rule: PUBLIC, play: turn => { turn.state.tradeGoods -= (turn.entry as { spend?: { tradeGoods?: number } }).spend?.tradeGoods ?? 0; } });
    const status = { ...scoring(PUBLIC), spend: { tradeGoods: 3 } } as Entry;
    expect(forecast(rulesGame({ entries: [adjust({ tradeGoods: 5 }), status] }), own).state.tradeGoods).toBe(2);
  });
});
