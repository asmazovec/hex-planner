/**
 * LRR 94.3 and 69.5: a note changes hands in a transaction, unless a component of the receiver refuses it. The check is
 * the `dealt` hook of such a component (Hubris is one); here a throwaway component stands in for it.
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { alwaysInForce, throwaway } from '../../effects/points/throwaway';
import noteRefused from '../codes/noteRefused';
import { violation } from '../registry';
import type { Entry } from '../../../testing/old/domain/types';
import type { Player } from '../../players';
import { NEAR, forecast, rulesGame, rulesPack, tactical } from '../kit';

vi.mock('../../effects/registry', async original => (await import('../../effects/points/throwaway')).mockRegistry(await original()));

const pack = rulesPack();
const RIVAL: Player = { id: 'o1', faction: 'rules-tester', vp: 0, seat: 2, color: 2 };
const NOTE = 'promissory:war_funding@o1';

const gift = (): Entry => tactical(NEAR, { acts: [{ kind: 'transaction', with: 'o1', give: {}, get: { components: [NOTE] } }] });
const run = (turn: Entry) => forecast(
  rulesGame({ units: { [NEAR]: { carrier: 1 } }, entries: [turn], game: { opponents: [RIVAL], enemyUnits: { [NEAR]: { o1: { carrier: 1 } } }, start: { me: {}, opponents: { o1: { promissory: [NOTE] } } } } }), pack,
);

beforeEach(() => {
  for (const key of Object.keys(throwaway)) delete throwaway[key];
  alwaysInForce.length = 0;
});

describe('LRR 94.3 / 69.5 a note the receiver refuses', () => {
  test('94.3: the receiver\'s component pushes noteRefused at the step transaction, and the note still changes hands', () => {
    throwaway['technology:refuse'] = {
      tier: 'passive', rule: 'x', holder: 'anyone',
      on: {
        dealt: (ctx, deal) => {
          for (const id of deal.got.components ?? []) ctx.warn(violation(noteRefused.code, { id, name: id }));
        },
      },
    };
    alwaysInForce.push('technology:refuse');
    const turn = gift();
    const { warnings, state } = run(turn);
    const refused = warnings[turn.id].filter(w => w.code === 'noteRefused');
    expect(refused.length).toBeGreaterThan(0);
    expect(refused[0].step).toBe('transaction');
    expect(refused[0].rule).toBe('94.3');
    expect(state.holdings.promissory).toContain(NOTE);
  });

  test('94.3: without the component the note is received without a warning', () => {
    const turn = gift();
    expect(run(turn).warnings[turn.id]?.map(w => w.code) ?? []).not.toContain('noteRefused');
  });
});
