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
import type { Entry, GameState, StartHoldings } from '../../../domain/types';
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

/** The state of the owner before the entry, holding this. */
const holding = (start: StartHoldings): GameState => ({ ...initialState(game(), pack), holdings: holdingsOf(start) });
const picker = () => screen.getByRole('dialog', { name: 'Choose a component' });
const offered = () => within(picker()).queryAllByTestId(/^component-/).map(card => card.getAttribute('data-testid')!.slice('component-'.length));

const turn = (extra: Partial<Entry> = {}): Entry => ({ id: 't', phase: 'action', status: 'planned', type: 'pass', ...extra } as Entry);
const find = async (query: string, name: string) => {
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), query);
  await userEvent.click(await screen.findByRole('button', { name: `Choose ${name}` }));
};

test('«+ Took» opens the choice and writes the component into the gains of the entry', async () => {
  const onChange = vi.fn();
  render(<GainsBlock entry={turn({ gains: ['relic:shard'] })} pack={pack} onChange={onChange} />);
  const block = within(screen.getByRole('group', { name: 'Taken and discarded' }));
  expect(block.getByTestId('component-relic:shard')).toHaveTextContent('taken');
  await userEvent.click(block.getByRole('button', { name: '+ Took' }));
  await find('stelar convertr', 'Stellar Converter');
  expect(onChange).toHaveBeenCalledWith({ gains: ['relic:shard', 'relic:stellarconverter'] });
  expect(screen.queryByRole('dialog', { name: 'Choose a component' })).toBeNull();
});

test('«+ Discarded» writes the spends, and a cross takes a component back out; an empty list leaves no key', async () => {
  const onChange = vi.fn();
  render(<GainsBlock entry={turn({ gains: ['relic:shard'] })} pack={pack} before={holding({ hand: ['actionCard:sabo1'] })} onChange={onChange} />);
  await userEvent.click(screen.getByRole('button', { name: '+ Discarded' }));
  await find('sabotage', 'Sabotage');
  expect(onChange).toHaveBeenLastCalledWith({ spends: ['actionCard:sabo1'] });
  await userEvent.click(screen.getByRole('button', { name: 'Remove Shard of the Throne' }));
  expect(onChange).toHaveBeenLastCalledWith({ gains: undefined });
});

test('the choice offers only what a player can hold', async () => {
  render(<GainsBlock entry={turn()} pack={pack} onChange={() => undefined} />);
  await userEvent.click(screen.getByRole('button', { name: '+ Took' }));
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
  await userEvent.click(screen.getByRole('button', { name: '+ Took' }));
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

test('«+ Discarded» offers only what the owner held before the entry, a repeated card once with its count', async () => {
  render(<GainsBlock entry={turn()} pack={pack} before={holding({ hand: ['actionCard:sabo1', 'actionCard:sabo1'], relics: ['relic:shard'] })} onChange={() => undefined} />);
  await userEvent.click(screen.getByRole('button', { name: '+ Discarded' }));
  expect(offered()).toEqual(['actionCard:sabo1', 'relic:shard']);
  expect(within(picker()).getByTestId('component-actionCard:sabo1')).toHaveTextContent('×2');
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), 'stellar converter');
  expect(await screen.findByText('Nothing found.')).toBeVisible();
});

test('with nothing held «+ Discarded» is off and says why; the block says where giving to a player goes', () => {
  render(<GainsBlock entry={turn()} pack={pack} before={holding({})} onChange={() => undefined} />);
  const discard = screen.getByRole('button', { name: /^\+ Discarded/ });
  expect(discard).toBeDisabled();
  expect(discard).toHaveAccessibleName('+ Discarded: nothing to discard');
  expect(discard).toHaveAttribute('title', 'Nothing to discard');
  expect(screen.getByRole('group', { name: 'Taken and discarded' })).toHaveTextContent('Giving to another player is in a transaction.');
});

test('what the entry itself takes can be discarded by it, and what it already discards is offered no more', async () => {
  const onChange = vi.fn();
  const { rerender } = render(<GainsBlock entry={turn({ gains: ['relic:shard'] })} pack={pack} before={holding({})} onChange={onChange} />);
  await userEvent.click(screen.getByRole('button', { name: '+ Discarded' }));
  expect(offered()).toEqual(['relic:shard']);
  await userEvent.click(within(picker()).getByRole('button', { name: 'Choose Shard of the Throne' }));
  expect(onChange).toHaveBeenLastCalledWith({ spends: ['relic:shard'] });
  rerender(<GainsBlock entry={turn({ gains: ['relic:shard'], spends: ['relic:shard'] })} pack={pack} before={holding({})} onChange={onChange} />);
  expect(screen.getByRole('button', { name: /^\+ Discarded/ })).toBeDisabled();
});

test('«+ Took» offers the whole catalogue; what is held once already stands last and says so', async () => {
  render(<GainsBlock entry={turn()} pack={pack} before={holding({ relics: ['relic:emphidia'] })} onChange={() => undefined} />);
  await userEvent.click(screen.getByRole('button', { name: '+ Took' }));
  // The search alone would put it first.
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), 'crown');
  await screen.findByTestId('component-relic:emphidia');
  expect(offered()).toEqual(['relic:thalnos', 'relic:emphidia']);
  expect(within(picker()).getByTestId('component-relic:emphidia')).toHaveTextContent('already held');
});

test('on the plan screen an opponent\'s entry discards from what that opponent holds, not from mine', async () => {
  const rival = game().opponents[0];
  useGame.getState().setStartHolding('me', 'relic:shard', true);
  useGame.getState().setStartHolding(rival.id, 'relic:stellarconverter', true);
  useGame.getState().addEntry(1, { type: 'component', note: '' }, 'action', rival.id);
  render(<PlanScreen />);
  await userEvent.click(screen.getByRole('button', { name: /^Edit/ }));
  await userEvent.click(screen.getByRole('button', { name: '+ Discarded' }));
  expect(offered()).toContain('relic:stellarconverter');
  expect(offered()).not.toContain('relic:shard');
});

test('a component action offers first what its owner holds ready; the rest says it is not held and can still be chosen', async () => {
  const entry = { id: 'c', phase: 'action', status: 'planned', type: 'component', note: '' } as Extract<Entry, { type: 'component' }>;
  const onComponent = vi.fn();
  render(
    <TurnEditor
      entry={entry} game={game()} pack={pack} board={holding({ relics: ['relic:thalnos'] })} warnings={[]} turnActs={null}
      onNote={() => undefined} onComponent={onComponent} onDone={() => undefined} onRemove={() => undefined}
    />,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Choose the component' }));
  // The search alone would put the other crown first.
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), 'crown');
  await screen.findByTestId('component-relic:thalnos');
  expect(offered()).toEqual(['relic:thalnos', 'relic:emphidia']);
  expect(within(picker()).getByTestId('component-relic:thalnos')).not.toHaveTextContent('not held');
  const other = within(picker()).getByTestId(`component-${offered().at(-1)}`);
  expect(other).toHaveTextContent('not held');
  const id = offered().at(-1);
  await userEvent.click(within(other).getByRole('button', { name: /^Choose / }));
  expect(onComponent).toHaveBeenCalledWith(id);
});
