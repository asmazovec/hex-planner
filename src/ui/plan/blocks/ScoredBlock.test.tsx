import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

vi.mock('../../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
  listGames: vi.fn(async () => []),
  requestPersistence: vi.fn(async () => true),
}));

import { loadPack } from '../../../data/loadPack';
import { holdingsOf } from '../../../domain/holdings';
import { initialState } from '../../../domain/replay/state';
import type { Entry, GameState } from '../../../domain/types';
import { setLanguage } from '../../../i18n';
import { useGame } from '../../../state/gameStore';
import { ScoredBlock } from './ScoredBlock';

const pack = loadPack(['pok']);
type Status = Extract<Entry, { type: 'statusTokens' }>;

afterEach(cleanup);
beforeEach(() => {
  setLanguage('en');
  document.elementFromPoint = () => null;
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 6, faction: 'arborec' }, pack);
});

const status = (extra: Partial<Status> = {}): Status => ({ id: 's', phase: 'status', status: 'planned', type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0, ...extra });
const holding = (): GameState => {
  const base = initialState(useGame.getState().game!, pack);
  return { ...base, holdings: holdingsOf({ secrets: ['secretObjective:dtgs'] }), control: { ...base.control, nestphar: 'me' } };
};
const block = () => within(screen.getByRole('group', { name: 'Objectives scored' }));
const find = async (query: string, name: string) => {
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), query);
  await userEvent.click(await screen.findByRole('button', { name: `Choose ${name}` }));
};

test('«Score an objective» writes the objective into `scored`, and a cross takes it back out; an empty list leaves no key', async () => {
  const onChange = vi.fn();
  render(<ScoredBlock entry={status({ scored: ['publicObjective:develop'] })} pack={pack} before={holding()} onChange={onChange} />);
  expect(block().getByTestId('component-publicObjective:develop')).toHaveTextContent('scored');
  await userEvent.click(block().getByRole('button', { name: 'Score an objective' }));
  await find('Diversify', 'Diversify Research');
  expect(onChange).toHaveBeenLastCalledWith({ scored: ['publicObjective:develop', 'publicObjective:diversify'] });
  await userEvent.click(block().getByRole('button', { name: /^Remove / }));
  expect(onChange).toHaveBeenLastCalledWith({ scored: undefined });
});

test('an objective that is scored by spending opens the cost: tokens, trade goods, the planets paying; an empty cost leaves no key', async () => {
  const onChange = vi.fn();
  render(<ScoredBlock entry={status({ scored: ['publicObjective:centralize_trade'], spend: { tradeGoods: 9 } })} pack={pack} before={holding()} onChange={onChange} />);
  const cost = within(screen.getByRole('group', { name: 'What scoring cost' }));
  await userEvent.click(cost.getByRole('button', { name: 'Add one trade good' }));
  expect(onChange).toHaveBeenLastCalledWith({ spend: { tradeGoods: 10 } });
  await userEvent.click(cost.getByRole('button', { name: 'Add one Tactic' }));
  expect(onChange).toHaveBeenLastCalledWith({ spend: { tradeGoods: 9, tactic: 1 } });
  await userEvent.click(within(cost.getByRole('group', { name: 'Planets paying resources' })).getByRole('button', { name: /^Nestphar/ }));
  expect(onChange).toHaveBeenLastCalledWith({ spend: { tradeGoods: 9, resources: { planets: ['nestphar'], tradeGoods: 0 } } });
});

test('an objective that is not scored by spending shows no cost', () => {
  render(<ScoredBlock entry={status({ scored: ['publicObjective:develop'] })} pack={pack} before={holding()} onChange={vi.fn()} />);
  expect(screen.queryByRole('group', { name: 'What scoring cost' })).toBeNull();
});
