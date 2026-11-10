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

const cards = () => within(screen.getByRole('dialog', { name: 'Choose a component' })).queryAllByTestId(/^component-/).map(card => card.getAttribute('data-testid')!.slice('component-'.length));

test('`ids` leaves only that set, a repeat as one card with its count, and the search looks in it alone', async () => {
  render(<ComponentPicker ids={['actionCard:sabo1', 'relic:shard', 'actionCard:sabo1']} player="me" onPick={() => undefined} onClose={() => undefined} />);
  expect(cards()).toEqual(['actionCard:sabo1', 'relic:shard']);
  expect(screen.getByTestId('component-actionCard:sabo1')).toHaveTextContent('×2');
  expect(screen.queryByText('Type a name or words of the text.')).toBeNull();
  await userEvent.type(box(), 'stellar converter');
  expect(await screen.findByText('Nothing found.')).toBeVisible();
  await userEvent.clear(box());
  await userEvent.type(box(), 'shard');
  await vi.waitFor(() => expect(cards()).toEqual(['relic:shard']));
});

test('what is already held stands under the rest and says so, when something new is chosen', async () => {
  render(<ComponentPicker kinds={['relic']} owned={new Set(['relic:emphidia'])} prefer="new" player="me" onPick={() => undefined} onClose={() => undefined} />);
  // The search alone would put it first.
  await userEvent.type(box(), 'crown');
  await screen.findByTestId('component-relic:emphidia');
  expect(cards()).toEqual(['relic:thalnos', 'relic:emphidia']);
  expect(screen.getByTestId('component-relic:emphidia')).toHaveTextContent('already held');
  expect(screen.getByTestId('component-relic:thalnos')).not.toHaveTextContent('already held');
});

test('what is held stands first, and the rest says it is not held, when something is played', async () => {
  const onPick = vi.fn();
  render(<ComponentPicker kinds={['relic']} owned={new Set(['relic:stellarconverter'])} prefer="owned" player="me" onPick={onPick} onClose={() => undefined} />);
  expect(cards()[0]).toBe('relic:stellarconverter');
  expect(screen.getByTestId('component-relic:stellarconverter')).not.toHaveTextContent('not held');
  expect(screen.getByTestId(`component-${cards()[1]}`)).toHaveTextContent('not held');
  // What is not held is still chosen: the plan warns, it does not forbid.
  await userEvent.click(within(screen.getByTestId(`component-${cards()[1]}`)).getByRole('button', { name: /^Choose / }));
  expect(onPick).toHaveBeenCalled();
});
