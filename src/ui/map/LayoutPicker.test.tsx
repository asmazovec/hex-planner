import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { LayoutPicker } from './LayoutPicker';

vi.mock('../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
}));

const pok = loadPack(['pok']);

afterEach(cleanup);
beforeEach(() => setLanguage('en'));

function open(playerCount: number, expansions: ('pok')[] = ['pok']) {
  const pack = loadPack(expansions);
  useGame.getState().newGame({ expansions, playerCount, faction: 'arborec' }, pack);
  const game = useGame.getState().game!;
  render(<LayoutPicker game={game} pack={pack} />);
  return game;
}

test.each([3, 4, 5])('%i players get a choice of two layouts', count => {
  open(count);
  expect(screen.getByRole('radio', { name: 'Standard' })).toBeEnabled();
  expect(screen.getByRole('radio', { name: 'With hyperlanes' })).toBeEnabled();
});

test.each([6, 7, 8])('%i players get no picker', count => {
  open(count);
  expect(screen.queryByRole('radio')).toBeNull();
});

test('the radio of the layout in use is checked', () => {
  open(5);
  expect(screen.getByRole('radio', { name: 'With hyperlanes' })).toBeChecked();
  expect(screen.getByRole('radio', { name: 'Standard' })).not.toBeChecked();
});

test('without Prophecy of Kings the hyperlane layout is shown as unavailable', () => {
  open(4, []);
  expect(screen.getByRole('radio', { name: 'With hyperlanes' })).toBeDisabled();
  expect(screen.getByText(/Prophecy of Kings/)).toBeInTheDocument();
});

test('an empty map switches at once', async () => {
  open(4);
  await userEvent.click(screen.getByRole('radio', { name: 'With hyperlanes' }));
  expect(useGame.getState().game!.layout).toBe('hyperlanes');
  expect(useGame.getState().game!.map['-2,-1']).toBe('83A@0');
});

test('a map whose tiles all survive switches at once', async () => {
  open(4);
  useGame.getState().setTile('0,-1', '25');
  const game = useGame.getState().game!;
  cleanup();
  render(<LayoutPicker game={game} pack={pok} />);
  await userEvent.click(screen.getByRole('radio', { name: 'With hyperlanes' }));
  expect(useGame.getState().game!.layout).toBe('hyperlanes');
  expect(useGame.getState().game!.map['0,-1']).toBe('25');
});

test('a tile under a lane asks first, naming how many tiles go, and cancelling changes nothing', async () => {
  open(4);
  useGame.getState().setTile('-2,-1', '25');
  const game = useGame.getState().game!;
  cleanup();
  render(<LayoutPicker game={game} pack={pok} />);
  await userEvent.click(screen.getByRole('radio', { name: 'With hyperlanes' }));
  expect(screen.getByRole('button', { name: 'Switch layout' })).toBeInTheDocument();
  expect(screen.getByText(/1 tile that this layout removes/)).toBeInTheDocument();
  expect(useGame.getState().game!.layout).toBe('standard');
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('button', { name: 'Switch layout' })).toBeNull();
  expect(useGame.getState().game!.layout).toBe('standard');
});

test('confirming switches the layout, keeps shared tiles and puts the lane under the displaced tile', async () => {
  open(4);
  useGame.getState().setTile('0,-1', '25');
  useGame.getState().setTile('-2,-1', '26');
  const game = useGame.getState().game!;
  cleanup();
  render(<LayoutPicker game={game} pack={pok} />);
  await userEvent.click(screen.getByRole('radio', { name: 'With hyperlanes' }));
  await userEvent.click(screen.getByRole('button', { name: 'Switch layout' }));
  expect(useGame.getState().game!.layout).toBe('hyperlanes');
  expect(useGame.getState().game!.map['0,-1']).toBe('25');
  expect(useGame.getState().game!.map['-2,-1']).toBe('83A@0');
});

test('a question left open does not carry over to another game', async () => {
  open(4);
  useGame.getState().setTile('-2,-1', '25');
  const first = useGame.getState().game!;
  cleanup();
  const view = render(<LayoutPicker game={first} pack={pok} />);
  await userEvent.click(screen.getByRole('radio', { name: 'With hyperlanes' }));
  expect(screen.getByRole('button', { name: 'Switch layout' })).toBeInTheDocument();
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 4, faction: 'arborec' }, pok);
  view.rerender(<LayoutPicker game={useGame.getState().game!} pack={pok} />);
  expect(screen.queryByRole('button', { name: 'Switch layout' })).toBeNull();
});

test('the 3 and 4 player hyperlane layouts say they are as in Milty Draft, with the lane count', () => {
  open(3);
  expect(screen.getByText(/as in Milty Draft: 18 hyperlane slots, more than the 9/)).toBeInTheDocument();
  cleanup();
  open(4);
  expect(screen.getByText(/12 hyperlane slots/)).toBeInTheDocument();
  cleanup();
  open(5);
  expect(screen.queryByText(/Milty Draft/)).toBeNull();
});

test('the Russian labels are used in Russian', () => {
  setLanguage('ru');
  open(3);
  expect(screen.getByRole('radio', { name: 'Обычная' })).toBeInTheDocument();
  expect(screen.getByRole('radio', { name: 'С гиперпутями' })).toBeInTheDocument();
});
