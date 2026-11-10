import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

vi.mock('../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
  listGames: vi.fn(async () => []),
  requestPersistence: vi.fn(async () => true),
}));

import { loadPack } from '../../data/loadPack';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { PlanScreen } from './PlanScreen';

const pack = loadPack(['pok']);

afterEach(cleanup);
beforeEach(() => {
  setLanguage('en');
  document.elementFromPoint = () => null;
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 6, faction: 'arborec' }, pack);
});

test('a tap outside an open strategy card closes it only when the tap ends, so the tap also lands on its target', async () => {
  render(<PlanScreen />);
  await userEvent.click(screen.getByRole('button', { name: /Trade/ }));
  expect(screen.getByRole('group', { name: 'Trade' })).toBeVisible();
  // The finger is down and nothing moves yet: closing here slides the button from under it, and the tap is lost.
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Add action' }));
  expect(screen.getByRole('group', { name: 'Trade' })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
  expect(screen.getByRole('button', { name: 'Tactical action' })).toBeVisible();
  expect(screen.queryByRole('group', { name: 'Trade' })).toBeNull();
});
