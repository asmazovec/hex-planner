import 'fake-indexeddb/auto';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { deleteGame, listGames, loadRawGame, saveGame } from '../../storage/db';
import { brokenSave, oldFormatSave, putRawSave, sampleGame } from '../../testing/fixture';
import { GameScreen } from './GameScreen';

vi.mock('../common/download', () => ({ downloadGame: vi.fn(), downloadRaw: vi.fn() }));
import { downloadRaw } from '../common/download';

const item = async (name: string) => (await screen.findByText(name, { selector: '.saved-list strong' })).closest('li')!;

beforeEach(async () => {
  setLanguage('en');
  for (const g of await listGames()) await deleteGame(g.id);
  useGame.getState().closeGame();
  useGame.setState({ loadFailure: null, brokenSaves: {} });
  vi.mocked(downloadRaw).mockClear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setLanguage('ru');
});

test('a broken save is listed with the message, its data and its deletion; the others still open', async () => {
  const good = { ...sampleGame(), name: 'Good' };
  await saveGame(good);
  const record = brokenSave();
  await putRawSave(record);
  render(<GameScreen />);
  const broken = await item('Damaged');
  expect(within(broken).getByText('The save could not be loaded')).toBeVisible();
  expect(within(broken).queryByRole('button', { name: 'Open' })).toBeNull();

  await userEvent.click(within(broken).getByRole('button', { name: 'Export data' }));
  await waitFor(() => expect(downloadRaw).toHaveBeenCalledWith('broken', record));

  await userEvent.click(within(await item('Good')).getByRole('button', { name: 'Open' }));
  await waitFor(() => expect(useGame.getState().game?.id).toBe(good.id));
  expect((await listGames()).map(g => g.id)).toContain('broken');
});

test('a broken save goes only after the confirmation', async () => {
  await putRawSave(brokenSave());
  render(<GameScreen />);
  await userEvent.click(within(await item('Damaged')).getByRole('button', { name: 'Delete game' }));
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect((await listGames()).map(g => g.id)).toEqual(['broken']);
  await userEvent.click(within(await item('Damaged')).getByRole('button', { name: 'Delete game' }));
  await userEvent.click(screen.getByRole('button', { name: 'Delete for good' }));
  await waitFor(async () => expect(await listGames()).toEqual([]));
  await waitFor(() => expect(screen.queryByText('Damaged')).toBeNull());
});

test('a save that failed to open is told about on top and marked in the list, in Russian too', async () => {
  setLanguage('ru');
  await saveGame({ ...sampleGame(), id: 'crashed', name: 'Пятница' });
  useGame.setState({ loadFailure: { id: 'crashed', error: 'replay failed' }, brokenSaves: { crashed: 'replay failed' } });
  render(<GameScreen />);
  expect(await screen.findByText('Сохранение «Пятница» не удалось загрузить: replay failed')).toBeVisible();
  const crashed = await item('Пятница');
  expect(within(crashed).getByText('Сохранение не удалось загрузить')).toBeVisible();
  expect(within(crashed).getByRole('button', { name: 'Экспорт данных' })).toBeVisible();
  expect(within(crashed).queryByRole('button', { name: 'Открыть' })).toBeNull();
});

test('opening a save that fails tells so, and the screen still works', async () => {
  await putRawSave(brokenSave('odd', 'Odd'));
  await useGame.getState().openGame('odd');
  render(<GameScreen />);
  expect(await screen.findByText(/^The save “Odd” could not be loaded: plans/)).toBeVisible();
  expect(useGame.getState().game).toBeNull();
  expect(screen.getByRole('button', { name: 'Start game' })).toBeVisible();
});

test('importing a file that is no game says it is damaged, and the saves stay', async () => {
  await saveGame(sampleGame());
  render(<GameScreen />);
  const text = JSON.stringify({ ...sampleGame(), table: null });
  await userEvent.upload(screen.getByLabelText('Import game'), new File([text], 'bad.json', { type: 'application/json' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('the file is not a game or is damaged');
  expect(await listGames()).toHaveLength(1);
  expect(useGame.getState().game).toBeNull();
});

test('a save of an earlier version is listed with its own message, exports as it lies, and is never rewritten', async () => {
  const record = oldFormatSave();
  await putRawSave(record);
  const bytes = JSON.stringify(record);
  render(<GameScreen />);
  const old = await item('Earlier');
  expect(within(old).getByText('Saved by an earlier version of the app')).toBeVisible();
  expect(within(old).queryByText('The save could not be loaded')).toBeNull();
  expect(within(old).queryByRole('button', { name: 'Open' })).toBeNull();
  await userEvent.click(within(old).getByRole('button', { name: 'Export data' }));
  await waitFor(() => expect(downloadRaw).toHaveBeenCalledWith('old', record));

  await useGame.getState().openGame('old');
  expect(useGame.getState().game).toBeNull();
  expect(await screen.findByText('The save “Earlier” cannot be opened: it was saved by an earlier version of the app')).toBeVisible();
  expect(JSON.stringify(await loadRawGame('old'))).toBe(bytes);

  await userEvent.click(within(await item('Earlier')).getByRole('button', { name: 'Delete game' }));
  await userEvent.click(screen.getByRole('button', { name: 'Delete for good' }));
  await waitFor(async () => expect(await listGames()).toEqual([]));
});

test('a save of an earlier version says so in Russian', async () => {
  setLanguage('ru');
  await putRawSave(oldFormatSave('old', 'Пятница'));
  render(<GameScreen />);
  expect(within(await item('Пятница')).getByText('Сохранено прежней версией приложения')).toBeVisible();
});

test('importing a file of an earlier version says so, and nothing is saved', async () => {
  render(<GameScreen />);
  const text = JSON.stringify(oldFormatSave().game);
  await userEvent.upload(screen.getByLabelText('Import game'), new File([text], 'old.json', { type: 'application/json' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('the file was saved by an earlier version of the app');
  expect(await listGames()).toEqual([]);
  expect(useGame.getState().game).toBeNull();
});

test('when the saves cannot be listed the screen says so and stays usable', async () => {
  vi.spyOn(IDBObjectStore.prototype, 'getAllKeys').mockImplementation(() => { throw new DOMException('storage gone', 'UnknownError'); });
  render(<GameScreen />);
  expect(await screen.findByText('Saved games could not be loaded: storage gone')).toBeVisible();
  expect(screen.queryByText('No saved games')).toBeNull();
  expect(screen.getByRole('radio', { name: 'English' })).toBeEnabled();
});

test('the open game stands out in the list as the chosen one, and has nothing to open', async () => {
  const mine = { ...sampleGame(), id: 'mine', name: 'Mine' };
  const other = { ...sampleGame(), id: 'other', name: 'Other' };
  await saveGame(mine);
  await saveGame(other);
  await useGame.getState().openGame('mine');
  render(<GameScreen />);
  const current = await item('Mine');
  expect(current).toHaveAttribute('aria-current', 'true');
  expect(within(current).queryByRole('button', { name: 'Open' })).toBeNull();
  expect(within(current).getByText('Open now')).toBeVisible();
  const rest = await item('Other');
  expect(rest).not.toHaveAttribute('aria-current');
  expect(within(rest).getByRole('button', { name: 'Open' })).toBeVisible();

  await userEvent.click(within(rest).getByRole('button', { name: 'Open' }));
  await waitFor(async () => expect(await item('Other')).toHaveAttribute('aria-current', 'true'));
  expect(await item('Mine')).not.toHaveAttribute('aria-current');
});
