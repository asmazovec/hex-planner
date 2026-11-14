import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
  listGames: vi.fn(async () => []),
  requestPersistence: vi.fn(async () => true),
}));

import { loadPack } from '../../data/loadPack';
import { project } from '../../testing/old/domain/project';
import { offMapHomes } from '../../domain/strategy';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { PlanScreen } from '../screens/PlanScreen';
import { LegacyTile } from '../testing/legacyMap';
import { gameNow } from '../../testing/store';

const all = loadPack(['pok', 'te']);
const game = () => gameNow()!;
const tile = (slot: string) => document.querySelector(`[data-slot="${slot}"]`)!;

afterEach(cleanup);
beforeEach(() => {
  setLanguage('en');
  document.elementFromPoint = () => null;
});

// LRR 6 note 2: the Creuss home (51) and the Crimson home (118) are off the map, joined to their gate by a wormhole.
describe.each([['ghost', '51'], ['crimson', '118']])('the off-map home of %s', (faction, home) => {
  beforeEach(() => {
    useGame.getState().newGame({ expansions: ['pok', 'te'], playerCount: 6, faction }, all);
  });
  const gate = () => Object.keys(game().map).find(slot => game().map[slot] === all.factions[faction].gateTile)!;

  test('is drawn as a tile beside the map', () => {
    expect(offMapHomes(game(), all)).toEqual([home]);
    render(<PlanScreen />);
    expect(tile(home)).toBeInTheDocument();
    expect(tile(home).getAttribute('transform')).not.toBe('translate(0.00 0.00)');
  });

  test('starts a route to its gate, with its start fleet to take', async () => {
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
    await userEvent.click(screen.getByRole('button', { name: 'Tactical action' }));
    await userEvent.click(tile(gate()));
    await userEvent.click(tile(home));
    await userEvent.click(tile(gate()));
    const entry = game().plans[0].rounds[0].entries[0] as { moves: { from: string }[] };
    expect(entry.moves.map(m => m.from)).toEqual([home]);
    expect(screen.getByRole('button', { name: 'Take one Carrier' })).toBeVisible();
  });

  test('opens its big hex on a tap', async () => {
    render(<PlanScreen />);
    await userEvent.click(tile(home));
    expect(screen.getByRole('dialog')).toBeVisible();
  });
});

// LRR 6.1: a wormhole token gives its system the wormhole, and the tile shows it like a printed one.
test('a wormhole token put on a tile is drawn on it', () => {
  useGame.getState().newGame({ expansions: ['pok', 'te'], playerCount: 6, faction: 'ghost' }, all);
  const plain = (key: string) => all.tiles[game().map[key].split('@')[0]];
  const slot = Object.keys(game().map).find(key => plain(key)?.wormholes.length === 0 && plain(key).planetIds.length > 0)!;
  const state = { ...project(game(), game().plans[0], 'forecast', all).state, wormholeTokens: { alpha: slot } };
  render(<svg><LegacyTile slotKey={slot} pack={all} game={game()} state={state} /></svg>);
  expect(tile(slot).textContent).toContain('α');
});
