import { cleanup, render, screen, within } from '@testing-library/react';
import { kernelViewOf } from '../../testing/view';
import { viewOf } from '../../testing/legacyMap';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import * as edits from '../../../testing/entries';

vi.mock('../../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
  listGames: vi.fn(async () => []),
  requestPersistence: vi.fn(async () => true),
}));

import { loadPack } from '../../../data/loadPack';
import { holdingsOf } from '../../../domain/holdings';
import { initialState } from '../../../testing/old/domain/replay/state';
import type { StartHoldings } from '../../../domain/types';
import type { Entry } from '../../../testing/old/domain/types';
import type { GameState } from '../../../testing/old/domain/types';
import { setLanguage } from '../../../i18n';
import { useGame } from '../../../state/gameStore';
import { PlanScreen } from '../../screens/PlanScreen';
import { TurnEditor } from '../editors/TurnEditor';
import { GainsBlock } from './GainsBlock';
import { playProps, turnProps } from '../../testing/turnProps';
import { gameNow } from '../../../testing/store';

const pack = loadPack(['pok']);
const game = () => gameNow()!;
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
  render(<GainsBlock {...turnProps(kernelViewOf(game(), pack), pack, turn({ gains: ['relic:shard'] }), onChange)} pack={pack}/>);
  const block = within(screen.getByRole('group', { name: 'Taken and discarded' }));
  expect(block.getByTestId('component-relic:shard')).toHaveTextContent('taken');
  await userEvent.click(block.getByRole('button', { name: '+ Took' }));
  await find('stelar convertr', 'Stellar Converter');
  expect(onChange).toHaveBeenCalledWith({ gains: ['relic:shard', 'relic:stellarconverter'] });
  expect(screen.queryByRole('dialog', { name: 'Choose a component' })).toBeNull();
});

test('a breakthrough is taken like any component, in the round it is gained', async () => {
  const tePack = loadPack(['pok', 'te']);
  useGame.getState().newGame({ expansions: ['pok', 'te'], playerCount: 6, faction: 'yin' }, tePack);
  const onChange = vi.fn();
  render(<GainsBlock {...turnProps(kernelViewOf(game(), tePack), tePack, turn(), onChange)} pack={tePack}/>);
  await userEvent.click(screen.getByRole('button', { name: '+ Took' }));
  await find('yin ascendant', 'Yin Ascendant');
  expect(onChange).toHaveBeenCalledWith({ gains: ['breakthrough:yinbt'] });
});

test('«+ Discarded» writes the spends, and a cross takes a component back out; an empty list leaves no key', async () => {
  const onChange = vi.fn();
  render(<GainsBlock {...turnProps(viewOf(game(), holding({ hand: ['actionCard:sabo1'] }), pack), pack, turn({ gains: ['relic:shard'] }), onChange)} pack={pack} view={viewOf(game(), holding({ hand: ['actionCard:sabo1'] }), pack)}/>);
  await userEvent.click(screen.getByRole('button', { name: '+ Discarded' }));
  await find('sabotage', 'Sabotage');
  expect(onChange).toHaveBeenLastCalledWith({ spends: ['actionCard:sabo1'] });
  await userEvent.click(screen.getByRole('button', { name: 'Remove Shard of the Throne' }));
  expect(onChange).toHaveBeenLastCalledWith({ gains: undefined });
});

test('the choice offers only what a player can hold', async () => {
  render(<GainsBlock {...turnProps(kernelViewOf(game(), pack), pack, turn(), () => undefined)} pack={pack}/>);
  await userEvent.click(screen.getByRole('button', { name: '+ Took' }));
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), 'mitosis');
  expect(await screen.findByText('Nothing found.')).toBeVisible();
});

test('a component action chooses its component, shows it over the note and lets it go', async () => {
  const onComponent = vi.fn();
  const entry = { id: 'c', phase: 'action', status: 'planned', type: 'component', note: '' } as Extract<Entry, { type: 'component' }>;
  const shown = (e: typeof entry) => (
    <TurnEditor view={kernelViewOf(game(), pack)} {...playProps(kernelViewOf(game(), pack), pack, e, { onComponent })} pack={pack} warnings={[]} common={null} onDone={() => undefined} onRemove={() => undefined} />
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

test('a component action begins with the place of its component: as wide as the block while empty, then the card with its cross and «Change»', async () => {
  const onComponent = vi.fn();
  const entry = { id: 'c', phase: 'action', status: 'planned', type: 'component', note: '' } as Extract<Entry, { type: 'component' }>;
  const shown = (e: typeof entry) => (
    <TurnEditor view={kernelViewOf(game(), pack)} {...playProps(kernelViewOf(game(), pack), pack, e, { onComponent })} pack={pack} warnings={[]} common={null} onDone={() => undefined} onRemove={() => undefined} />
  );
  const { rerender } = render(shown(entry));
  const own = () => within(screen.getByRole('group', { name: 'Action setup' }));
  // The empty place is the first control of the part, and nothing is chosen for the player.
  expect(own().getAllByRole('button')[0]).toHaveAccessibleName('Choose the component');
  expect(own().getByRole('button', { name: 'Choose the component' })).toHaveClass('component-slot');
  expect(screen.queryByRole('dialog', { name: 'Choose a component' })).toBeNull();
  rerender(shown({ ...entry, componentId: 'leader:arborecagent' }));
  expect(own().queryByRole('button', { name: 'Choose the component' })).toBeNull();
  const card = within(screen.getByTestId('component-leader:arborecagent'));
  expect(card.getByRole('button', { name: 'Remove Letani Ospha' })).toBeVisible();
  // «Change» stands inside the card and opens the same choice.
  await userEvent.click(card.getByRole('button', { name: 'Change' }));
  await find('stellar converter', 'Stellar Converter');
  expect(onComponent).toHaveBeenLastCalledWith('relic:stellarconverter');
});

test('a component action just added from the menu opens the choice of its component at once', async () => {
  const entry = { id: 'c', phase: 'action', status: 'planned', type: 'component', note: '' } as Extract<Entry, { type: 'component' }>;
  render(<TurnEditor view={kernelViewOf(game(), pack)} {...playProps(kernelViewOf(game(), pack), pack, entry, {})} pack={pack} warnings={[]} common={null} pickFirst onDone={() => undefined} onRemove={() => undefined} />);
  expect(picker()).toBeVisible();
  await userEvent.keyboard('{Escape}');
  expect(screen.getByRole('button', { name: 'Choose the component' })).toBeVisible();
});

test('the kind an entry takes most has a button of its own that offers that kind alone', async () => {
  const onChange = vi.fn();
  render(<GainsBlock {...turnProps(kernelViewOf(game(), pack), pack, turn(), onChange)} pack={pack} lead="actionCard"/>);
  const names = within(screen.getByRole('group', { name: 'Taken and discarded' })).getAllByRole('button').map(b => b.textContent);
  expect(names).toEqual(['+ Action card', '+ Took', '+ Discarded']);
  await userEvent.click(screen.getByRole('button', { name: '+ Action card' }));
  // Before a search the choice lists action cards, and nothing else.
  expect(offered().length).toBeGreaterThan(5);
  expect(offered().every(id => id.startsWith('actionCard:'))).toBe(true);
  await find('sabotage', 'Sabotage');
  expect(onChange).toHaveBeenCalledWith({ gains: ['actionCard:sabo1'] });
});

test('a card taken stands under the buttons, so adding one moves none; an agenda the entry names is not listed and is kept', async () => {
  const onChange = vi.fn();
  render(<GainsBlock {...turnProps(kernelViewOf(game(), pack), pack, turn({ gains: ['agenda:revolution', 'relic:shard'] }), onChange)} pack={pack}/>);
  const block = within(screen.getByRole('group', { name: 'Taken and discarded' }));
  expect(block.queryByTestId('component-agenda:revolution')).toBeNull();
  const card = block.getByTestId('component-relic:shard');
  expect(block.getByRole('button', { name: '+ Took' }).compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  await userEvent.click(block.getByRole('button', { name: 'Remove Shard of the Throne' }));
  expect(onChange).toHaveBeenLastCalledWith({ gains: ['agenda:revolution'] });
});

test('on the plan screen a turn keeps what it gained and the component it plays', async () => {
  edits.addEntry(1, { type: 'component', note: '' }, 'action');
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
  render(<GainsBlock {...turnProps(viewOf(game(), holding({ hand: ['actionCard:sabo1', 'actionCard:sabo1'], relics: ['relic:shard'] }), pack), pack, turn(), () => undefined)} pack={pack} view={viewOf(game(), holding({ hand: ['actionCard:sabo1', 'actionCard:sabo1'], relics: ['relic:shard'] }), pack)}/>);
  await userEvent.click(screen.getByRole('button', { name: '+ Discarded' }));
  expect(offered()).toEqual(['actionCard:sabo1', 'relic:shard']);
  expect(within(picker()).getByTestId('component-actionCard:sabo1')).toHaveTextContent('×2');
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), 'stellar converter');
  expect(await screen.findByText('Nothing found.')).toBeVisible();
});

test('with nothing held «+ Discarded» is off and says why; the block says where giving to a player goes', () => {
  render(<GainsBlock {...turnProps(viewOf(game(), holding({}), pack), pack, turn(), () => undefined)} pack={pack} view={viewOf(game(), holding({}), pack)}/>);
  const discard = screen.getByRole('button', { name: /^\+ Discarded/ });
  expect(discard).toBeDisabled();
  expect(discard).toHaveAccessibleName('+ Discarded: nothing to discard');
  expect(discard).toHaveAttribute('title', 'Nothing to discard');
  expect(screen.getByRole('group', { name: 'Taken and discarded' })).toHaveTextContent('Giving to another player is in a transaction.');
});

test('what the entry itself takes can be discarded by it, and what it already discards is offered no more', async () => {
  const onChange = vi.fn();
  const { rerender } = render(<GainsBlock {...turnProps(viewOf(game(), holding({}), pack), pack, turn({ gains: ['relic:shard'] }), onChange)} pack={pack} view={viewOf(game(), holding({}), pack)}/>);
  await userEvent.click(screen.getByRole('button', { name: '+ Discarded' }));
  expect(offered()).toEqual(['relic:shard']);
  await userEvent.click(within(picker()).getByRole('button', { name: 'Choose Shard of the Throne' }));
  expect(onChange).toHaveBeenLastCalledWith({ spends: ['relic:shard'] });
  rerender(<GainsBlock {...turnProps(viewOf(game(), holding({}), pack), pack, turn({ gains: ['relic:shard'], spends: ['relic:shard'] }), onChange)} pack={pack} view={viewOf(game(), holding({}), pack)}/>);
  expect(screen.getByRole('button', { name: /^\+ Discarded/ })).toBeDisabled();
});

test('«+ Took» offers the whole catalogue; what is held once already stands last and says so', async () => {
  render(<GainsBlock {...turnProps(viewOf(game(), holding({ relics: ['relic:emphidia'] }), pack), pack, turn(), () => undefined)} pack={pack} view={viewOf(game(), holding({ relics: ['relic:emphidia'] }), pack)}/>);
  await userEvent.click(screen.getByRole('button', { name: '+ Took' }));
  // The search alone would put it first.
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), 'crown');
  await screen.findByTestId('component-relic:emphidia');
  // Exploration cards are offered now too: Tomb of Emphidia names the crown. The order is the same: what is held stands last.
  expect(offered()).toEqual(['relic:thalnos', 'exploration:toe', 'relic:emphidia']);
  expect(within(picker()).getByTestId('component-relic:emphidia')).toHaveTextContent('already held');
});

test('on the plan screen an opponent\'s entry discards from what that opponent holds, not from mine', async () => {
  const rival = game().opponents[0];
  useGame.getState().setStartHolding('me', 'relic:shard', true);
  useGame.getState().setStartHolding(rival.id, 'relic:stellarconverter', true);
  edits.addEntry(1, { type: 'component', note: '' }, 'action', rival.id);
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
    <TurnEditor view={viewOf(game(), holding({ relics: ['relic:thalnos'] }), pack)}
      {...playProps(viewOf(game(), holding({ relics: ['relic:thalnos'] }), pack), pack, entry, { onComponent })} pack={pack} warnings={[]} common={null}
      onDone={() => undefined} onRemove={() => undefined}
    />,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Choose the component' }));
  // The search alone would put the other crown first.
  await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), 'crown');
  await screen.findByTestId('component-relic:thalnos');
  // Exploration cards are offered too (Tomb of Emphidia names the crown): the held relic stands first, the rest after it.
  expect(offered()).toEqual(['relic:thalnos', 'exploration:toe', 'relic:emphidia']);
  expect(within(picker()).getByTestId('component-relic:thalnos')).not.toHaveTextContent('not held');
  const other = within(picker()).getByTestId(`component-${offered().at(-1)}`);
  expect(other).toHaveTextContent('not held');
  const id = offered().at(-1);
  await userEvent.click(within(other).getByRole('button', { name: /^Choose / }));
  expect(onComponent).toHaveBeenCalledWith(id);
});
