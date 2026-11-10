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
import type { Entry } from '../../../domain/types';
import { setLanguage } from '../../../i18n';
import { useGame } from '../../../state/gameStore';
import { PlanScreen } from '../../screens/PlanScreen';
import { TurnEditor } from '../editors/TurnEditor';
import { GainsBlock } from './GainsBlock';

const pack = loadPack(['pok']);
const game = () => useGame.getState().game!;
const entries = () => game().plans[0].rounds[0].entries;

afterEach(cleanup);
beforeEach(() => {
  setLanguage('en');
  document.elementFromPoint = () => null;
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 6, faction: 'arborec' }, pack);
});

const turn = (extra: Partial<Entry> = {}): Entry => ({ id: 't', phase: 'action', status: 'planned', type: 'pass', ...extra } as Entry);
const find = async (query: string, name: string) => {
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), query);
  await userEvent.click(await screen.findByRole('button', { name: `Choose ${name}` }));
};

test('«+ Gained» opens the choice and writes the component into the gains of the entry', async () => {
  const onChange = vi.fn();
  render(<GainsBlock entry={turn({ gains: ['relic:shard'] })} pack={pack} onChange={onChange} />);
  const block = within(screen.getByRole('group', { name: 'Gained and given' }));
  expect(block.getByTestId('component-relic:shard')).toHaveTextContent('gained');
  await userEvent.click(block.getByRole('button', { name: '+ Gained' }));
  await find('stelar convertr', 'Stellar Converter');
  expect(onChange).toHaveBeenCalledWith({ gains: ['relic:shard', 'relic:stellarconverter'] });
  expect(screen.queryByRole('dialog', { name: 'Choose a component' })).toBeNull();
});

test('«+ Gave» writes the spends, and a cross takes a component back out; an empty list leaves no key', async () => {
  const onChange = vi.fn();
  render(<GainsBlock entry={turn({ gains: ['relic:shard'] })} pack={pack} onChange={onChange} />);
  await userEvent.click(screen.getByRole('button', { name: '+ Gave' }));
  await find('sabotage', 'Sabotage');
  expect(onChange).toHaveBeenLastCalledWith({ spends: ['actionCard:sabo1'] });
  await userEvent.click(screen.getByRole('button', { name: 'Remove Shard of the Throne' }));
  expect(onChange).toHaveBeenLastCalledWith({ gains: undefined });
});

test('the choice offers only what a player can hold', async () => {
  render(<GainsBlock entry={turn()} pack={pack} onChange={() => undefined} />);
  await userEvent.click(screen.getByRole('button', { name: '+ Gained' }));
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), 'mitosis');
  expect(await screen.findByText('Nothing found.')).toBeVisible();
});

test('a component action chooses its component, shows it over the note and lets it go', async () => {
  const onComponent = vi.fn();
  const entry = { id: 'c', phase: 'action', status: 'planned', type: 'component', note: '' } as Extract<Entry, { type: 'component' }>;
  const shown = (e: typeof entry) => (
    <TurnEditor entry={e} game={game()} pack={pack} warnings={[]} turnActs={null} onNote={() => undefined} onComponent={onComponent} onDone={() => undefined} onRemove={() => undefined} />
  );
  const { rerender } = render(shown(entry));
  await userEvent.click(screen.getByRole('button', { name: 'Choose the component' }));
  await find('letani ospha', 'Letani Ospha');
  expect(onComponent).toHaveBeenCalledWith('leader:arborecagent');
  rerender(shown({ ...entry, componentId: 'leader:arborecagent' }));
  const card = screen.getByTestId('component-leader:arborecagent');
  expect(card.compareDocumentPosition(screen.getByRole('textbox', { name: 'Note' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  await userEvent.click(within(card).getByRole('button', { name: 'Remove Letani Ospha' }));
  expect(onComponent).toHaveBeenLastCalledWith(undefined);
});

test('on the plan screen a turn keeps what it gained and the component it plays', async () => {
  useGame.getState().addEntry(1, { type: 'component', note: '' }, 'action');
  render(<PlanScreen />);
  await userEvent.click(screen.getByRole('button', { name: /^Edit/ }));
  await userEvent.click(screen.getByRole('button', { name: '+ Gained' }));
  await find('stellar converter', 'Stellar Converter');
  expect(entries()[0]).toMatchObject({ gains: ['relic:stellarconverter'] });
  await userEvent.click(screen.getByRole('button', { name: 'Choose the component' }));
  await find('letani ospha', 'Letani Ospha');
  expect(entries()[0]).toMatchObject({ componentId: 'leader:arborecagent' });
});

test('the Technology card researches through the choice of technologies and lists what it researched', async () => {
  useGame.getState().setStrategyCard(1, 7);
  useGame.getState().setStrategyCard(1, 7);
  render(<PlanScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
  await userEvent.click(screen.getByRole('button', { name: 'Strategy' }));
  await userEvent.click(screen.getByRole('button', { name: 'Research a technology' }));
  // Only technologies are offered.
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), 'stellar converter');
  expect(await screen.findByText('Nothing found.')).toBeVisible();
  await userEvent.keyboard('{Escape}');
  await find('sarween', 'Sarween Tools');
  expect(entries()[0]).toMatchObject({ effects: { researched: ['technology:st'] } });
  await userEvent.click(screen.getByRole('button', { name: 'Remove Sarween Tools' }));
  expect((entries()[0] as Extract<Entry, { type: 'strategic' }>).effects?.researched).toBeUndefined();
});
