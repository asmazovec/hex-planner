/** The warnings of a moment (the round starts, the status phase starts or ends, a turn starts) stand in a step of the turn they come before, where a waiver can lift them. */
import { describe, expect, test } from 'vitest';
import { adjust, rulesGame, rulesPack } from '../domain/rules/kit';
import { violation } from '../domain/rules/registry';
import type { Entry } from '../domain/types';
import { boardOf, tableOf, turnOf } from '../testing/old/game/fromLegacy';
import { resolveTurn } from './resolve';

const pack = rulesPack();
// Trade Convoys (Hacan, promissory note) in the play area: "you may negotiate transactions with players who are not your neighbor" (94.1).
const NOTE = 'promissory:convoys@o1';
const game = rulesGame({ game: { opponents: [{ id: 'o1', faction: 'rules-tester', vp: 0, seat: 2, color: 2 }] } });
const table = tableOf(game);
const moment = () => violation('notNeighbor', { player: 'o1' });
const run = (entry: Entry) => resolveTurn(table, boardOf(game, pack), turnOf(table, entry, pack), pack, { moments: [moment()] });

describe('the warning of a moment', () => {
  test('stands in a step of its own, the round, and in the list of the turn', () => {
    const r = run(adjust({}));
    const step = r.steps.find(s => s.violations.some(v => v.code === 'notNeighbor'));
    expect(step?.step).toBe('round');
    expect(r.steps.flatMap(s => s.violations).filter(v => v.code === 'notNeighbor')).toHaveLength(1);
  });

  test('is lifted by a component the turn plays, and stays in the list as lifted', () => {
    const r = run({ ...adjust({}), uses: [NOTE] } as Entry);
    expect(r.steps.flatMap(s => s.violations).find(v => v.code === 'notNeighbor')?.waivedBy).toEqual([NOTE]);
  });
});

describe('the warning of what ends with the turn (the status phase, 81.4)', () => {
  test('is lifted like the turn\'s own', () => {
    const entry = { ...adjust({}), uses: [NOTE] } as Entry;
    const r = resolveTurn(table, boardOf(game, pack), turnOf(table, entry, pack), pack, { closing: board => ({ board, violations: [moment()] }) });
    expect(r.steps.flatMap(s => s.violations).find(v => v.code === 'notNeighbor')?.waivedBy).toEqual([NOTE]);
  });
});
