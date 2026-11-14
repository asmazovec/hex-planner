import { cleanup, render, screen, within } from '@testing-library/react';
import { listOf } from '../testing/view';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import * as edits from '../../testing/entries';

vi.mock('../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
}));

import { loadPack } from '../../data/loadPack';
import { withEffect } from '../../domain/effects/points/status.kit';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { EntryList } from './EntryList';

const pack = loadPack(['pok']);
// The ability of the Sol is written by its own batch; a throwaway effect stands in for it (a passive change of `tokensGained`).
withEffect(pack, 'ability:versatile', { tier: 'passive', rule: 'ability:versatile', modify: { tokensGained: (value, ctx) => (ctx.step === 'status' ? value + 1 : value) } });

afterEach(cleanup);
beforeEach(() => {
  setLanguage('en');
  document.elementFromPoint = () => null;
});

/** The status entry of round 1 of a new game of `faction`, open in the list as the player opens it. */
function openStatus(faction: string, secrets: string[] = []): void {
  const store = useGame.getState();
  store.newGame({ expansions: ['pok'], playerCount: 6, faction }, pack);
  for (const id of secrets) store.setStartHolding('me', id, true);
  const id = edits.addStatusEntry(1);
  function Live() {
    const live = useGame(s => s.game)!;
    return (
      <EntryList {...listOf(live, pack)}
        openId={id} onOpen={() => undefined}
      />
    );
  }
  render(<Live />);
}

test('the tokens of the status phase are two, and the components of the player change the number: the Sol have three', () => {
  openStatus('sol');
  expect(within(screen.getByRole('group', { name: 'Token distribution' })).getByText('Distribute tokens: 3 left')).toBeVisible();
  cleanup();
  openStatus('arborec');
  expect(within(screen.getByRole('group', { name: 'Token distribution' })).getByText('Distribute tokens: 2 left')).toBeVisible();
});

test('the status editor offers the objectives scored, and the reminder of a secret objective in hand stands in it', () => {
  openStatus('arborec', ['secretObjective:ans']);
  expect(screen.getByRole('group', { name: 'Objectives scored' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Score an objective' })).toBeVisible();
  expect(screen.getByRole('group', { name: 'Reminders for this step' })).toHaveTextContent('Adapt New Strategies');
});
