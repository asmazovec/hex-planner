import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
}));

import { loadPack, strategyCards } from '../../../../data/loadPack';
import type { CardEntry } from '../../../../domain/strategy';
import { setLanguage } from '../../../../i18n';
import { useGame } from '../../../../state/gameStore';
import { PlanScreen } from '../../../screens/PlanScreen';

const store = () => useGame.getState();
const cardEntry = () => store().game!.plans[0].rounds.at(-1)!.entries.find((e): e is CardEntry => e.type === 'strategic' || e.type === 'secondary')!;

/** The Technology primary of my card, open in the editor, with Instinct Training (one biotic) researched. */
async function openResearch() {
  const mine = strategyCards(store().game!.expansions).find(c => c.name === 'Technology')!;
  store().setStrategyCard(1, mine.initiative);
  store().setStrategyCard(1, mine.initiative);
  render(<PlanScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
  await userEvent.click(screen.getByRole('button', { name: 'Strategy' }));
  await userEvent.click(within(screen.getByRole('group', { name: 'Card' })).getByRole('button', { name: /Technology/ }));
  act(() => store().updateEntry(cardEntry().id, { effects: { researched: ['technology:it'] } }));
}

beforeEach(() => {
  setLanguage('en');
  document.elementFromPoint = () => null;
  const pack = loadPack(['pok', 'te']);
  store().newGame({ expansions: ['pok', 'te'], playerCount: 6, faction: 'arborec' }, pack);
  store().setTile('0,-3', null);
  store().setTile('1,0', pack.factions.arborec.homeTile);
  store().setTile('0,1', '22');
  store().setPlanetControl('tarmann', 'me');
});
afterEach(cleanup);

describe('the Technology editor: prerequisites and specialties', () => {
  // LRR 90.12: a technology researched without its prerequisites is warned of, in the block of the technologies.
  test('a technology lacking its prerequisite shows the warning', async () => {
    await openResearch();
    expect(screen.getByText(/prerequisites of Instinct Training are not met/)).toBeVisible();
  });

  // LRR 90.14: a planet with a technology specialty, exhausted, ignores one prerequisite of its colour.
  test('pressing a planet with a specialty ignores one prerequisite, and pressing it again takes it back', async () => {
    await openResearch();
    const group = screen.getByRole('group', { name: 'Technology specialties' });
    await userEvent.click(within(group).getByRole('button', { name: /Tar'mann/ }));
    expect(cardEntry().effects?.specialties).toEqual(['tarmann']);
    expect(screen.queryByText(/prerequisites of Instinct Training are not met/)).toBeNull();
    await userEvent.click(within(group).getByRole('button', { name: /Tar'mann/ }));
    expect(cardEntry().effects?.specialties).toBeUndefined();
    expect(screen.getByText(/prerequisites of Instinct Training are not met/)).toBeVisible();
  });
});

describe('the second technology and its payment (argent playthrough)', () => {
  const choose = async (query: string, name: string) => {
    await userEvent.click(screen.getByRole('button', { name: /Research a technology/ }));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search components' }), query);
    await userEvent.click(await screen.findByRole('button', { name: `Choose ${name}` }));
  };

  test('taking the paid second technology back takes its payment back too', async () => {
    const pack = loadPack(['pok', 'te']);
    store().newGame({ expansions: ['pok', 'te'], playerCount: 6, faction: 'argent' }, pack);
    const mine = strategyCards(store().game!.expansions).find(c => c.name === 'Technology')!;
    store().setStrategyCard(1, mine.initiative);
    store().setStrategyCard(1, mine.initiative);
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
    await userEvent.click(screen.getByRole('button', { name: 'Strategy' }));
    await choose('aerie', 'Aerie Hololattice');
    await choose('strike wing alpha', 'Strike Wing Alpha II');
    expect(cardEntry().effects?.payment?.planets.length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: 'Remove Strike Wing Alpha II' }));
    expect(cardEntry().effects?.researched).toEqual(['technology:ah']);
    expect(cardEntry().effects?.payment ?? { planets: [] }).toEqual({ planets: [], tradeGoods: 0 });
  }, 30000);
});
