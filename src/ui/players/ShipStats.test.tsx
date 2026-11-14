import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as edits from '../../testing/entries';

vi.mock('../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
}));

import { loadPack } from '../../data/loadPack';
import { textOf } from '../../domain/components';
import { upgradesOf } from '../../domain/holdings';
import type { Entry, EntryBody } from '../../domain/types';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { PlanScreen } from '../screens/PlanScreen';
import { FactionCard } from './FactionCard';
import { ShipStats } from './ShipStats';

/** The interface of these tests is Russian, and so are the texts of the packs. */
const pack = loadPack(['pok', 'te'], 'ru');
const small = loadPack(['pok'], 'ru');
const english = loadPack(['pok', 'te'], 'en');
const CYRILLIC = /[а-яё]/i;
/** The text the Russian pack prints for a component: a translation, not the original. */
function printed(id: string): string {
  const text = textOf(pack, id);
  expect(text).toMatch(CYRILLIC);
  expect(text).not.toBe(textOf(english, id));
  return text;
}

afterEach(cleanup);
beforeEach(() => setLanguage('ru'));

const row = (kind: string) => screen.getByTestId(`ship-row-${kind}`);
const game = () => useGame.getState().game!;
/** The unit upgrades I hold from the start, as the panel marks them. */
const baseline = () => upgradesOf({ technologies: game().start.me.technologies ?? [] }, pack);
const round = () => game().plans[0].rounds[0];
const startPlan = (faction = 'arborec') => {
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 6, faction }, small);
  useGame.getState().setTile('0,-3', null);
};
const addEntry = (body: EntryBody): string => edits.addEntry(1, body, 'action');

describe('the table', () => {
  test('shows cost, capacity, combat and move in this order, base values with no buttons', () => {
    render(<ShipStats factionId="arborec" pack={pack} />);
    expect(screen.getByText('Цена')).toBeInTheDocument();
    expect(screen.getByText('Груз')).toBeInTheDocument();
    expect(screen.getByText('Бой')).toBeInTheDocument();
    expect(screen.getByText('Скорость')).toBeInTheDocument();
    const values = (kind: string) => [...row(kind).querySelectorAll('.ship-row-value')].map(cell => cell.textContent);
    expect(values('carrier')).toEqual(['3', '4', '9', '1']);
    expect(values('fighter')).toEqual(['½', '—', '9', '—']);
    expect(values('flagship')).toEqual(['8', '5', '7×2', '1']);
    expect(screen.queryByRole('button')).toBeNull();
  });

  test('names a unique ship in English beside the translated type', () => {
    render(<ShipStats factionId="argent" pack={pack} />);
    expect(within(row('destroyer')).getByText('Эсминец')).toBeInTheDocument();
    expect(within(row('destroyer')).getByText('Strike Wing Alpha I')).toBeInTheDocument();
    expect(within(row('flagship')).getByText('Quetzecoatl')).toBeInTheDocument();
    expect(within(row('carrier')).queryByText(/Carrier/)).toBeNull();
  });

  test('a changed value is gold with old and new; the name, properties and printed ability follow the level', () => {
    const { rerender } = render(<ShipStats factionId="argent" pack={pack} upgraded={[]} />);
    expect(row('destroyer')).toHaveTextContent('Заградительный огонь 9×2');
    rerender(<ShipStats factionId="argent" pack={pack} upgraded={['destroyer']} />);
    expect(within(row('destroyer')).getByText('Strike Wing Alpha II')).toBeInTheDocument();
    const combat = row('destroyer').querySelectorAll('.ship-row-value')[2];
    expect(combat.textContent).toBe('8 → 7');
    expect(combat.querySelector('em')).toHaveTextContent('7');
    expect(row('destroyer').querySelectorAll('.ship-row-value')[0].querySelector('em')).toBeNull();
    expect(row('destroyer')).toHaveTextContent('Заградительный огонь 6×3');
    expect(row('destroyer').textContent).toContain(printed('unit:argent_destroyer2'));
  });

  test('properties and the printed ability in the chosen language: war sun and a space cannon', () => {
    render(<ShipStats factionId="xxcha" pack={pack} />);
    expect(row('flagship')).toHaveTextContent('Поглощение урона');
    expect(row('flagship')).toHaveTextContent('Космическая пушка 5×3');
    expect(row('flagship').textContent).toContain(printed('unit:xxcha_flagship'));
    expect(row('flagship').textContent).not.toMatch(/adjacent systems/);
    expect(row('warsun')).toHaveTextContent('Бомбардировка 3×3');
    cleanup();
    setLanguage('en');
    render(<ShipStats factionId="xxcha" pack={loadPack(['pok', 'te'])} />);
    expect(row('flagship')).toHaveTextContent('Sustain Damage');
    expect(row('flagship').textContent).toMatch(/adjacent systems/);
    expect(row('flagship').textContent).not.toMatch(CYRILLIC);
  });
});

describe('the Game screen card', () => {
  test('shows base values, read only', () => {
    render(<FactionCard faction={pack.factions.l1z1x} pack={pack} expansions={['pok', 'te']} />);
    expect(row('dreadnought').querySelectorAll('.ship-row-value')[1].textContent).toBe('2');
    expect(row('dreadnought').tagName).not.toBe('BUTTON');
  });
});

describe('the players panel of the plan screen', () => {
  const openPlayers = async () => {
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Игроки' }));
  };
  const cardOf = (n: number) => screen.getByRole('group', { name: `Игрок ${n}` });

  test('it is a reference: no way to change a faction, add or remove a player, or toggle a ship', async () => {
    startPlan();
    act(() => useGame.getState().setOpponent(0, { faction: 'sol' }));
    await openPlayers();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(within(cardOf(2)).getByText(/Federation of Sol/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Добавить игрока' })).toBeNull();
    expect(within(cardOf(2)).queryByRole('button', { name: 'Убрать игрока' })).toBeNull();
    await userEvent.click(within(cardOf(1)).getByTestId('ship-row-carrier'));
    expect(baseline()).toEqual([]);
  });

  test('a type upgraded by an entry shows the current value and its round, and does not toggle', async () => {
    startPlan();
    addEntry({ type: 'strategic', effects: { researched: ['technology:cv2'] } });
    await openPlayers();
    const carrier = within(cardOf(1)).getByTestId('ship-row-carrier');
    expect(carrier.querySelectorAll('.ship-row-value')[1].textContent).toBe('4 → 6');
    expect(carrier).toHaveTextContent('раунд 1');
  });
});

describe('the unit cards of the components drawer', () => {
  const open = async () => {
    render(<PlanScreen />);
    await userEvent.click(screen.getByRole('button', { name: /Компоненты/ }));
    return screen.getByRole('dialog', { name: 'Компоненты' });
  };
  const card = (panel: HTMLElement, kind: string) => within(panel).getByTestId(`upgrade-${kind}`);

  test('one card per type: a tap toggles I and II in the baseline, the button counts them', async () => {
    startPlan();
    const panel = await open();
    expect(within(panel).getAllByRole('button', { pressed: false }).length).toBeGreaterThan(0);
    const carrier = card(panel, 'carrier');
    expect(carrier).toHaveTextContent('Транспортник');
    expect(carrier.querySelector('.upgrade-level')).toHaveTextContent('I');
    await userEvent.click(carrier);
    expect(baseline()).toEqual(['carrier']);
    expect(carrier).toHaveAttribute('aria-pressed', 'true');
    expect(carrier.querySelector('.upgrade-level')).toHaveTextContent('II');
    expect(carrier).toHaveTextContent('4 → 6');
    expect(screen.getByRole('button', { name: 'Технологии · 2' })).toBeInTheDocument();
    await userEvent.click(carrier);
    expect(baseline()).toEqual([]);
    expect(screen.getByRole('button', { name: 'Технологии · 1' })).toBeInTheDocument();
  });

  test('a type with no level II shows a dash and does not react', async () => {
    startPlan();
    const panel = await open();
    const warsun = card(panel, 'warsun');
    expect(warsun).toBeDisabled();
    expect(warsun.querySelector('.upgrade-level')).toHaveTextContent('—');
    expect(warsun).toHaveTextContent('Бомбардировка 3×3');
  });

  test('follows the mode of the map: a planned entry shows in the forecast, not now; it does not toggle', async () => {
    startPlan();
    useGame.getState().setTile('1,0', '25');
    addEntry({ type: 'secondary', effects: { researched: ['technology:cv2'] } });
    const panel = await open();
    expect(card(panel, 'carrier')).toBeDisabled();
    expect(card(panel, 'carrier')).toHaveTextContent('с раунда 1');
    expect(card(panel, 'carrier')).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Факт' }));
    expect(card(panel, 'carrier')).toBeEnabled();
    expect(card(panel, 'carrier')).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(card(panel, 'carrier'));
    expect(baseline()).toEqual(['carrier']);
    expect(game().plans[0].rounds[0].entries[0]).toMatchObject({ effects: { researched: ['technology:cv2'] } });
  });

  test('a type in the baseline that an entry also upgrades shows the entry and takes no tap; the baseline stays', async () => {
    startPlan();
    act(() => useGame.getState().setStartHolding('me', 'technology:cv2', true));
    addEntry({ type: 'strategic', effects: { researched: ['technology:cv2'] } });
    const panel = await open();
    expect(card(panel, 'carrier')).toBeDisabled();
    expect(card(panel, 'carrier')).toHaveTextContent('с раунда 1');
    expect(baseline()).toEqual(['carrier']);
  });

  test('closes on a second tap on its tab', async () => {
    startPlan();
    await open();
    await userEvent.click(screen.getByRole('button', { name: /^Технологии/ }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('upgrades in an entry', () => {
  const entryOf = (id: string) => document.querySelector<HTMLElement>(`[data-entry-id="${id}"]`)!;
  const entries = (): Entry[] => round().entries;
  const openCard = async (id: string) => {
    await userEvent.click(within(entryOf(id)).getByRole('button', { name: /^Изменить: / }));
    return within(screen.getByRole('group', { name: 'Улучшение' }));
  };

  test('the row stands in the Technology editor only, not in the list', async () => {
    startPlan();
    const technology = addEntry({ type: 'strategic', card: 7 });
    const trade = addEntry({ type: 'strategic', card: 5 });
    render(<PlanScreen />);
    expect(screen.queryByRole('group', { name: 'Улучшение' })).toBeNull();
    await userEvent.click(within(entryOf(trade)).getByRole('button', { name: /^Изменить: / }));
    expect(screen.queryByRole('group', { name: 'Улучшение' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Готово' }));
    expect(await openCard(technology)).toBeTruthy();
  });

  test('ships with a level II can be marked and unmarked, one undo step each', async () => {
    startPlan();
    const id = addEntry({ type: 'secondary', card: 7 });
    render(<PlanScreen />);
    const row = await openCard(id);
    expect(row.queryByRole('button', { name: 'Солнце войны' })).toBeNull();
    await userEvent.click(row.getByRole('button', { name: 'Транспортник' }));
    expect(entries()[0]).toMatchObject({ effects: { researched: ['technology:cv2'] } });
    expect(row.getByRole('button', { name: 'Транспортник' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(row.getByRole('button', { name: 'Транспортник' }));
    expect((entries()[0] as { effects?: { researched?: unknown } }).effects?.researched).toBeUndefined();
    act(() => useGame.getState().undo());
    expect(entries()[0]).toMatchObject({ effects: { researched: ['technology:cv2'] } });
    act(() => useGame.getState().undo());
    expect((entries()[0] as { effects?: { researched?: unknown } }).effects?.researched).toBeUndefined();
  });

  test('a ship upgraded earlier in the replay is owned and takes no tap', async () => {
    startPlan();
    addEntry({ type: 'strategic', card: 7, effects: { researched: ['technology:cv2'] } });
    const later = addEntry({ type: 'secondary', card: 7, effects: { researched: ['technology:cr2'] } });
    render(<PlanScreen />);
    const row = await openCard(later);
    const owned = row.getByRole('button', { name: 'Транспортник' });
    expect(owned).toBeDisabled();
    expect(owned).toHaveClass('entry-upgrade-owned');
    expect(row.getByRole('button', { name: 'Крейсер' })).toHaveAttribute('aria-pressed', 'true');
  });
});
