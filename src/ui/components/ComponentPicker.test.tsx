import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

vi.mock('../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
}));

import { loadPack } from '../../data/loadPack';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { ComponentPicker } from './ComponentPicker';
import { searchComponents } from './useComponentSearch';

const pack = loadPack(['pok']);

afterEach(cleanup);
beforeEach(() => {
  setLanguage('en');
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 6, faction: 'arborec' }, pack);
});

const box = () => screen.getByRole('searchbox', { name: 'Search components' });

test('the choice gets the id of the component found, typo and all', async () => {
  const onPick = vi.fn();
  render(<ComponentPicker player="me" onPick={onPick} onClose={() => undefined} />);
  await userEvent.type(box(), 'sabotge');
  await userEvent.click(await screen.findByRole('button', { name: 'Choose Sabotage' }));
  expect(onPick).toHaveBeenCalledWith('actionCard:sabo1');
});

test('kinds leave only those components, before a query and after it', async () => {
  render(<ComponentPicker kinds={['technology']} player="me" onPick={() => undefined} onClose={() => undefined} />);
  const dialog = screen.getByRole('dialog', { name: 'Choose a component' });
  const shown = () => within(dialog).queryAllByTestId(/^component-/).map(card => card.getAttribute('data-testid')!);
  expect(shown().length).toBeGreaterThan(0);
  expect(shown().length).toBeLessThanOrEqual(30);
  expect(shown().every(id => id.startsWith('component-technology:'))).toBe(true);
  await userEvent.type(box(), 'shard of the throne');
  expect(await screen.findByText('Nothing found.')).toBeVisible();
  await userEvent.clear(box());
  await userEvent.type(box(), 'sarween');
  expect(await screen.findByRole('button', { name: 'Choose Sarween Tools' })).toBeVisible();
});

test('ids leave only those components, all of them in their order before a query, and those of them a query finds', async () => {
  const ids = ['promissory:war_funding', 'actionCard:sabo1'];
  render(<ComponentPicker ids={ids} player="me" onPick={() => undefined} onClose={() => undefined} />);
  const dialog = screen.getByRole('dialog', { name: 'Choose a component' });
  const shown = () => within(dialog).queryAllByTestId(/^component-/).map(card => card.getAttribute('data-testid')!);
  expect(shown()).toEqual(ids.map(id => `component-${id}`));
  await userEvent.type(box(), 'sarween');
  expect(await screen.findByText('Nothing found.')).toBeVisible();
  await userEvent.clear(box());
  await userEvent.type(box(), 'sabotage');
  await screen.findByRole('button', { name: 'Choose Sabotage' });
  expect(shown()).toEqual(['component-actionCard:sabo1']);
});

test('Escape empties the field first and closes the window only after that', async () => {
  const onClose = vi.fn();
  render(<ComponentPicker player="me" onPick={() => undefined} onClose={onClose} />);
  await userEvent.type(box(), 'sabo');
  await userEvent.keyboard('{Escape}');
  expect(box()).toHaveValue('');
  expect(onClose).not.toHaveBeenCalled();
  await userEvent.keyboard('{Escape}');
  expect(onClose).toHaveBeenCalled();
});

test('the search gives at most thirty, and nothing for spaces', () => {
  expect(searchComponents(pack, 'a')).toHaveLength(30);
  expect(searchComponents(pack, '   ')).toEqual([]);
  expect(searchComponents(pack, 'ыфищефпу').map(c => c.name)).toContain('Sabotage');
  expect(searchComponents(pack, 'sarween', ['relic'])).toEqual([]);
});
