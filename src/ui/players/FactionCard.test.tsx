import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import type { ExpansionId } from '../../domain/types';
import { setLanguage } from '../../i18n';
import { FactionCard } from './FactionCard';

const pack = loadPack(['pok', 'te']);

afterEach(cleanup);
beforeEach(() => setLanguage('ru'));

const show = (faction: string, expansions: ExpansionId[] = ['pok', 'te']) => render(<FactionCard faction={pack.factions[faction]} pack={pack} expansions={expansions} />);

test('home hex shows the tile number and each planet with its resources and influence', () => {
  show('letnev');
  const hex = screen.getByRole('img', { name: 'Домашний гекс' });
  expect(within(hex).getByText('10')).toBeInTheDocument();
  expect(within(hex).getByText('Arc Prime')).toBeInTheDocument();
  expect(within(hex).getByText('Wren Terra')).toBeInTheDocument();
  expect(hex.textContent).toContain(`${pack.planets.arcprime.resources}/${pack.planets.arcprime.influence}`);
  expect(hex.textContent).toContain(`${pack.planets.wrenterra.resources}/${pack.planets.wrenterra.influence}`);
});

test('starting ships have Russian unit names and counts from the pack', () => {
  show('sol');
  const rows = screen.getAllByTestId('ship').map(row => row.textContent);
  const { carrier, destroyer, fighter, infantry } = pack.factions.sol.startUnits;
  expect(rows).toEqual([`Транспортник${carrier}`, `Эсминец${destroyer}`, `Истребитель${fighter}`, `Пехота${infantry}`]);
});

test('commodities are shown under their Russian name', () => {
  show('hacan');
  expect(screen.getByText('Продукция').parentElement).toHaveTextContent(String(pack.factions.hacan.commodities));
});

test('starting technologies show name, printed text and the colour of their type', () => {
  show('sol');
  const amd = screen.getByText('Antimass Deflectors').closest('.tech')!;
  expect(amd).toHaveClass('tech-propulsion');
  expect(amd.textContent).toMatch(/Your ships can move into and through asteroid fields\./);
  expect(screen.getByText('Neural Motivator').closest('.tech')).toHaveClass('tech-biotic');
});

test('the printed text is English in either language, the interface follows the language', () => {
  setLanguage('en');
  show('sol');
  expect(screen.getByText('Antimass Deflectors').closest('.tech')!.textContent).toMatch(/Your ships can move into and through asteroid fields\./);
  expect(within(screen.getAllByTestId('ship')[0]).getByText('Carrier')).toBeInTheDocument();
});

test('a faction that chooses says so and lists the options with their texts', () => {
  show('argent');
  expect(screen.getByText('Выбор при подготовке: 2 из этих')).toBeInTheDocument();
  expect(screen.getByText('Sarween Tools').closest('.tech')!.textContent).toMatch(/reduce the combined cost of the produced units by 1/);
});

test('a free choice and an empty list read honestly, not as zero', () => {
  show('deepwrought');
  expect(screen.getByText('Выбор при подготовке: любые (2)')).toBeInTheDocument();
  cleanup();
  show('obsidian');
  expect(screen.getByText('Не указаны')).toBeInTheDocument();
});

test('a gate faction shows the planets of its off-map tile', () => {
  show('ghost');
  const hex = screen.getByRole('img', { name: 'Домашний гекс' });
  expect(within(hex).getByText('51')).toBeInTheDocument();
  expect(within(hex).getByText('Creuss')).toBeInTheDocument();
});

test('everything is visible at once: the card has no buttons', () => {
  show('jolnar');
  expect(screen.queryByRole('button')).toBeNull();
  expect(document.querySelectorAll('details')).toHaveLength(0);
});

test('home tiles of all factions fit the three planet places of the hex', () => {
  for (const faction of Object.values(pack.factions)) {
    expect(pack.tiles[faction.homeTile].planetIds.length, faction.id).toBeLessThanOrEqual(3);
  }
});

test('a long planet name beside another planet takes two lines, whole in the text', () => {
  show('obsidian');
  const hex = screen.getByRole('img', { name: 'Домашний гекс' });
  const lines = [...hex.querySelectorAll('.home-hex-name')].map(name => name.querySelectorAll('tspan').length);
  expect(lines).toEqual(pack.tiles[pack.factions.obsidian.homeTile].planetIds.map(id => (pack.planets[id].name.length > 10 ? 2 : 1)));
});

const itemOf = (name: string) => screen.getAllByTestId('sheet-item').find(item => item.textContent?.includes(name));

test('abilities, leaders, the mech and the breakthrough are signed with their expansion, with their printed text', () => {
  show('jolnar');
  expect(screen.getByText('Особенности фракции')).toBeInTheDocument();
  expect(itemOf('Brilliant')).toHaveTextContent('Base');
  expect(itemOf('Doctor Sucaban')).toHaveTextContent('Prophecy of Kings');
  expect(itemOf('Doctor Sucaban')).toHaveTextContent('Агент');
  expect(itemOf('Doctor Sucaban')).toHaveTextContent(/When a player spends resources to research: You may exhaust this card/);
  expect(itemOf('Doctor Sucaban')).not.toHaveTextContent('Открытие');
  expect(itemOf('Brilliant')).toHaveTextContent(/"Technology" strategy card: You may resolve the primary ability instead\./);
  const mech = pack.factions.jolnar.sheet!.mechs[0].name;
  expect(itemOf(mech)).toHaveTextContent('Цена 2');
  expect(itemOf(pack.factions.jolnar.sheet!.breakthrough!.name)).toHaveTextContent("Thunder's Edge");
});

test('Thunder\'s Edge puts Agnlan Oln in the place of Ta Zern, with the condition to unlock', () => {
  show('jolnar', ['pok']);
  expect(itemOf('Ta Zern')).toHaveTextContent('Prophecy of Kings');
  expect(itemOf('Agnlan Oln')).toBeUndefined();
  cleanup();
  show('jolnar', ['pok', 'te']);
  expect(itemOf('Ta Zern')).toBeUndefined();
  expect(itemOf('Agnlan Oln')).toHaveTextContent("Thunder's Edge");
  expect(itemOf('Agnlan Oln')).toHaveTextContent('Открытие: Own 8 technologies.');
});

test('without the expansions only the abilities stay', () => {
  show('jolnar', []);
  expect(screen.queryByText('Лидеры')).toBeNull();
  expect(screen.queryByText('Мех')).toBeNull();
  expect(screen.queryByText('Прорыв')).toBeNull();
  expect(itemOf('Brilliant')).toBeDefined();
});

test('faction technologies: name, type mark, prerequisites as marks, pack, printed text; a unit upgrade points to the ship table', () => {
  show('muaat');
  const group = screen.getByText('Технологии фракции').parentElement!;
  const reactor = within(group).getByText('Magmus Reactor').closest('.sheet-item')!;
  expect(within(reactor as HTMLElement).getByRole('img', { name: 'Военные' })).toBeInTheDocument();
  expect(within(reactor as HTMLElement).getByRole('img', { name: 'Требования: Военные, Военные' })).toBeInTheDocument();
  expect(reactor.textContent).toMatch(/Your ships can move into supernovas\./);
  expect(reactor.textContent).toContain('Base');
  const warSun = within(group).getByText('Prototype War Sun II').closest('.sheet-item')!;
  expect(warSun.textContent).toContain('Улучшение юнита: Солнце войны. Числа в таблице кораблей');
  expect(within(warSun as HTMLElement).getByRole('img', { name: 'Требования: Кибернетика, Военные, Военные, Военные' })).toBeInTheDocument();
});

test('a structure upgrade is a unit upgrade without the ship table; Keleres gets Executive Order with Thunder\'s Edge', () => {
  show('saar');
  const dock = screen.getByText('Floating Factory II').closest('.sheet-item')!;
  expect(dock.textContent).toContain('Улучшение юнита: База');
  expect(dock.textContent).not.toContain('таблице кораблей');
  cleanup();
  // With Thunder's Edge the name I.I.H.Q. Modernization returns as the Keleres breakthrough, outside this group.
  const techGroup = () => within(screen.getByText('Технологии фракции').parentElement!);
  show('keleresa');
  expect(techGroup().getByText('Executive Order')).toBeInTheDocument();
  expect(techGroup().queryByText('I.I.H.Q. Modernization')).toBeNull();
  cleanup();
  show('keleresa', ['pok']);
  expect(techGroup().getByText('I.I.H.Q. Modernization')).toBeInTheDocument();
  expect(techGroup().queryByText('Executive Order')).toBeNull();
});
