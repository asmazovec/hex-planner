import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { kernelViewOf } from '../../testing/view';
import { useState } from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

vi.mock('../../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
  listGames: vi.fn(async () => []),
  requestPersistence: vi.fn(async () => true),
}));

import { loadPack } from '../../../data/loadPack';
import { componentById } from '../../../domain/components';
import { setLanguage } from '../../../i18n';
import { useGame } from '../../../state/gameStore';
import { AgendaChoices } from './AgendaChoices';

const pack = loadPack(['pok']);
const game = () => useGame.getState().game!;

afterEach(cleanup);
beforeEach(() => {
  setLanguage('en');
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 6, faction: 'arborec' }, pack);
});

/** The choices of the agenda `id`, kept alive: the test reads what the editor wrote. */
function show(id: string, laws: string[] = []): () => Record<string, string | number> | undefined {
  let current: Record<string, string | number> | undefined;
  function Host() {
    const [choices, setChoices] = useState<Record<string, string | number> | undefined>();
    current = choices;
    return <AgendaChoices table={kernelViewOf(game(), pack).table} pack={pack} agenda={componentById(pack, id)!} choices={choices} laws={laws} onChange={setChoices} />;
  }
  render(<Host />);
  return () => current;
}

test('a For/Against agenda: For and Against are chosen, one at a time, and a second press takes the choice back', async () => {
  const read = show('agenda:sanctions');
  await userEvent.click(screen.getByRole('button', { name: 'Against' }));
  expect(read()).toEqual({ outcome: 'against' });
  await userEvent.click(screen.getByRole('button', { name: 'For' }));
  expect(read()).toEqual({ outcome: 'for' });
  expect(screen.getByRole('button', { name: 'For' })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(screen.getByRole('button', { name: 'For' }));
  expect(read()).toBeUndefined();
});

test('an Elect Player agenda offers every player by the name of their faction, and writes their id', async () => {
  const read = show('agenda:censure');
  await userEvent.click(screen.getByRole('button', { name: `Elect ${pack.factions.arborec.name}` }));
  expect(read()).toEqual({ elect: 'me' });
});

test('an Elect Planet agenda offers the planets of the map, and writes the planet id', async () => {
  useGame.getState().setTile('1,0', '5');
  const read = show('agenda:core_mining');
  const planets = within(screen.getByRole('group', { name: 'Planet elected' }));
  const first = planets.getAllByRole('button')[0];
  await userEvent.click(first);
  expect(Object.keys(read() ?? {})).toEqual(['elect']);
});

test('an agenda with no outcome to choose offers nothing', () => {
  show('agenda:covert');
  expect(screen.queryAllByRole('button')).toEqual([]);
});

test('an Elect Law agenda offers the laws in play', async () => {
  const read = show('agenda:abolishment', ['agenda:sanctions']);
  await userEvent.click(screen.getByRole('button', { name: 'Elect Executive Sanctions' }));
  expect(read()).toEqual({ elect: 'agenda:sanctions' });
});
