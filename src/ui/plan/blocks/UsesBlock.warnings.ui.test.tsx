import { screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import { bench, componentAction, HOME, NEAR, tactical, using } from '../../../domain/effects/components/kit';
import { planned } from '../../../domain/rules/kit';
import type { Entry } from '../../../testing/old/domain/types';
import { showTactical, showTurn, uiBench, use, shown } from '../../testing/effects';

uiBench();

const AGENT = 'leader:hacanagent';
const NAME = 'Carth of Golden Sands';

// "Exhaust this card" (LRR 34.4, 71.4): an exhausted agent named a second time is warned about. A warning stands in the
// block where its subject is set up, so this one stands in «Used», in the open editor of every kind of entry.
// Why every kind: the pass editor used to drop it, and a tactical one put it at the top, away from «Used».
const first = (): Entry => using(tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }] }), AGENT);
const table = (second: Entry) => bench({
  faction: 'hacan', expansions: ['pok'], units: { [HOME]: { carrier: 2 } }, start: { leaders: { [AGENT]: 'unlocked' } }, entries: [first(), second],
});

const inUsed = () => within(screen.getByRole('group', { name: 'Used' }));

test('a second use of an exhausted agent stands in «Used» of the open editor of a pass', async () => {
  const pass = planned({ type: 'pass' } as never, 'action');
  const live = showTurn(table(pass), pass);
  await use(NAME);
  expect(live.entry().uses).toEqual([AGENT]);
  expect(shown('componentExhausted')).toHaveLength(1);
  expect(inUsed().getAllByText(/exhausted/).length).toBeGreaterThan(0);
});

test('the same in the editor of a component action', async () => {
  const action = componentAction('', {});
  const live = showTurn(table(action), action);
  await use(NAME);
  expect(live.entry().uses).toEqual([AGENT]);
  expect(shown('componentExhausted')).toHaveLength(1);
  expect(inUsed().getAllByText(/exhausted/).length).toBeGreaterThan(0);
});

test('the same in the editor of a tactical action', async () => {
  const second = tactical(NEAR, { moves: [{ from: HOME, units: { carrier: 1 } }] });
  const live = showTactical(table(second), second);
  await use(NAME);
  expect(live.entry().uses).toEqual([AGENT]);
  expect(shown('componentExhausted')).toHaveLength(1);
  expect(inUsed().getAllByText(/exhausted/).length).toBeGreaterThan(0);
});
