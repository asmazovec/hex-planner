import 'fake-indexeddb/auto';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { setLanguage } from '../../i18n';
import { flushSaves, useGame } from '../../state/gameStore';
import { deleteGame, listGames, loadGame } from '../../storage/db';
import { ShareConflict } from './ShareConflict';

const store = () => useGame.getState();
const LINK = '?name=Friday&exp=pok&factions=sol,arborec,hacan&map=25+26';
const pack = loadPack(['pok']);

async function savedNamed(name: string) {
  store().newGame({ expansions: ['pok'], playerCount: 3, faction: 'sol' }, pack);
  store().setName(name);
  store().setOpponent(0, { faction: 'arborec' });
  store().setOpponent(1, { faction: 'hacan' });
  store().setTile('0,-1', '25');
  store().setTile('1,-1', '26');
  await flushSaves();
  store().closeGame();
}

beforeEach(async () => {
  setLanguage('en');
  useGame.setState({ game: null, linkConflict: null });
  for (const { id } of await listGames()) await deleteGame(id);
});
afterEach(cleanup);

describe('opening a link with a name', () => {
  test('with no such save it creates and opens the game, set up as the link says', async () => {
    await store().openShareLink(LINK);
    expect(store().game).toMatchObject({ name: 'Friday', faction: 'sol', playerCount: 3, expansions: ['pok'] });
    expect(store().game?.map['0,-1']).toBe('25');
    expect(store().linkConflict).toBeNull();
    await flushSaves();
    expect((await listGames()).map(g => g.name)).toEqual(['Friday']);
  });

  test('without a faction of mine it waits in the draft, name and all', async () => {
    await store().openShareLink('?name=Friday&factions=-,arborec,hacan');
    expect(store().game).toBeNull();
    expect(store().draft.name).toBe('Friday');
    expect(store().draft.playerCount).toBe(3);
  });

  test('a save that agrees with the link just opens', async () => {
    await savedNamed('Friday');
    const before = await listGames();
    await store().openShareLink(LINK);
    expect(store().game?.id).toBe(before[0].id);
    expect(store().linkConflict).toBeNull();
    expect(await listGames()).toHaveLength(1);
  });

  test('a link that says less than the save does not disagree with it', async () => {
    await savedNamed('Friday');
    await store().openShareLink('?name=Friday');
    expect(store().game?.name).toBe('Friday');
    expect(store().linkConflict).toBeNull();
  });

  test('a save that disagrees is left alone until the player chooses', async () => {
    await savedNamed('Friday');
    await store().openShareLink('?name=Friday&exp=pok&factions=sol,letnev,hacan&map=30');
    expect(store().game).toBeNull();
    expect(store().linkConflict).toMatchObject({ name: 'Friday', differences: ['factions', 'map'] });
  });
});

describe('the choice', () => {
  async function conflict() {
    await savedNamed('Friday');
    await store().openShareLink('?name=Friday&exp=pok&factions=sol,letnev,hacan');
    render(<ShareConflict />);
  }

  test('says what differs', async () => {
    await conflict();
    expect(screen.getByRole('dialog')).toHaveTextContent('Friday');
    expect(screen.getByRole('dialog')).toHaveTextContent(/factions/i);
  });

  test('ignoring the link opens the save unchanged', async () => {
    await conflict();
    await userEvent.click(screen.getByRole('button', { name: 'Ignore the link, open the save' }));
    expect(store().game?.name).toBe('Friday');
    expect(store().game?.opponents.map(o => o.faction)).toContain('arborec');
    expect(store().linkConflict).toBeNull();
  });

  test('a new name makes a new game by the link, and the save stays', async () => {
    await conflict();
    const saved = (await listGames())[0];
    await userEvent.click(screen.getByRole('button', { name: 'Create a new game' }));
    expect(store().game).toMatchObject({ name: 'Friday 2' });
    expect(store().game?.opponents.map(o => o.faction)).toContain('letnev');
    expect(store().game?.id).not.toBe(saved.id);
    await flushSaves();
    expect((await loadGame(saved.id))?.table.players.map(p => p.faction)).toContain('arborec');
    expect(await listGames()).toHaveLength(2);
  });

  test('a name already taken cannot be used', async () => {
    await conflict();
    const field = screen.getByRole('textbox', { name: 'Name of the new game' });
    await userEvent.clear(field);
    await userEvent.type(field, 'Friday');
    expect(screen.getByRole('button', { name: 'Create a new game' })).toBeDisabled();
    expect(screen.getByText('A game with this name already exists.')).toBeVisible();
    await userEvent.clear(field);
    expect(screen.getByRole('button', { name: 'Create a new game' })).toBeDisabled();
  });
});
