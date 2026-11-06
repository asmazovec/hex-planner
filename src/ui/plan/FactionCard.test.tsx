import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { setLanguage } from '../../i18n';
import { FactionCard } from './FactionCard';

const pack = loadPack(['pok', 'te']);

afterEach(cleanup);
beforeEach(() => setLanguage('ru'));

const show = (faction: string) => render(<FactionCard faction={pack.factions[faction]} pack={pack} />);

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
  expect(screen.getByText('Товары на обмен').parentElement).toHaveTextContent(String(pack.factions.hacan.commodities));
});

test('starting technologies show name, own description and the colour of their type', () => {
  show('sol');
  const amd = screen.getByText('Antimass Deflectors').closest('.tech')!;
  expect(amd).toHaveClass('tech-propulsion');
  expect(amd.textContent).toMatch(/астероид/);
  expect(screen.getByText('Neural Motivator').closest('.tech')).toHaveClass('tech-biotic');
});

test('descriptions follow the language', () => {
  setLanguage('en');
  show('sol');
  expect(screen.getByText('Antimass Deflectors').closest('.tech')!.textContent).toMatch(/asteroid/);
  expect(within(screen.getAllByTestId('ship')[0]).getByText('Carrier')).toBeInTheDocument();
});

test('a faction that chooses says so and lists the options with descriptions', () => {
  show('argent');
  expect(screen.getByText('Выбор при подготовке: 2 из этих')).toBeInTheDocument();
  expect(screen.getByText('Sarween Tools').closest('.tech')!.textContent).toMatch(/дешевле/);
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
