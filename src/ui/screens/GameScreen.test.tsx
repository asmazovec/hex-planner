import 'fake-indexeddb/auto';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { seatSlots } from '../../domain/mapBuilder';
import { createGame } from '../../domain/newGame';
import { setLanguage } from '../../i18n';
import { flushSaves, useGame } from '../../state/gameStore';
import { deleteGame, listGames, saveGame } from '../../storage/db';
import { sampleGame } from '../../storage/fixture';
import { exportGame } from '../../storage/transfer';
import { GameScreen } from './GameScreen';

afterEach(cleanup);

beforeEach(async () => {
  setLanguage('en');
  for (const g of await listGames()) await deleteGame(g.id);
  useGame.getState().closeGame();
  const expansions = ['pok', 'te'] as const;
  useGame.setState({ draft: createGame({ expansions: [...expansions], playerCount: 6, faction: '' }, loadPack([...expansions])), saveError: null });
});

const cards = () => screen.getAllByRole('group', { name: /^Player \d/ });
const card = (n: number) => screen.getByRole('group', { name: `Player ${n}` });
const factionOf = (n: number) => within(card(n)).getByRole('button', { name: /^(My faction|Opponent)$/ });
const option = (faction: string) => document.querySelector<HTMLButtonElement>(`[data-faction="${faction}"]`)!;
const token = (n: number) => screen.getByRole('button', { name: new RegExp(`^Player ${n},`) });
const pick = async (n: number, faction: string) => {
  await userEvent.click(factionOf(n));
  await userEvent.click(option(faction));
};
const startOpen = (playerCount = 4, faction = 'sol') =>
  useGame.getState().newGame({ expansions: ['pok', 'te'], playerCount, faction }, loadPack(['pok', 'te']));
const seats = () => {
  const { draft, game } = useGame.getState();
  const g = game ?? draft;
  return [g.seat, ...g.opponents.map(o => o.seat)];
};

let under: Element | null = null;
beforeEach(() => {
  under = null;
  document.elementFromPoint = () => under;
});

function drag(from: number, to: number) {
  fireEvent.pointerDown(token(from), { button: 0, isPrimary: true, clientX: 10, clientY: 10 });
  under = token(to);
  act(() => { window.dispatchEvent(new PointerEvent('pointermove', { clientX: 60, clientY: 60 })); });
  return () => act(() => { window.dispatchEvent(new PointerEvent('pointerup', { clientX: 60, clientY: 60 })); });
}

test('the draft is a list of cards: my faction first, opponents after, no count field', () => {
  render(<GameScreen />);
  expect(cards()).toHaveLength(6);
  expect(within(card(1)).getByText('My faction')).toBeInTheDocument();
  expect(within(card(2)).getByText('Opponent')).toBeInTheDocument();
  expect(screen.getByText('6 of 8')).toBeInTheDocument();
  expect(screen.queryByLabelText(/players/i)).toBeNull();
});

test('adding and removing change the cards, within 3 to 8', async () => {
  render(<GameScreen />);
  await userEvent.click(screen.getByRole('button', { name: /Add opponent/ }));
  await userEvent.click(screen.getByRole('button', { name: /Add opponent/ }));
  expect(cards()).toHaveLength(8);
  expect(screen.queryByRole('button', { name: /Add opponent/ })).toBeNull();
  for (let i = 0; i < 5; i++) await userEvent.click(within(cards().at(-1)!).getByRole('button', { name: 'Remove opponent' }));
  expect(cards()).toHaveLength(3);
  expect(within(card(3)).getByRole('button', { name: 'Remove opponent' })).toBeDisabled();
});

test('my faction has no remove button', () => {
  render(<GameScreen />);
  expect(within(card(1)).queryByRole('button', { name: 'Remove opponent' })).toBeNull();
});

test('a card shows faction data only after the choice, with no extra tap', async () => {
  render(<GameScreen />);
  expect(within(card(2)).queryByText('Commodities')).toBeNull();
  await pick(2, 'hacan');
  expect(within(card(2)).getByText('Commodities')).toBeInTheDocument();
  expect(within(card(2)).getByText('Sarween Tools')).toBeInTheDocument();
});

test('a faction taken by one player is disabled for the others', async () => {
  render(<GameScreen />);
  await pick(1, 'sol');
  await userEvent.click(factionOf(2));
  expect(option('sol')).toBeDisabled();
  expect(option('sol')).toHaveTextContent('Already taken');
  await userEvent.keyboard('{Escape}');
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('only starting information: no points on the cards', () => {
  render(<GameScreen />);
  expect(screen.queryByText('Points')).toBeNull();
  expect(screen.queryByRole('button', { name: /points/i })).toBeNull();
});

test('the start button waits for my faction, then starts with the list as set', async () => {
  render(<GameScreen />);
  expect(screen.getByRole('button', { name: 'Start game' })).toBeDisabled();
  expect(useGame.getState().game).toBeNull();
  await pick(1, 'sol');
  await pick(2, 'hacan');
  await userEvent.click(within(cards().at(-1)!).getByRole('button', { name: 'Remove opponent' }));
  drag(1, 3)();
  await userEvent.click(screen.getByRole('button', { name: 'Start game' }));
  const game = useGame.getState().game!;
  expect(game.faction).toBe('sol');
  expect(game.expansions).toEqual(['pok', 'te']);
  expect(game.playerCount).toBe(5);
  expect(game.seat).toBe(3);
  expect(game.opponents[0].faction).toBe('hacan');
  expect(game.map[seatSlots(5, loadPack(['pok', 'te']), game.layout)[2]]).toBe('1');
  expect(game.dataVersion).toBe(loadPack(['pok', 'te']).version);
});

test('a started game appears in the saved list, and a new game can follow', async () => {
  render(<GameScreen />);
  await pick(1, 'sol');
  await userEvent.click(screen.getByRole('button', { name: 'Start game' }));
  expect(await screen.findByRole('button', { name: 'Open' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Start game' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'New game' }));
  expect(useGame.getState().game).toBeNull();
  expect(screen.getByRole('button', { name: 'Start game' })).toBeDisabled();
});

test('faction options follow the expansions, and a dropped faction is cleared', async () => {
  render(<GameScreen />);
  const options = async () => {
    await userEvent.click(factionOf(1));
    const count = document.querySelectorAll('[data-faction]').length;
    await userEvent.keyboard('{Escape}');
    return count;
  };
  expect(await options()).toBe(Object.keys(loadPack(['pok', 'te']).factions).length);
  await pick(1, 'argent');
  await userEvent.click(screen.getByRole('button', { name: 'Prophecy of Kings' }));
  await userEvent.click(screen.getByRole('button', { name: "Thunder's Edge" }));
  expect(await options()).toBe(Object.keys(loadPack([]).factions).length);
  expect(factionOf(1)).toHaveTextContent('Choose');
});

test('without Prophecy of Kings the list stops at six', async () => {
  render(<GameScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Prophecy of Kings' }));
  await userEvent.click(screen.getByRole('button', { name: "Thunder's Edge" }));
  expect(screen.getByText('6 of 6')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Add opponent/ })).toBeNull();
});

test('a started game shows its expansions but does not change them', () => {
  startOpen();
  render(<GameScreen />);
  expect(screen.getByText('Prophecy of Kings', { selector: '.chip' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Prophecy of Kings' })).toBeNull();
});

test('the seat map has one token per player on the home positions, seat 1 at the top', () => {
  render(<GameScreen />);
  const pack = loadPack(['pok', 'te']);
  const slots = seatSlots(6, pack, 'standard');
  expect(slots[0]).toBe('0,-3');
  const y = (el: Element) => (el as HTMLElement).style.transform;
  // Seat 1 at the top: x is 0 and y is the most negative; seat 2 is to its right.
  expect(y(token(1).parentElement!)).toBe(`translate(0px, ${45 * (-3)}px)`);
  expect(y(token(2).parentElement!)).toBe(`translate(${39 * 3}px, ${45 * (-3 + 3 / 2)}px)`);
});

test('player 1 has the white ring, the others do not', () => {
  render(<GameScreen />);
  expect(token(1)).toHaveClass('seat-token-me');
  expect(token(2)).not.toHaveClass('seat-token-me');
});

test('dragging a token onto another swaps the two players', () => {
  render(<GameScreen />);
  drag(2, 5)();
  expect(seats()).toEqual([1, 5, 3, 4, 2, 6]);
});

test('a token dropped on an empty place or on itself changes nothing', () => {
  render(<GameScreen />);
  const end = drag(2, 5);
  under = null;
  end();
  expect(seats()).toEqual([1, 2, 3, 4, 5, 6]);
});

test('pointercancel changes nothing', () => {
  render(<GameScreen />);
  drag(2, 5);
  act(() => { window.dispatchEvent(new PointerEvent('pointercancel', { clientX: 60, clientY: 60 })); });
  expect(seats()).toEqual([1, 2, 3, 4, 5, 6]);
  // The gesture is over: a later release does nothing either.
  act(() => { window.dispatchEvent(new PointerEvent('pointerup', { clientX: 60, clientY: 60 })); });
  expect(seats()).toEqual([1, 2, 3, 4, 5, 6]);
});

test('tapping one token and then another swaps, and tapping the same one again cancels', () => {
  render(<GameScreen />);
  const tap = (n: number) => {
    fireEvent.pointerDown(token(n), { button: 0, isPrimary: true, clientX: 5, clientY: 5 });
    act(() => { window.dispatchEvent(new PointerEvent('pointerup', { clientX: 5, clientY: 5 })); });
  };
  tap(3);
  expect(token(3)).toHaveAttribute('aria-pressed', 'true');
  tap(3);
  expect(token(3)).toHaveAttribute('aria-pressed', 'false');
  expect(seats()).toEqual([1, 2, 3, 4, 5, 6]);
  tap(3);
  tap(1);
  expect(seats()).toEqual([3, 2, 1, 4, 5, 6]);
});

test('tokens work from the keyboard too', () => {
  render(<GameScreen />);
  fireEvent.keyDown(token(2), { key: 'Enter' });
  fireEvent.keyDown(token(4), { key: ' ' });
  expect(seats()).toEqual([1, 4, 3, 2, 5, 6]);
});

test('cards are not draggable: a badge starts nothing', () => {
  render(<GameScreen />);
  const badge = within(card(2)).getByText('2');
  fireEvent.pointerDown(badge, { button: 0, isPrimary: true, clientX: 5, clientY: 5 });
  under = token(5);
  act(() => { window.dispatchEvent(new PointerEvent('pointermove', { clientX: 60, clientY: 60 })); });
  act(() => { window.dispatchEvent(new PointerEvent('pointerup', { clientX: 60, clientY: 60 })); });
  expect(seats()).toEqual([1, 2, 3, 4, 5, 6]);
});

test('the faction stands next to its token', async () => {
  render(<GameScreen />);
  const map = screen.getByRole('group', { name: 'Seat map' });
  await pick(2, 'hacan');
  expect(within(map).getByText('Hacan')).toBeInTheDocument();
});

test('removing an opponent on a filled map asks first, and cancel changes nothing', async () => {
  startOpen(6);
  useGame.getState().setTile('1,0', '30');
  render(<GameScreen />);
  await userEvent.click(within(card(6)).getByRole('button', { name: 'Remove opponent' }));
  expect(useGame.getState().game!.playerCount).toBe(6);
  expect(screen.getByText(/Tiles on the map: 1, of them leaving: 0/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(useGame.getState().game!.playerCount).toBe(6);
  expect(screen.queryByText(/Tiles on the map/)).toBeNull();
  await userEvent.click(within(card(6)).getByRole('button', { name: 'Remove opponent' }));
  await userEvent.click(screen.getByRole('button', { name: 'Change' }));
  expect(useGame.getState().game!.playerCount).toBe(5);
  expect(useGame.getState().game!.map['1,0']).toBe('30');
});

test('removing an opponent who has units or planets says so, and only then asks', async () => {
  startOpen(6);
  const [first, second] = useGame.getState().game!.opponents.map(o => o.id);
  useGame.getState().setEnemyUnits('1,0', first, { cruiser: 2 });
  useGame.getState().setEnemyUnits('0,1', first, { fighter: 1 });
  useGame.getState().setPlanetControl('arc', first);
  render(<GameScreen />);
  await userEvent.click(within(card(2)).getByRole('button', { name: 'Remove opponent' }));
  expect(useGame.getState().game!.playerCount).toBe(6);
  expect(screen.getByText(/Units on the map: 3, planets: 1/)).toBeInTheDocument();
  expect(screen.queryByText(/Tiles on the map/)).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(useGame.getState().game!.enemyUnits['1,0']).toEqual({ [first]: { cruiser: 2 } });
  await userEvent.click(within(card(3)).getByRole('button', { name: 'Remove opponent' }));
  expect(useGame.getState().game!.opponents.map(o => o.id)).not.toContain(second);
  expect(screen.queryByText(/Units on the map/)).toBeNull();
  await userEvent.click(within(card(2)).getByRole('button', { name: 'Remove opponent' }));
  await userEvent.click(screen.getByRole('button', { name: 'Change' }));
  const game = useGame.getState().game!;
  expect(game.opponents.map(o => o.id)).not.toContain(first);
  expect(game.enemyUnits).toEqual({});
  expect(game.planetControl.arc).toBeUndefined();
});

test('adding on a filled map asks first too; a map with only home tiles does not', async () => {
  startOpen(4);
  render(<GameScreen />);
  await userEvent.click(screen.getByRole('button', { name: /Add opponent/ }));
  expect(useGame.getState().game!.playerCount).toBe(5);
  act(() => useGame.getState().setTile('1,0', '30'));
  await userEvent.click(screen.getByRole('button', { name: /Add opponent/ }));
  expect(useGame.getState().game!.playerCount).toBe(5);
  await userEvent.click(screen.getByRole('button', { name: 'Change' }));
  expect(useGame.getState().game!.playerCount).toBe(6);
});

test('the interface language is chosen here and remembered', async () => {
  render(<GameScreen />);
  await userEvent.click(screen.getByRole('radio', { name: 'Русский' }));
  expect(screen.getByRole('heading', { name: 'Игроки' })).toBeVisible();
  expect(localStorage.getItem('ti4.lang')).toBe('ru');
});

test('the map layout picker shows for 3 to 5 players only', () => {
  for (const [count, shown] of [[3, true], [4, true], [5, true], [6, false], [8, false]] as const) {
    startOpen(count);
    render(<GameScreen />);
    expect(screen.queryByRole('radio', { name: 'With hyperlanes' }) !== null).toBe(shown);
    cleanup();
  }
});

test('choosing the hyperlane layout changes the open game', async () => {
  startOpen(4);
  render(<GameScreen />);
  await userEvent.click(screen.getByRole('radio', { name: 'With hyperlanes' }));
  expect(useGame.getState().game!.layout).toBe('hyperlanes');
});

test('the layout can be chosen before the start as well', async () => {
  render(<GameScreen />);
  for (let i = 0; i < 2; i++) await userEvent.click(within(cards().at(-1)!).getByRole('button', { name: 'Remove opponent' }));
  await userEvent.click(screen.getByRole('radio', { name: 'With hyperlanes' }));
  expect(useGame.getState().draft.layout).toBe('hyperlanes');
});

test('importing a broken file shows the reason and keeps saved games', async () => {
  await saveGame(sampleGame());
  render(<GameScreen />);
  const file = new File(['{ not json'], 'bad.json', { type: 'application/json' });
  await userEvent.upload(screen.getByLabelText('Import game'), file);
  expect(await screen.findByRole('alert')).toHaveTextContent('not valid JSON');
  expect(await listGames()).toHaveLength(1);
  expect(useGame.getState().game).toBeNull();
});

test('importing a game whose id exists saves it as a new game', async () => {
  const game = sampleGame();
  await saveGame(game);
  render(<GameScreen />);
  const file = new File([exportGame(game)], 'g.json', { type: 'application/json' });
  await userEvent.upload(screen.getByLabelText('Import game'), file);
  await waitFor(async () => expect(await listGames()).toHaveLength(2));
  expect(useGame.getState().game!.id).not.toBe(game.id);
});

test('a failing save during import shows an error instead of throwing', async () => {
  const db = await import('../../storage/db');
  const spy = vi.spyOn(db, 'saveGame').mockRejectedValueOnce(new Error('quota exceeded'));
  render(<GameScreen />);
  const file = new File([exportGame(sampleGame())], 'g.json', { type: 'application/json' });
  await userEvent.upload(screen.getByLabelText('Import game'), file);
  expect(await screen.findByRole('alert')).toHaveTextContent('quota exceeded');
  spy.mockRestore();
});

test('the screen credits the authors of the game-icons', () => {
  render(<GameScreen />);
  const credit = screen.getByText(/game-icons\.net/);
  for (const part of ['recoloured', 'Star prominences', 'Flying flag', 'Missile mech', 'Sentry gun', 'Lorc', 'Defense satellite', 'Delapouite']) {
    expect(credit).toHaveTextContent(part);
  }
  expect(screen.getByRole('link', { name: 'CC BY 3.0' })).toHaveAttribute('href', 'https://creativecommons.org/licenses/by/3.0/');
});

test('a saved game goes after a second tap, and the open one closes with it', async () => {
  startOpen();
  await flushSaves();
  const { id } = useGame.getState().game!;
  render(<GameScreen />);
  await userEvent.click(await screen.findByRole('button', { name: 'Delete game' }));
  expect(await listGames()).toHaveLength(1);
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(await listGames()).toHaveLength(1);
  await userEvent.click(screen.getByRole('button', { name: 'Delete game' }));
  await userEvent.click(screen.getByRole('button', { name: 'Delete for good' }));
  await waitFor(async () => expect((await listGames()).map(g => g.id)).not.toContain(id));
  expect(useGame.getState().game).toBeNull();
});

test('the blur setting is remembered and reaches the stylesheet', async () => {
  render(<GameScreen />);
  const chip = screen.getByRole('button', { name: 'Background blur' });
  expect(chip).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(chip);
  expect(chip).toHaveAttribute('aria-pressed', 'false');
  expect(document.documentElement.dataset.blur).toBe('off');
  expect(localStorage.getItem('ti4.blur')).toBe('off');
  await userEvent.click(chip);
  expect(document.documentElement.dataset.blur).toBe('on');
});

test('the faction sheet groups by expansion, marks the choice, closes on a tap outside and can take the choice back', async () => {
  render(<GameScreen />);
  await pick(2, 'hacan');
  await userEvent.click(factionOf(2));
  const sheet = screen.getByRole('dialog', { name: /choose a faction/ });
  expect(within(sheet).getByRole('region', { name: 'Prophecy of Kings' })).toBeInTheDocument();
  expect(within(sheet).getByRole('region', { name: "Thunder's Edge" })).toBeInTheDocument();
  expect(option('hacan')).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(sheet.parentElement!);
  expect(screen.queryByRole('dialog')).toBeNull();
  await userEvent.click(factionOf(2));
  await userEvent.click(screen.getByRole('button', { name: 'No faction' }));
  expect(factionOf(2)).toHaveTextContent('Choose');
});
