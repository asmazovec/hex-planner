import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
}));

import { loadPack } from '../../data/loadPack';
import { project } from '../../domain/project';
import type { Entry, UnitCounts } from '../../domain/types';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { HexStage, type HexStageProps } from './HexStage';

const pack = loadPack(['pok']);
const full = loadPack(['pok', 'te']);
const SLOT = '1,0';
/** Tile 25 has one planet, tile 71 two. */
const ONE = '25';
const TWO = '71';

const store = () => useGame.getState();
const game = () => store().game!;
const plan = () => game().plans.find(p => p.id === game().activePlanId)!;
const entries = () => plan().rounds.at(-1)!.entries;
const forecast = () => project(game(), plan(), 'forecast', pack).state;
const opponent = (n: number) => game().opponents[n].id;

afterEach(cleanup);
beforeEach(() => {
  setLanguage('en');
  store().newGame({ expansions: ['pok'], playerCount: 4, faction: 'sol' }, pack);
  store().setTile(SLOT, ONE);
});

const onClose = vi.fn();
const open = (props: Partial<HexStageProps> = {}, usePack = pack) =>
  render(<HexStage slot={SLOT} roundNo={1} pack={usePack} onClose={onClose} {...props} />);
const tap = (name: string | RegExp) => userEvent.click(screen.getByRole('button', { name }));
const mode = (name: 'Setup' | 'Battle' | 'Build') => tap(name);
const side = (name: string | RegExp) => userEvent.click(within(screen.getByRole('group', { name: 'Whose units' })).getByRole('button', { name }));
const addMine = (units: UnitCounts, ground?: Record<string, UnitCounts>) =>
  store().addEntry(1, { type: 'adjustment', label: 'start', delta: { units: { systemId: SLOT, units }, ground } }, 'strategy');
const merged = (kind: string) => entries().find((e): e is Extract<Entry, { type: 'adjustment' }> => e.type === 'adjustment' && e.kind === kind);
const quann = () => pack.tiles[ONE].planetIds[0];

describe('the stage as a window', () => {
  test('it opens on Setup, and Escape closes it', async () => {
    onClose.mockClear();
    open();
    expect(screen.getByRole('dialog', { name: 'Tile 25' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Setup' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('a tap outside closes it, a tap inside does not', async () => {
    onClose.mockClear();
    const { container } = open();
    await userEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
    await userEvent.click(container.querySelector('.stage')!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('the owner toggle lists me and each opponent in their colours', () => {
    open();
    const owners = within(screen.getByRole('group', { name: 'Whose units' }));
    expect(owners.getAllByRole('button').map(b => b.textContent)).toEqual(['Mine', 'Player 2', 'Player 3', 'Player 4']);
    const dot = owners.getByRole('button', { name: 'Player 3' }).querySelector('.owner-dot') as HTMLElement;
    expect(dot.style.background).toContain(`--player-${game().opponents[1].color}`);
  });

  test('a mode can be given, the shop limited, and the toggle goes with a limit', () => {
    open({ initialMode: 'build', only: 'units' });
    expect(screen.getByRole('button', { name: 'Build' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('group', { name: 'Whose units' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Carrier' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'PDS' })).toBeNull();
    cleanup();
    open({ initialMode: 'build', only: 'build' });
    expect(screen.queryByRole('button', { name: 'Carrier' })).toBeNull();
    expect(screen.getByRole('button', { name: 'PDS' })).toBeVisible();
  });

  test('a mech is absent without Prophecy of Kings', () => {
    open({}, loadPack([]));
    expect(screen.queryByRole('button', { name: 'Mech' })).toBeNull();
  });
});

describe('setup', () => {
  test('a picture places my unit in one merged entry, a token removes it, and nothing leaves no entry', async () => {
    open();
    await tap('Cruiser');
    await tap('Cruiser');
    await tap('Infantry');
    expect(entries()).toHaveLength(1);
    expect(merged('setup')).toMatchObject({
      status: 'done', delta: { units: { systemId: SLOT, units: { cruiser: 2 } }, ground: { [quann()]: { infantry: 1 } } },
    });
    await tap('Cruiser ×2');
    await tap('Cruiser ×1');
    await tap('Infantry ×1');
    expect(entries()).toEqual([]);
  });

  test('a token from an earlier entry can be removed: the setup holds a negative count', async () => {
    addMine({ carrier: 2 }, { [quann()]: { infantry: 1 } });
    open();
    await tap('Carrier ×2');
    await tap('Infantry ×1');
    expect(merged('setup')?.delta).toEqual({ units: { systemId: SLOT, units: { carrier: -1 } }, ground: { [quann()]: { infantry: -1 } } });
    expect(forecast().systems[SLOT]).toEqual({ carrier: 1 });
  });

  test('setup shows no prices and no total', () => {
    open();
    expect(within(screen.getByRole('button', { name: 'Carrier' })).queryByText('3')).toBeNull();
    expect(screen.queryByText(/Bought/)).toBeNull();
  });

  test('enemy units go to the chosen opponent with undo, and any owner can be tapped', async () => {
    open();
    await side('Player 3');
    await tap('Cruiser');
    expect(game().enemyUnits[SLOT]).toEqual({ [opponent(1)]: { cruiser: 1 } });
    await side('Player 2');
    await tap('Infantry');
    expect(game().enemyGround).toEqual({ [quann()]: { [opponent(0)]: { infantry: 1 } } });
    await tap('Cruiser ×1 (Player 3)');
    expect(game().enemyUnits[SLOT]).toBeUndefined();
    store().undo();
    expect(game().enemyUnits[SLOT][opponent(1)]).toEqual({ cruiser: 1 });
    expect(entries()).toEqual([]);
  });

  test('structures: a picture adds to the target planet, a token removes', async () => {
    open();
    await tap('PDS');
    await tap('PDS');
    await tap('Space dock');
    expect(game().pds).toEqual({ [quann()]: 2 });
    expect(game().docks).toContain(quann());
    await tap('PDS ×2');
    expect(game().pds).toEqual({ [quann()]: 1 });
    await userEvent.click(document.querySelector('[data-stack="me|spacedock|0"] .token-hit')!);
    expect(game().docks).not.toContain(quann());
  });

  test('a structure takes the colour of the planet, whatever the owner toggle says', async () => {
    store().setPlanetControl(quann(), opponent(1));
    open();
    await side('Player 2');
    await tap('PDS');
    expect(screen.getByRole('button', { name: 'PDS ×1 (Player 3)' })).toBeVisible();
  });

  test('ground units and structures need a planet', () => {
    store().setTile(SLOT, '39');
    open();
    expect(screen.getByRole('button', { name: 'Infantry' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'PDS' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Carrier' })).toBeEnabled();
    expect(screen.getByText('No planets')).toBeVisible();
  });

  test('a planet tap chooses the target of ground units and structures, and shows its details', async () => {
    store().setTile(SLOT, TWO);
    const [first, second] = pack.tiles[TWO].planetIds;
    open();
    expect(screen.getByRole('group', { name: pack.planets[first].name })).toBeVisible();
    await tap(new RegExp(`^${pack.planets[second].name}:`));
    expect(screen.getByRole('group', { name: pack.planets[second].name })).toBeVisible();
    expect(screen.queryByRole('group', { name: pack.planets[first].name })).toBeNull();
    await tap('Infantry');
    await tap('PDS');
    expect(merged('setup')?.delta.ground).toEqual({ [second]: { infantry: 1 } });
    expect(game().pds).toEqual({ [second]: 1 });
  });

  test('the panel carries the tile number, rotation, anomaly and wormholes', () => {
    store().setTile(SLOT, '39@2');
    open();
    expect(screen.getByRole('dialog', { name: 'Tile 39' })).toBeVisible();
    expect(screen.getByText('Rotation: 120°')).toBeVisible();
    expect(screen.getByText(`Wormholes: ${pack.tiles['39'].wormholes.join(', ')}`)).toBeVisible();
    cleanup();
    store().setTile(SLOT, '41');
    open();
    expect(screen.getByText('Anomaly: Gravity rift')).toBeVisible();
  });

  test('control lists me, each opponent and nobody', async () => {
    open();
    const control = within(screen.getByRole('group', { name: `Control of ${pack.planets[quann()].name}` }));
    expect(control.getAllByRole('button').map(b => b.textContent)).toEqual(['Mine', 'Player 2', 'Player 3', 'Player 4', 'None']);
    await userEvent.click(control.getByRole('button', { name: 'Player 3' }));
    expect(game().planetControl[quann()]).toBe('enemy');
    expect(game().planetOwner[quann()]).toBe(opponent(1));
    expect(control.getByRole('button', { name: 'Player 3' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(control.getByRole('button', { name: 'None' }));
    expect(game().planetControl[quann()]).toBeUndefined();
  });

  test('tile 66: the ability and its retelling in the current language, and the traits', () => {
    store().setTile(SLOT, '66');
    open();
    const planet = within(screen.getByRole('group', { name: "Hope's End" }));
    expect(planet.getByText('Imperial Arms Vault')).toBeInTheDocument();
    expect(planet.getByText(/mech from reinforcements/)).toBeInTheDocument();
    expect(planet.getByText('Hazardous')).toBeInTheDocument();
    expect(planet.getByText(/Ready/)).toBeInTheDocument();
    expect(planet.queryByText(/relic/i)).toBeNull();
    cleanup();
    setLanguage('ru');
    open();
    expect(screen.getByText(/1 меха из запаса/)).toBeInTheDocument();
  });

  test('two traits with swatches, specialties, and the relic of a Fracture planet', () => {
    store().newGame({ expansions: ['pok', 'te'], playerCount: 4, faction: 'sol' }, full);
    store().setTile(SLOT, '101');
    const { container } = open({}, full);
    const planet = within(screen.getByRole('group', { name: 'Olergodt' }));
    expect(planet.getByText('Hazardous')).toBeInTheDocument();
    expect(planet.getByText('Cultural')).toBeInTheDocument();
    expect(container.querySelectorAll('.trait-swatch')).toHaveLength(2);
    expect(planet.getByText(/Warfare/)).toBeInTheDocument();
    expect(planet.queryByText(/relic/i)).toBeNull();
    cleanup();
    store().setTile(SLOT, 'fracture4');
    open({}, full);
    const styx = within(screen.getByRole('group', { name: 'Styx' }));
    expect(styx.getByText(/relic/i)).toBeInTheDocument();
    expect(styx.getByText('A Song Like Marrow')).toBeInTheDocument();
  });

  test('names follow the interface language', () => {
    setLanguage('ru');
    addMine({ warsun: 1 });
    open();
    expect(screen.getByRole('button', { name: 'Солнце войны ×1' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Расстановка' })).toBeInTheDocument();
    expect(screen.queryByText('War Sun')).toBeNull();
  });
});

describe('battle', () => {
  test('there are no steppers and one strip per player', async () => {
    open({ initialMode: 'battle' });
    expect(screen.queryByRole('button', { name: /^(\+|−)$/ })).toBeNull();
    for (const name of ['Losses, mine', 'Losses, Player 2', 'Losses, Player 3', 'Losses, Player 4']) expect(screen.getByRole('group', { name })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Carrier' })).toBeNull();
    expect(screen.getAllByText('No losses')).toHaveLength(4);
  });

  test('a tap on my token records a loss in one merged entry, by planet too; the strip gives it back', async () => {
    addMine({ carrier: 2 }, { [quann()]: { infantry: 1 } });
    open({ initialMode: 'battle' });
    await tap('Carrier ×2');
    await tap('Infantry ×1');
    expect(merged('losses')?.delta).toEqual({ units: { systemId: SLOT, units: { carrier: -1 } }, ground: { [quann()]: { infantry: -1 } } });
    expect(forecast().ground[quann()]).toEqual({});
    const strip = within(screen.getByRole('group', { name: 'Losses, mine' }));
    await userEvent.click(strip.getByRole('button', { name: 'Give back Carrier' }));
    await userEvent.click(strip.getByRole('button', { name: 'Give back Infantry' }));
    expect(merged('losses')).toBeUndefined();
    expect(forecast().systems[SLOT]).toEqual({ carrier: 2 });
  });

  test('my losses stay when the stage opens again', async () => {
    addMine({ carrier: 2 });
    open({ initialMode: 'battle' });
    await tap('Carrier ×2');
    cleanup();
    open({ initialMode: 'battle' });
    expect(within(screen.getByRole('group', { name: 'Losses, mine' })).getByRole('button', { name: 'Give back Carrier' })).toBeVisible();
  });

  test('an enemy loss edits their units and goes to their own strip; the strip gives it back', async () => {
    store().setEnemyUnits(SLOT, opponent(0), { cruiser: 2 });
    store().setEnemyUnits(SLOT, opponent(1), { cruiser: 1 });
    open({ initialMode: 'battle' });
    await tap('Cruiser ×2 (Player 2)');
    expect(game().enemyUnits[SLOT][opponent(0)]).toEqual({ cruiser: 1 });
    expect(entries()).toEqual([]);
    const strip = within(screen.getByRole('group', { name: 'Losses, Player 2' }));
    expect(within(screen.getByRole('group', { name: 'Losses, Player 3' })).getByText('No losses')).toBeVisible();
    await userEvent.click(strip.getByRole('button', { name: 'Give back Cruiser' }));
    expect(game().enemyUnits[SLOT][opponent(0)]).toEqual({ cruiser: 2 });
    expect(strip.getByText('No losses')).toBeVisible();
  });

  test('the whole circle of a token takes the tap, not only its picture', () => {
    addMine({ carrier: 1 });
    const { container } = open({ initialMode: 'battle' });
    fireEvent.click(container.querySelector('[data-stack="me|carrier|-"] .token-hit')!);
    expect(merged('losses')?.delta.units?.units).toEqual({ carrier: -1 });
  });
});

describe('build', () => {
  const tactical = () => entries().find((e): e is Extract<Entry, { type: 'tactical' }> => e.type === 'tactical')!;
  const addTactical = (slot = SLOT) => store().addEntry(1, {
    type: 'tactical', systemId: slot, moves: [], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 },
  }, 'action');
  const ring = (container: HTMLElement, key: string) => container.querySelector(`[data-stack="${key}"] .token-ring`);
  const total = () => document.querySelector('.stage-total b')!.textContent;

  test('without a tactical entry my purchases go to a merged adjustment, and a warning does not block them', async () => {
    open({ initialMode: 'build' });
    expect(screen.getByText('No space dock in this system.')).toBeVisible();
    await tap('Carrier');
    await tap('Carrier');
    await tap('Infantry');
    expect(entries()).toHaveLength(1);
    expect(merged('build')).toMatchObject({ status: 'planned', delta: { units: { units: { carrier: 2 } }, ground: { [quann()]: { infantry: 1 } } } });
    expect(screen.getByText('Bought: 3')).toBeVisible();
    expect(total()).toBe('7');
  });

  test('a dock on the tile takes the warning away', () => {
    store().setDock(quann(), true);
    open({ initialMode: 'build' });
    expect(screen.queryByText('No space dock in this system.')).toBeNull();
  });

  test('with a tactical entry on the system they go to its production, with the automatic payment', async () => {
    store().setTile(SLOT, pack.factions.sol.homeTile);
    store().setPlanetControl('jord', 'me');
    addTactical();
    open({ initialMode: 'build' });
    await tap('Cruiser');
    expect(tactical().production).toEqual({ cruiser: 1 });
    expect(tactical().payment.planets).toEqual(['jord']);
    expect(merged('build')).toBeUndefined();
    await tap('Cruiser ×1');
    expect(tactical().production).toEqual({});
    expect(tactical().payment.planets).toEqual([]);
  });

  test('a payment chosen by hand stays', async () => {
    addTactical();
    const id = tactical().id;
    store().updateEntry(id, { payment: { planets: ['chosen'], tradeGoods: 0 } });
    open({ initialMode: 'build', manualPayments: [id] });
    await tap('Cruiser');
    expect(tactical().production).toEqual({ cruiser: 1 });
    expect(tactical().payment.planets).toEqual(['chosen']);
  });

  test('a tactical entry on another system does not take them', async () => {
    addTactical('0,1');
    open({ initialMode: 'build' });
    await tap('Cruiser');
    expect(tactical().production).toEqual({});
    expect(merged('build')?.delta.units?.units).toEqual({ cruiser: 1 });
  });

  test('a tap on a bought token takes a bought one first and lowers the total; the ring goes with the last', async () => {
    addMine({ carrier: 1 });
    const { container } = open({ initialMode: 'build' });
    expect(ring(container, 'me|carrier|-')).toBeNull();
    await tap('Carrier');
    await tap('Carrier');
    expect(ring(container, 'me|carrier|-')).not.toBeNull();
    expect(total()).toBe('6');
    await tap('Carrier ×3');
    expect(total()).toBe('3');
    expect(ring(container, 'me|carrier|-')).not.toBeNull();
    await tap('Carrier ×2');
    expect(total()).toBe('0');
    expect(ring(container, 'me|carrier|-')).toBeNull();
    expect(merged('build')).toBeUndefined();
    expect(forecast().systems[SLOT]).toEqual({ carrier: 1 });
    await tap('Carrier ×1');
    expect(forecast().systems[SLOT]).toEqual({ carrier: 1 });
  });

  test('purchases stay marked when the stage opens again', async () => {
    const { container } = open({ initialMode: 'build' });
    await tap('Carrier');
    expect(ring(container, 'me|carrier|-')).not.toBeNull();
    cleanup();
    const next = open({ initialMode: 'build' }).container;
    expect(ring(next, 'me|carrier|-')).not.toBeNull();
    expect(total()).toBe('3');
  });

  test('fighters and infantry cost a half, and each type is rounded up in the total', async () => {
    open({ initialMode: 'build' });
    expect(within(screen.getByRole('button', { name: 'Fighter' })).getByText('½')).toBeVisible();
    await tap('Fighter');
    expect(total()).toBe('1');
    await tap('Fighter');
    expect(total()).toBe('1');
    await tap('Fighter');
    expect(total()).toBe('2');
  });

  test('a price follows my upgrade and the faction of the chosen owner', async () => {
    store().setFaction('muaat');
    store().setOpponent(0, { faction: 'sol' });
    open({ initialMode: 'build' });
    const warsun = () => within(screen.getByRole('button', { name: 'War Sun' }));
    expect(warsun().getByText('12')).toBeVisible();
    cleanup();
    store().toggleUpgrade('me', 'warsun');
    open({ initialMode: 'build' });
    expect(warsun().getByText('10')).toBeVisible();
    await side('Sol');
    expect(warsun().getByText('12')).toBeVisible();
  });

  test('enemy purchases edit their units and can be taken back, old ones cannot', async () => {
    store().setEnemyUnits(SLOT, opponent(0), { cruiser: 1 });
    const { container } = open({ initialMode: 'build' });
    await tap('Cruiser ×1 (Player 2)');
    expect(game().enemyUnits[SLOT][opponent(0)]).toEqual({ cruiser: 1 });
    await side('Player 2');
    await tap('Cruiser');
    expect(game().enemyUnits[SLOT][opponent(0)]).toEqual({ cruiser: 2 });
    const key = `${opponent(0)}|cruiser|-`;
    expect(ring(container, key)).not.toBeNull();
    expect(total()).toBe('2');
    expect(entries()).toEqual([]);
    await tap('Cruiser ×2 (Player 2)');
    expect(game().enemyUnits[SLOT][opponent(0)]).toEqual({ cruiser: 1 });
    expect(ring(container, key)).toBeNull();
    await tap('Cruiser ×1 (Player 2)');
    expect(game().enemyUnits[SLOT][opponent(0)]).toEqual({ cruiser: 1 });
  });

  test('a bought structure goes with a tap on its token; an old one does nothing', async () => {
    store().setPds(quann(), 1);
    open({ initialMode: 'build' });
    await tap('PDS ×1');
    expect(game().pds).toEqual({ [quann()]: 1 });
    await tap('PDS');
    expect(game().pds).toEqual({ [quann()]: 2 });
    await tap('PDS ×2');
    expect(game().pds).toEqual({ [quann()]: 1 });
    await tap('Space dock');
    expect(game().docks).toContain(quann());
    await userEvent.click(document.querySelector('[data-stack="me|spacedock|0"] .token-hit')!);
    expect(game().docks).not.toContain(quann());
  });

  const planPds = () => useGame.getState().addEntry(1, { type: 'strategic', card: 4, effects: { structures: [{ kind: 'pds', planetId: quann() }] } }, 'action');
  const plannedStructures = () => (entries().find(e => e.type === 'strategic') as Extract<Entry, { type: 'strategic' }>).effects?.structures;
  const pdsStack = () => document.querySelector('[data-stack="me|pds|0"] .token-hit');

  test('in battle a stack with a planned PDS loses the baseline one first; the planned one then takes no tap', async () => {
    useGame.getState().setPds(quann(), 1);
    planPds();
    open({ initialMode: 'battle' });
    await userEvent.click(pdsStack()!);
    expect(game().pds[quann()]).toBeUndefined();
    expect(plannedStructures()).toHaveLength(1);
    const giveBack = screen.getByRole('button', { name: 'Give back PDS' });
    expect(giveBack).toBeVisible();
    await userEvent.click(pdsStack()!);
    expect(plannedStructures()).toHaveLength(1);
    expect(game().pds[quann()]).toBeUndefined();
  });

  test('in setup a stack follows what is visible: the baseline PDS comes off, then a planned one alone takes no tap', async () => {
    useGame.getState().setPds(quann(), 1);
    planPds();
    open({});
    await userEvent.click(pdsStack()!);
    expect(game().pds[quann()]).toBeUndefined();
    expect(plannedStructures()).toHaveLength(1);
    await userEvent.click(pdsStack()!);
    expect(plannedStructures()).toHaveLength(1);
  });

  test('a tap on a structure only planned says where it lives, and the next tap clears that', async () => {
    planPds();
    open({});
    expect(screen.queryByRole('status')).toBeNull();
    await userEvent.click(pdsStack()!);
    expect(screen.getByRole('status')).toHaveTextContent('planned in an entry');
    await userEvent.click(screen.getByRole('button', { name: /Carrier/ }));
    expect(screen.queryByRole('status')).toBeNull();
  });

  test('a loss the plan cannot hold says so instead of doing nothing', async () => {
    const FROM = '2,0';
    store().setTile(FROM, '26');
    const noPay = { planets: [], tradeGoods: 0 };
    store().addEntry(1, { type: 'adjustment', label: '', delta: { units: { systemId: FROM, units: { carrier: 1 } } } }, 'strategy');
    store().addEntry(1, { type: 'adjustment', label: '', delta: { units: { systemId: SLOT, units: { fighter: 2 } } } }, 'strategy');
    store().addEntry(1, { type: 'adjustment', label: '', kind: 'losses', delta: { units: { systemId: SLOT, units: { fighter: -1 } } } }, 'action');
    store().addEntry(1, { type: 'tactical', systemId: FROM, moves: [{ from: SLOT, units: { fighter: 2 } }], landings: [], production: {}, payment: noPay }, 'action');
    store().addEntry(1, { type: 'tactical', systemId: SLOT, moves: [{ from: FROM, units: { carrier: 1 } }], landings: [], production: {}, payment: noPay }, 'action');
    const before = game();
    open({ initialMode: 'battle' });
    await userEvent.click(document.querySelector('[data-stack="me|carrier|-"] .token-hit')!);
    expect(game()).toBe(before);
    expect(screen.getByRole('status')).toHaveTextContent('Not recorded');
  });

  test('in setup a planned dock takes no tap; a baseline one still comes off', async () => {
    useGame.getState().addEntry(1, { type: 'strategic', card: 4, effects: { structures: [{ kind: 'spacedock', planetId: quann() }] } }, 'action');
    const before = [...game().docks];
    open({});
    await userEvent.click(document.querySelector('[data-stack="me|spacedock|0"] .token-hit')!);
    expect(game().docks).toEqual(before);
  });

  test('a later caller can route purchases into its own entry', async () => {
    const change = vi.fn();
    const { container } = open({ initialMode: 'build', onPurchase: { bought: [{ unit: 'carrier', planetId: null, count: 1 }], change } });
    addMine({ carrier: 1 });
    await tap('Infantry');
    expect(change).toHaveBeenCalledWith('infantry', quann(), 1);
    expect(ring(container, 'me|carrier|-')).not.toBeNull();
    expect(total()).toBe('3');
    await tap('Carrier ×1');
    expect(change).toHaveBeenCalledWith('carrier', null, -1);
    expect(entries().filter(e => e.type === 'adjustment' && e.kind)).toEqual([]);
  });
});


describe('fix round 1', () => {
  const tactical = () => entries().find((e): e is Extract<Entry, { type: 'tactical' }> => e.type === 'tactical')!;
  const addTactical = (slot = SLOT) => store().addEntry(1, {
    type: 'tactical', systemId: slot, moves: [], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 },
  }, 'action');
  const total = () => document.querySelector('.stage-total b')!.textContent;
  const hasRing = (key: string) => document.querySelector(`[data-stack="${key}"] .token-ring`) !== null;
  const [first, second] = pack.tiles[TWO].planetIds;
  const nameOf = (id: string) => pack.planets[id].name;

  test('a token that arrives by a later tactical entry really goes when tapped', async () => {
    store().addEntry(1, { type: 'adjustment', label: '', delta: { units: { systemId: '0,1', units: { carrier: 1 } } } }, 'strategy');
    store().changeAdjustment(1, { kind: 'setup', systemId: SLOT, unit: 'cruiser', planetId: null, amount: 1 });
    store().addEntry(1, { type: 'tactical', systemId: SLOT, moves: [{ from: '0,1', units: { carrier: 1 } }], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 } }, 'action');
    open();
    await tap('Carrier ×1');
    expect(forecast().systems[SLOT]).toEqual({ cruiser: 1 });
    expect(screen.queryByRole('button', { name: 'Carrier ×1' })).toBeNull();
  });

  test('a ground purchase on a tactical entry goes to the target planet, and the ring and take-back follow it', async () => {
    store().setTile(SLOT, TWO);
    store().setPlanetControl(first, 'me');
    store().setPlanetControl(second, 'me');
    addTactical();
    open({ initialMode: 'build' });
    await tap(new RegExp(`^${nameOf(second)}:`));
    await tap('Infantry');
    expect(tactical().production).toEqual({ infantry: 1 });
    expect(tactical().productionGround).toEqual({ [second]: { infantry: 1 } });
    expect(forecast().ground[second]).toEqual({ infantry: 1 });
    expect(hasRing('me|infantry|1')).toBe(true);
    await tap('Infantry ×1');
    expect(tactical().production).toEqual({});
    expect(tactical().productionGround).toBeUndefined();
  });

  test('the ring reads the place at the entry, not the control at the end of the round', () => {
    store().setTile(SLOT, TWO);
    store().setPlanetControl(second, 'me');
    store().addEntry(1, { type: 'adjustment', label: '', delta: { units: { systemId: SLOT, units: { infantry: 1 } } } }, 'strategy');
    const noPay = { planets: [], tradeGoods: 0 };
    const id = store().addEntry(1, { type: 'tactical', systemId: SLOT, moves: [], landings: [], production: { infantry: 1 }, payment: noPay }, 'action');
    store().addEntry(1, { type: 'tactical', systemId: SLOT, moves: [], landings: [{ planetId: first, units: { infantry: 1 } }], production: {}, payment: noPay }, 'action');
    open({ initialMode: 'build', tacticalId: id });
    expect(hasRing('me|infantry|1')).toBe(true);
    expect(hasRing('me|infantry|0')).toBe(false);
  });

  test('enemy ground units go to the target planet; both ways of removing them find them there', async () => {
    store().setTile(SLOT, TWO);
    open();
    await side('Player 2');
    await tap(new RegExp(`^${nameOf(second)}:`));
    await tap('Infantry');
    await tap('Infantry');
    expect(game().enemyGround).toEqual({ [second]: { [opponent(0)]: { infantry: 2 } } });
    expect(game().enemyUnits[SLOT]).toBeUndefined();
    await tap('Infantry ×2 (Player 2)');
    expect(game().enemyGround[second][opponent(0)]).toEqual({ infantry: 1 });
    await mode('Battle');
    await tap('Infantry ×1 (Player 2)');
    expect(game().enemyGround).toEqual({});
    await userEvent.click(within(screen.getByRole('group', { name: 'Losses, Player 2' })).getByRole('button', { name: /Give back Infantry/ }));
    expect(game().enemyGround).toEqual({ [second]: { [opponent(0)]: { infantry: 1 } } });
  });

  test('an enemy ground purchase is on the planet too, and its take-back', async () => {
    store().setTile(SLOT, TWO);
    open({ initialMode: 'build' });
    await side('Player 2');
    await tap(new RegExp(`^${nameOf(second)}:`));
    await tap('Infantry');
    expect(game().enemyGround).toEqual({ [second]: { [opponent(0)]: { infantry: 1 } } });
    expect(hasRing(`${opponent(0)}|infantry|1`)).toBe(true);
    await tap('Infantry ×1 (Player 2)');
    expect(game().enemyGround).toEqual({});
  });

  test('enemy ground units left in the system are still removed from there', async () => {
    store().setEnemyUnits(SLOT, opponent(0), { infantry: 1 });
    open();
    await tap('Infantry ×1 (Player 2)');
    expect(game().enemyUnits[SLOT]).toBeUndefined();
  });

  test('the price follows the level at that entry', async () => {
    store().setFaction('muaat');
    const id = addTactical();
    store().addEntry(1, { type: 'secondary', upgrades: ['warsun'] }, 'action');
    open({ initialMode: 'build', tacticalId: id });
    const warsun = within(screen.getByRole('button', { name: 'War Sun' }));
    expect(warsun.getByText('12')).toBeVisible();
    await tap('War Sun');
    expect(total()).toBe('12');
    cleanup();
    store().toggleUpgrade('me', 'warsun');
    open({ initialMode: 'build', tacticalId: id });
    expect(within(screen.getByRole('button', { name: 'War Sun' })).getByText('10')).toBeVisible();
    expect(total()).toBe('10');
  });

  test('without a tactical entry the price is that of the forecast', () => {
    store().setFaction('muaat');
    store().addEntry(1, { type: 'secondary', upgrades: ['warsun'] }, 'action');
    open({ initialMode: 'build' });
    expect(within(screen.getByRole('button', { name: 'War Sun' })).getByText('10')).toBeVisible();
  });

  test('the entry being edited takes the purchase, not the last one on the system', async () => {
    const edited = addTactical();
    const last = addTactical();
    open({ initialMode: 'build', tacticalId: edited });
    await tap('Cruiser');
    const of = (id: string) => entries().find(e => e.id === id) as Extract<Entry, { type: 'tactical' }>;
    expect(of(edited).production).toEqual({ cruiser: 1 });
    expect(of(last).production).toEqual({});
  });

  test('control and readiness follow the state shown, the units the forecast', () => {
    const shown = { ...forecast(), control: { [quann()]: 'enemy' as const }, exhausted: [quann()] };
    open({ shownState: shown });
    const control = within(screen.getByRole('group', { name: `Control of ${nameOf(quann())}` }));
    expect(control.getByRole('button', { name: 'Player 2' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByRole('group', { name: nameOf(quann()) })).getByText(/Exhausted/)).toBeVisible();
  });

  test('a leaving token has no hit circle', async () => {
    addMine({ carrier: 1 });
    const { container } = open();
    await tap('Carrier ×1');
    expect(container.querySelector('[data-stack="me|carrier|-"] .token-hit')).toBeNull();
  });

  test('the ring has a dark outer stroke', async () => {
    const { container } = open({ initialMode: 'build' });
    await tap('Carrier');
    expect(container.querySelector('[data-stack="me|carrier|-"] .token-ring-shade')).not.toBeNull();
  });

  test('the loss strip names the planet when two planets lost one type', async () => {
    store().setTile(SLOT, TWO);
    addMine({}, { [first]: { infantry: 1, mech: 1 }, [second]: { infantry: 1 } });
    open({ initialMode: 'battle' });
    const strip = within(screen.getByRole('group', { name: 'Losses, mine' }));
    await userEvent.click(document.querySelector('[data-stack="me|infantry|0"] .token-hit')!);
    expect(strip.getByRole('button', { name: 'Give back Infantry' })).toBeVisible();
    await userEvent.click(document.querySelector('[data-stack="me|mech|0"] .token-hit')!);
    expect(strip.getByRole('button', { name: 'Give back Mech' })).toBeVisible();
    await userEvent.click(document.querySelector('[data-stack="me|infantry|1"] .token-hit')!);
    const named = strip.getByRole('button', { name: `Give back Infantry, ${nameOf(second)}` });
    expect(named).toHaveTextContent(nameOf(second));
    expect(strip.getByRole('button', { name: `Give back Infantry, ${nameOf(first)}` })).toBeVisible();
    expect(strip.getByRole('button', { name: 'Give back Mech' })).toBeVisible();
  });
});
