import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

vi.mock('../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
}));

import { loadPack } from '../../data/loadPack';
import { useGame } from '../../state/gameStore';
import { setLanguage } from '../../i18n';
import { OpponentsScreen } from './OpponentsScreen';

const pack = loadPack(['pok']);

afterEach(cleanup);

beforeEach(() => {
  setLanguage('en');
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 4, faction: 'arborec' }, pack);
});

test('one row per opponent', () => {
  render(<OpponentsScreen />);
  expect(screen.getAllByRole('group')).toHaveLength(3);
});

test('plus and minus change points and stop at zero', async () => {
  render(<OpponentsScreen />);
  const [plus] = screen.getAllByRole('button', { name: 'Add a point' });
  const [minus] = screen.getAllByRole('button', { name: 'Remove a point' });
  await userEvent.click(minus);
  expect(useGame.getState().game!.opponents[0].vp).toBe(0);
  await userEvent.click(plus);
  await userEvent.click(plus);
  expect(useGame.getState().game!.opponents[0].vp).toBe(2);
  await userEvent.click(minus);
  expect(useGame.getState().game!.opponents[0].vp).toBe(1);
});

test('faction choice is stored', async () => {
  render(<OpponentsScreen />);
  await userEvent.selectOptions(screen.getAllByLabelText('Faction')[1], 'hacan');
  expect(useGame.getState().game!.opponents[1].faction).toBe('hacan');
});
