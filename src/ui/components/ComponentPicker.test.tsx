import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

vi.mock('../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
}));

import { loadPack } from '../../data/loadPack';
import { setLanguage } from '../../i18n';
import { tableOfGame } from '../../testing/projection';
import { useGame } from '../../state/gameStore';
import { ComponentPicker } from './ComponentPicker';
import { searchComponents } from './useComponentSearch';

const pack = loadPack(['pok']);

afterEach(cleanup);
beforeEach(() => {
  setLanguage('en');
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 6, faction: 'arborec' }, pack);
});

const now = () => tableOfGame(useGame.getState().game!, pack);
const box = () => screen.getByRole('searchbox', { name: 'Search components' });

test('the choice gets the id of the component found, typo and all', async () => {
  const onPick = vi.fn();
  render(<ComponentPicker table={now()} player={now().viewer} onPick={onPick} onClose={() => undefined} />);
  await userEvent.type(box(), 'sabotge');
  await userEvent.click(await screen.findByRole('button', { name: 'Choose Sabotage' }));
  expect(onPick).toHaveBeenCalledWith('actionCard:sabo1');
});

test('kinds leave only those components, before a query and after it', async () => {
  render(<ComponentPicker kinds={['technology']} table={now()} player={now().viewer} onPick={() => undefined} onClose={() => undefined} />);
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
  render(<ComponentPicker ids={ids} table={now()} player={now().viewer} onPick={() => undefined} onClose={() => undefined} />);
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
  render(<ComponentPicker table={now()} player={now().viewer} onPick={() => undefined} onClose={onClose} />);
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
  render(<ComponentPicker ids={['actionCard:sabo1', 'relic:shard', 'actionCard:sabo1']} table={now()} player={now().viewer} onPick={() => undefined} onClose={() => undefined} />);
  expect(cards()).toEqual(['actionCard:sabo1', 'relic:shard']);
  expect(screen.getByTestId('component-actionCard:sabo1')).toHaveTextContent('×2');
  expect(screen.queryByText(/^One line searches the name, kind, faction/)).toBeNull();
  await userEvent.type(box(), 'stellar converter');
  expect(await screen.findByText('Nothing found.')).toBeVisible();
  await userEvent.clear(box());
  await userEvent.type(box(), 'shard');
  await vi.waitFor(() => expect(cards()).toEqual(['relic:shard']));
});

test('what is already held stands under the rest and says so, when something new is chosen', async () => {
  render(<ComponentPicker kinds={['relic']} owned={new Set(['relic:emphidia'])} prefer="new" table={now()} player={now().viewer} onPick={() => undefined} onClose={() => undefined} />);
  // The search alone would put it first.
  await userEvent.type(box(), 'crown');
  await screen.findByTestId('component-relic:emphidia');
  expect(cards()).toEqual(['relic:thalnos', 'relic:emphidia']);
  expect(screen.getByTestId('component-relic:emphidia')).toHaveTextContent('already held');
  expect(screen.getByTestId('component-relic:thalnos')).not.toHaveTextContent('already held');
});

test('what is held stands first, and the rest says it is not held, when something is played', async () => {
  const onPick = vi.fn();
  render(<ComponentPicker kinds={['relic']} owned={new Set(['relic:stellarconverter'])} prefer="owned" table={now()} player={now().viewer} onPick={onPick} onClose={() => undefined} />);
  expect(cards()[0]).toBe('relic:stellarconverter');
  expect(screen.getByTestId('component-relic:stellarconverter')).not.toHaveTextContent('not held');
  expect(screen.getByTestId(`component-${cards()[1]}`)).toHaveTextContent('not held');
  // What is not held is still chosen: the plan warns, it does not forbid.
  await userEvent.click(within(screen.getByTestId(`component-${cards()[1]}`)).getByRole('button', { name: /^Choose / }));
  expect(onPick).toHaveBeenCalled();
});

test('the notes I hold of other players stand first when something is played, each with its owner; my own are offered after them', async () => {
  useGame.getState().setOpponent(0, { faction: 'hacan' });
  const rival = useGame.getState().game!.opponents[0].id;
  const held = [`promissory:convoys@${rival}`, `promissory:<color>_ta@${rival}`];
  render(<ComponentPicker kinds={['promissory']} owned={new Set(held)} prefer="owned" table={now()} player={now().viewer} onPick={() => undefined} onClose={() => undefined} />);
  expect(cards().slice(0, 2).sort()).toEqual([...held].sort());
  expect(screen.getByTestId(`component-${held[1]}`)).toHaveTextContent('Hacan');
  expect(cards()).toContain('promissory:<color>_ta@me');
  expect(screen.getByTestId('component-promissory:<color>_ta@me')).toHaveTextContent('not held');
  // The catalogue card without an address is not offered: a note is always somebody's.
  expect(cards()).not.toContain('promissory:<color>_ta');
});

test('the placeholder of the one search line says what can be typed, in the language of the interface', () => {
  render(<ComponentPicker table={now()} player={now().viewer} onPick={() => undefined} onClose={() => undefined} />);
  expect(box()).toHaveAttribute('placeholder', 'Name, kind, faction, text');
  cleanup();
  setLanguage('ru');
  render(<ComponentPicker table={now()} player={now().viewer} onPick={() => undefined} onClose={() => undefined} />);
  expect(screen.getByRole('searchbox', { name: 'Поиск компонентов' })).toHaveAttribute('placeholder', 'Название, тип, фракция, текст');
});

test('in Russian one line finds by the kind and the faction, by the colour of a technology, and by words of the Russian text', async () => {
  setLanguage('ru');
  render(<ComponentPicker table={now()} player={now().viewer} onPick={() => undefined} onClose={() => undefined} />);
  const field = screen.getByRole('searchbox', { name: 'Поиск компонентов' });
  const shown = () => within(screen.getByRole('dialog', { name: 'Выбор компонента' })).queryAllByTestId(/^component-/).map(card => card.getAttribute('data-testid')!.slice('component-'.length));
  await userEvent.type(field, 'Агент Хакан');
  await vi.waitFor(() => expect(shown()[0]).toBe('leader:hacanagent'));
  await userEvent.clear(field);
  await userEvent.type(field, 'зеленая технология');
  await vi.waitFor(() => expect(shown()).toContain('technology:nm'));
  // The green technologies first; what only mentions a technology (a green research facility) after them.
  expect(shown().slice(0, 5).every(id => id.startsWith('technology:'))).toBe(true);
  await userEvent.clear(field);
  await userEvent.type(field, 'поля астеройдов');
  await vi.waitFor(() => expect(shown()).toContain('technology:amd'));
  await userEvent.clear(field);
  await userEvent.type(field, 'ъъъъъъ');
  expect(await screen.findByText('Ничего не найдено.')).toBeVisible();
});
