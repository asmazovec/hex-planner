import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

vi.mock('../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
}));

import { loadPack, strategyCards } from '../../data/loadPack';
import { cardSummary } from '../../data/cardSummaries';
import { project } from '../../domain/project';
import type { Warning, WarningCode } from '../../domain/types';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { ActionMenu, ACTION_TYPES } from './ActionMenu';
import { EntryList } from './EntryList';
import { PaymentBlock } from './blocks/PaymentBlock';
import { PlanTabs, planDisplayName } from './PlanTabs';
import { StrategyCards } from './StrategyCards';
import { SummaryBar } from './SummaryBar';
import { WarningText } from '../feedback/WarningText';

const pack = loadPack(['pok', 'te']);

afterEach(cleanup);
beforeEach(() => {
  setLanguage('en');
  useGame.getState().newGame({ expansions: ['pok', 'te'], playerCount: 6, faction: 'arborec' }, pack);
  useGame.getState().setTile('1,0', '5');
});

const game = () => useGame.getState().game!;
const plan = () => game().plans.find(p => p.id === game().activePlanId)!;

test('the summary shows now and forecast for every value', () => {
  const store = useGame.getState();
  store.addEntry(1, { type: 'adjustment', label: 'x', delta: { tradeGoods: 2, tactic: 1, fleet: -1, strategy: 2, vp: 1 } }, 'action');
  store.addEntry(1, {
    type: 'tactical', systemId: '1,0', moves: [], landings: [], production: {},
    payment: { planets: ['nestphar'], tradeGoods: 0 },
  }, 'action');
  render(<SummaryBar now={project(game(), plan(), 'now', pack).state} forecast={project(game(), plan(), 'forecast', pack).state} pack={pack} />);
  const cell = (name: string) => screen.getByRole('group', { name });
  expect(cell('Resources')).toHaveTextContent('3 → 0');
  expect(cell('Influence')).toHaveTextContent('2 → 0');
  expect(cell('Trade goods')).toHaveTextContent('0 → 2');
  expect(cell('Tactic')).toHaveTextContent(/^Tactic3$/);
  expect(cell('Fleet')).toHaveTextContent('3 → 2');
  expect(cell('Strategy')).toHaveTextContent('2 → 4');
  expect(cell('VP')).toHaveTextContent('0 → 1');
});

test('the fact shows what is, without the arrows of the plan', () => {
  const store = useGame.getState();
  store.addEntry(1, { type: 'adjustment', label: 'x', delta: { tradeGoods: 2, fleet: -1 } }, 'action');
  render(<SummaryBar now={project(game(), plan(), 'now', pack).state} forecast={project(game(), plan(), 'forecast', pack).state} pack={pack} factOnly />);
  const cell = (name: string) => screen.getByRole('group', { name });
  expect(cell('Trade goods')).toHaveTextContent(/^Trade goods0$/);
  expect(cell('Fleet')).toHaveTextContent(/^Fleet3$/);
  expect(screen.getByRole('group', { name: 'Totals, now and forecast' })).not.toHaveTextContent('→');
});

const grid = () => within(screen.getByRole('group', { name: 'Strategy' })).getAllByRole('button');

test('all eight cards stay in the grid, a tap opens the details and takes nothing, then backup, main, none', async () => {
  render(<StrategyCardsLive />);
  expect(grid()).toHaveLength(strategyCards(game().expansions).length);
  expect(screen.getByText(/^Tap once for the details, again for backup, a third time for main, once more to clear\./)).toBeVisible();
  expect(screen.queryByText('Changed in TE')).toBeNull();

  await userEvent.click(screen.getByRole('button', { name: /Warfare/ }));
  expect(plan().rounds[0]).toMatchObject({ strategyCard: null, backupCard: null });
  expect(screen.getByRole('button', { name: /Warfare/ })).toHaveAttribute('aria-current', 'true');
  const details = within(screen.getByRole('group', { name: 'Warfare' }));
  expect(details.getByText('Changed in TE')).toBeVisible();
  expect(details.getByText(/tactical action without a token/)).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: /Warfare/ }));
  expect(plan().rounds[0]).toMatchObject({ strategyCard: null, backupCard: 6 });
  expect(screen.getByRole('button', { name: /Warfare/ })).toHaveTextContent('Backup');

  await userEvent.click(screen.getByRole('button', { name: /Warfare/ }));
  expect(plan().rounds[0]).toMatchObject({ strategyCard: 6, backupCard: null });
  expect(screen.getByRole('button', { name: /Warfare/ })).toHaveTextContent('Main');
  expect(screen.getByText('Main: 6 Warfare')).toBeVisible();
  expect(grid()).toHaveLength(8);

  await userEvent.click(screen.getByRole('button', { name: /Warfare/ }));
  expect(plan().rounds[0]).toMatchObject({ strategyCard: null, backupCard: null });
  expect(screen.queryByRole('group', { name: 'Warfare' })).toBeNull();
});

test('the primary and the secondary ability stand as separate blocks, each with its own label', async () => {
  render(<StrategyCardsLive />);
  await userEvent.click(screen.getByRole('button', { name: /Trade/ }));
  const details = screen.getByRole('group', { name: 'Trade' });
  const summary = cardSummary(strategyCards(game().expansions).find(c => c.name === 'Trade')!.summaryKey, 'en');
  const primary = details.querySelector('.card-ability-primary')!;
  const secondary = details.querySelector('.card-ability-secondary')!;
  expect(within(primary as HTMLElement).getByText('Primary')).toBeVisible();
  expect(primary).toHaveTextContent(summary.primary);
  expect(within(secondary as HTMLElement).getByText('Secondary')).toBeVisible();
  expect(secondary).toHaveTextContent(summary.secondary);
});

test('a held card tapped after looking at another only shows its details again', async () => {
  useGame.getState().setStrategyCard(1, 5);
  useGame.getState().setStrategyCard(1, 5);
  render(<StrategyCardsLive />);
  await userEvent.click(screen.getByRole('button', { name: /Imperial/ }));
  await userEvent.click(screen.getByRole('button', { name: /Trade/ }));
  expect(plan().rounds[0]).toMatchObject({ strategyCard: 5, backupCard: null });
  expect(screen.getByRole('group', { name: 'Trade' })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: /Trade/ }));
  expect(plan().rounds[0]).toMatchObject({ strategyCard: null, backupCard: null });
});

test('without a look at another card the details are of the main card, and the first tap on it changes nothing', async () => {
  useGame.getState().setStrategyCard(1, 5);
  useGame.getState().setStrategyCard(1, 5);
  render(<StrategyCardsLive />);
  expect(screen.getByRole('group', { name: 'Trade' })).toBeVisible();
  expect(screen.getByRole('button', { name: /Trade/ })).not.toHaveAttribute('aria-current');
  await userEvent.click(screen.getByRole('button', { name: /Trade/ }));
  expect(plan().rounds[0]).toMatchObject({ strategyCard: 5, backupCard: null });
  expect(screen.getByRole('button', { name: /Trade/ })).toHaveAttribute('aria-current', 'true');
  await userEvent.click(screen.getByRole('button', { name: /Trade/ }));
  expect(plan().rounds[0]).toMatchObject({ strategyCard: null, backupCard: null });
});

test('a tap outside the strategy block closes the look at a card, back to the main one, and the count starts over', async () => {
  useGame.getState().setStrategyCard(1, 5);
  useGame.getState().setStrategyCard(1, 5);
  render(<><StrategyCardsLive /><button type="button">Elsewhere</button></>);
  await userEvent.click(screen.getByRole('button', { name: /Imperial/ }));
  expect(screen.getByRole('group', { name: 'Imperial' })).toBeVisible();
  expect(screen.queryByRole('group', { name: 'Trade' })).toBeNull();

  // Within the block the look stays: the details can be read and touched.
  await userEvent.click(screen.getByRole('group', { name: 'Imperial' }));
  expect(screen.getByRole('group', { name: 'Imperial' })).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }));
  expect(screen.queryByRole('group', { name: 'Imperial' })).toBeNull();
  expect(screen.getByRole('group', { name: 'Trade' })).toBeVisible();

  await userEvent.click(screen.getByRole('button', { name: /Imperial/ }));
  expect(plan().rounds[0]).toMatchObject({ strategyCard: 5, backupCard: null });
  await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }));
  await userEvent.click(screen.getByRole('button', { name: /Trade/ }));
  expect(plan().rounds[0]).toMatchObject({ strategyCard: 5, backupCard: null });
});

test('with no main card there is nothing to show until a card is tapped, and a tap outside hides it again', async () => {
  useGame.getState().setStrategyCard(1, 2);
  render(<><StrategyCardsLive /><button type="button">Elsewhere</button></>);
  expect(document.querySelector('.card-details')).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: /Trade/ }));
  expect(screen.getByRole('group', { name: 'Trade' })).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }));
  expect(document.querySelector('.card-details')).toBeNull();
});

test('another card shows its own details; a card without a change has no mark', async () => {
  render(<StrategyCardsLive />);
  await userEvent.click(screen.getByRole('button', { name: /Trade/ }));
  expect(within(screen.getByRole('group', { name: 'Trade' })).queryByText('Changed in TE')).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: /Imperial/ }));
  expect(screen.queryByRole('group', { name: 'Trade' })).toBeNull();
  expect(screen.getByRole('group', { name: 'Imperial' })).toBeVisible();
});

test('the choice of the round is in view without opening anything', () => {
  useGame.getState().setStrategyCard(1, 5);
  useGame.getState().setStrategyCard(1, 5);
  useGame.getState().setStrategyCard(1, 2);
  render(<StrategyCardsLive />);
  expect(screen.getByText('Main: 5 Trade · Backup: 2 Diplomacy')).toBeVisible();
  expect(grid()).toHaveLength(8);
});

test('with 3 or 4 players the backup is the second card', async () => {
  render(<StrategyCardsLive playerCount={4} />);
  expect(screen.getByText(/^With 3 or 4 players two cards are held/)).toBeVisible();
  await userEvent.tripleClick(screen.getByRole('button', { name: /Trade/ }));
  await userEvent.dblClick(screen.getByRole('button', { name: /Imperial/ }));
  expect(plan().rounds[0]).toMatchObject({ strategyCard: 5, backupCard: 8 });
  expect(screen.getByRole('button', { name: /Imperial/ })).toHaveTextContent('Second');
  expect(screen.getByText('Main: 5 Trade · Second: 8 Imperial')).toBeVisible();
});

function StrategyCardsLive({ playerCount = 6 }: { playerCount?: number }) {
  const live = useGame(s => s.game)!;
  const round = live.plans[0].rounds[0];
  return <StrategyCards expansions={live.expansions} playerCount={playerCount} round={round} />;
}

test('the menu holds one item for a strategy card', async () => {
  const onPick = vi.fn();
  render(<ActionMenu onPick={onPick} />);
  await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
  const names = ['Tactical action', 'Strategy', 'Component action', 'Pass', 'Expedition contribution, end of turn', 'Manual adjustment'];
  const menu = screen.getAllByRole('button').slice(1);
  expect(menu.map(b => b.textContent)).toEqual(names);
  expect(ACTION_TYPES).toHaveLength(6);
  await userEvent.click(screen.getByRole('button', { name: 'Pass' }));
  expect(onPick).toHaveBeenCalledWith('pass');
  expect(screen.queryByRole('button', { name: 'Pass' })).toBeNull();
});

function PaymentHarness({ need }: { need: number }) {
  const state = { ...project(game(), plan(), 'forecast', pack).state, tradeGoods: 2 };
  return <PaymentBlockLive need={need} state={state} />;
}
const onPayment = vi.fn();
const onManual = vi.fn();
function PaymentBlockLive({ need, state, manual = false }: { need: number; state: ReturnType<typeof project>['state']; manual?: boolean }) {
  return (
    <PaymentBlock
      need={need} payment={{ planets: ['nestphar'], tradeGoods: 0 }} state={state} pack={pack}
      manual={manual} onManual={onManual} onChange={onPayment}
    />
  );
}

test('payment shows the selected payment and opens manual choice on request', async () => {
  render(<PaymentHarness need={3} />);
  expect(screen.getByText(/Cost 3/)).toBeVisible();
  expect(screen.getByText(/Nestphar 3/)).toBeVisible();
  expect(screen.queryByRole('button', { name: /Nestphar/ })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Choose manually' }));
  expect(onManual).toHaveBeenCalledWith(true);
});

test('manual payment toggles planets and trade goods', async () => {
  const state = { ...project(game(), plan(), 'forecast', pack).state, tradeGoods: 2 };
  render(<PaymentBlockLive need={3} state={state} manual />);
  await userEvent.click(screen.getByRole('button', { name: /Nestphar/ }));
  expect(onPayment).toHaveBeenLastCalledWith({ planets: [], tradeGoods: 0 });
  await userEvent.click(screen.getByRole('button', { name: 'Add one trade good' }));
  expect(onPayment).toHaveBeenLastCalledWith({ planets: ['nestphar'], tradeGoods: 1 });
  await userEvent.click(screen.getByRole('button', { name: 'Pick automatically' }));
  expect(onManual).toHaveBeenLastCalledWith(false);
});

const CASES: Record<WarningCode, Warning['params']> = {
  shortResources: { needed: 5, paid: 3 },
  shortInfluence: { needed: 5, paid: 1 },
  shortTradeGoods: { needed: 3, have: 1 },
  planetExhausted: { planetId: 'nestphar' },
  capacityGroup: { from: '1,0', load: 5, capacity: 4 },
  capacitySystem: { systemId: '1,0', load: 5, capacity: 4 },
  fleetPool: { systemId: '1,0', ships: 4, fleet: 3 },
  unitsMissing: { where: '1,0', unit: 'carrier', missing: 1 },
  landingOverLimit: { unit: 'infantry', wanted: 3, available: 2 },
  shortStrategy: { have: 0 },
  primaryRepeated: { held: 1 },
  tokensOver: { given: 3, free: 2 },
  poolNegative: { pool: 'fleet', have: -1 },
  sliceTaken: { sliceId: 'res5' },
  systemHasToken: { systemId: '1,0' },
  constructionUnits: {},
  speedShort: { from: '1,0', unit: 'carrier', move: 1, steps: 2 },
  routeBlocked: { from: '1,0', systemId: '0,1' },
  sourceActivated: { from: '1,0' },
  // combat-order, invasion, structures
  shipOnPlanet: { planetId: 'nestphar', unit: 'cruiser' },
  landingOutsideSystem: { planetId: 'nestphar', systemId: '1,0' },
  custodians: { planetId: 'nestphar' },
  structureLimit: { kind: 'pds', planetId: 'nestphar', count: 2 },
  structureNotControlled: { planetId: 'nestphar' },
  structureOutsideSystem: { planetId: 'nestphar', systemId: '1,0' },
};

test.each(['en', 'ru'] as const)('every warning code has %s text, with names and the shortfall', lang => {
  setLanguage(lang);
  for (const [code, params] of Object.entries(CASES)) {
    const { container, unmount } = render(<WarningText warning={{ code: code as WarningCode, params }} game={game()} pack={pack} />);
    expect(container.textContent).not.toContain('plan.');
    expect(container.textContent).not.toContain('{{');
    expect(container.textContent).not.toContain('1,0');
    if (code === 'shortResources') expect(container.textContent).toContain('2');
    if (code === 'planetExhausted') expect(container.textContent).toContain('Nestphar');
    if (code === 'capacityGroup') expect(container.textContent).toContain('5');
    if (code === 'unitsMissing') expect(container.textContent).toContain(lang === 'en' ? 'Carrier' : 'Транспортник');
    if (code === 'landingOverLimit') expect(container.textContent).toMatch(lang === 'en' ? /Infantry.*3.*2|3.*Infantry.*2/ : /Пехота.*3.*2/);
    unmount();
  }
});

test('default plan names render localized; own names stay', () => {
  const t = (key: string, opts?: { n: number }) => `${key}:${opts?.n}`;
  expect(planDisplayName('Plan 2', t)).toBe('plan.defaultName:2');
  expect(planDisplayName('Rush', t)).toBe('Rush');
});

function PlanTabsLive() {
  const live = useGame(s => s.game)!;
  return (
    <PlanTabs game={live} roundNo={1} onSelectRound={() => undefined} onSelectPlan={() => undefined} onAddRound={() => undefined} onDeleteRound={() => useGame.getState().deleteRound(1)} onDeletePlan={() => useGame.getState().deletePlan(live.activePlanId)} />
  );
}

test('a plan and a round can be deleted, the last of each stays, and undo brings them back', async () => {
  render(<PlanTabsLive />);
  expect(screen.getByRole('button', { name: 'Delete plan' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Delete round 1' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Copy' }));
  await userEvent.click(screen.getByRole('button', { name: 'Delete plan' }));
  expect(game().plans).toHaveLength(1);
  act(() => useGame.getState().undo());
  expect(game().plans).toHaveLength(2);
  await userEvent.click(screen.getByRole('button', { name: 'Add round' }).parentElement!.querySelector('button')!);
  act(() => { useGame.getState().addRound(); useGame.getState().addRound(); });
  useGame.getState().addEntry(3, { type: 'pass' }, 'action');
  await userEvent.click(screen.getByRole('button', { name: 'Delete round 1' }));
  const { rounds } = game().plans.find(p => p.id === game().activePlanId)!;
  expect(rounds.map(r => r.number)).toEqual([1, 2]);
  expect(rounds[1].entries).toHaveLength(1);
});

test('a plan tab is dragged along the row to change the order; a short press stays a tap', async () => {
  useGame.getState().copyPlan();
  useGame.getState().copyPlan();
  render(<PlanTabsLive />);
  const tabs = () => screen.getAllByRole('tab');
  tabs().forEach((el, i) => {
    el.getBoundingClientRect = () => ({ left: i * 100, width: 100, right: i * 100 + 100, top: 0, bottom: 40, height: 40, x: i * 100, y: 0, toJSON: () => undefined });
  });
  const order = () => game().plans.map(p => p.name);
  const before = order();
  const first = tabs()[0];
  fireEvent.pointerDown(first, { pointerId: 1, clientX: 50 });
  fireEvent.pointerMove(first, { pointerId: 1, clientX: 180 });
  expect(first).toHaveClass('plan-tab-dragging');
  expect(first.style.transform).toBe('translateX(130px)');
  expect(tabs()[1].style.transform).toBe('translateX(-100px)');
  expect(tabs()[2].style.transform).toBe('translateX(0px)');
  fireEvent.pointerUp(first, { pointerId: 1, clientX: 180 });
  expect(order()).toEqual([before[1], before[0], before[2]]);
  const active = game().activePlanId;
  fireEvent.click(first);
  expect(game().activePlanId).toBe(active);
  useGame.getState().undo();
  expect(order()).toEqual(before);
});

test('the Copy tab makes a new plan with its own entries', async () => {
  useGame.getState().addEntry(1, { type: 'pass' }, 'action');
  render(<PlanTabsLive />);
  await userEvent.click(screen.getByRole('button', { name: 'Copy' }));
  const { plans, activePlanId } = game();
  expect(plans).toHaveLength(2);
  expect(activePlanId).toBe(plans[1].id);
  expect(plans[1].rounds[0].entries[0].id).not.toBe(plans[0].rounds[0].entries[0].id);
  expect(screen.getByRole('tab', { name: /Plan 2/, selected: true })).toBeVisible();
});

test('undo is offered only when there is something to undo, and reverts', async () => {
  useGame.getState().newGame({ expansions: ['pok'], playerCount: 6, faction: 'arborec' }, pack);
  render(<PlanTabsLive />);
  expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Copy' }));
  await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
  expect(game().plans).toHaveLength(1);
});

function EntryListLive({ warnings = {} }: { warnings?: Record<string, Warning[]> }) {
  const live = useGame(s => s.game)!;
  return (
    <EntryList
      game={live} pack={pack} round={live.plans[0].rounds[0]} warnings={warnings} state={project(live, live.plans[0], 'forecast', pack).state}
      openId={null} onOpen={() => undefined}
    />
  );
}

function threeEntries(): string[] {
  const store = useGame.getState();
  return [
    store.addEntry(1, { type: 'pass' }, 'action'),
    store.addEntry(1, { type: 'strategic' }, 'action'),
    store.addEntry(1, { type: 'secondary' }, 'action'),
  ];
}

const order = () => plan().rounds[0].entries.map(e => e.type);

test('dragging the handle moves the entry; pointercancel leaves it', () => {
  threeEntries();
  render(<EntryListLive />);
  const rows = screen.getAllByRole('listitem');
  rows.forEach((el, i) => {
    el.getBoundingClientRect = () => ({ top: i * 50, height: 50, bottom: i * 50 + 50, left: 0, right: 100, width: 100, x: 0, y: i * 50, toJSON: () => undefined });
  });
  const handle = within(rows[0]).getByRole('button', { name: 'Drag to move' });
  fireEvent.pointerDown(handle, { pointerId: 1, clientY: 10 });
  fireEvent.pointerMove(handle, { pointerId: 1, clientY: 140 });
  fireEvent.pointerCancel(handle, { pointerId: 1 });
  expect(order()).toEqual(['pass', 'strategic', 'secondary']);

  fireEvent.pointerDown(handle, { pointerId: 1, clientY: 10 });
  fireEvent.pointerMove(handle, { pointerId: 1, clientY: 140 });
  expect(rows[0].style.transform).toBe('translateY(130px)');
  expect(rows[1].style.transform).toBe('translateY(-50px)');
  fireEvent.pointerUp(handle, { pointerId: 1, clientY: 140 });
  expect(order()).toEqual(['strategic', 'secondary', 'pass']);
});

test('a drag does not wedge when its entry disappears meanwhile', () => {
  const [pass] = threeEntries();
  render(<EntryListLive />);
  const handle = within(screen.getAllByRole('listitem')[0]).getByRole('button', { name: 'Drag to move' });
  fireEvent.pointerDown(handle, { pointerId: 1, clientY: 10 });
  act(() => useGame.getState().removeEntry(pass));
  const rows = screen.getAllByRole('listitem');
  rows.forEach((el, i) => {
    el.getBoundingClientRect = () => ({ top: i * 50, height: 50, bottom: i * 50 + 50, left: 0, right: 100, width: 100, x: 0, y: i * 50, toJSON: () => undefined });
  });
  const next = within(rows[0]).getByRole('button', { name: 'Drag to move' });
  fireEvent.pointerDown(next, { pointerId: 2, clientY: 10 });
  fireEvent.pointerMove(next, { pointerId: 2, clientY: 140 });
  fireEvent.pointerUp(next, { pointerId: 2, clientY: 140 });
  expect(order()).toEqual(['secondary', 'strategic']);
});

test('a warning about the tokens stands right below the tiles of the open status fields, so the tiles do not move', async () => {
  const id = useGame.getState().addStatusEntry(1);
  useGame.getState().updateEntry(id, { tactic: 4 });
  const round = plan().rounds[0];
  const state = project(game(), plan(), 'forecast', pack);
  render(<EntryList game={game()} pack={pack} round={round} plan={plan()} warnings={state.warningsByEntry} state={state.state} openId={id} onOpen={() => undefined} />);
  const details = document.querySelector('.entry-details')!;
  const warnings = screen.getAllByRole('list', { name: 'Warnings' });
  expect(warnings).toHaveLength(1);
  expect(details).toContainElement(warnings[0]);
  // Above the points, and only once: the row does not repeat it.
  expect(warnings[0].nextElementSibling).toHaveClass('status-points');
  expect(document.querySelectorAll('.warning-text')).toHaveLength(1);
});

test('a closed entry shows its warnings on its row, above what it reads out', () => {
  const id = useGame.getState().addStatusEntry(1);
  useGame.getState().updateEntry(id, { tactic: 4 });
  const state = project(game(), plan(), 'forecast', pack);
  render(<EntryList game={game()} pack={pack} round={plan().rounds[0]} plan={plan()} warnings={state.warningsByEntry} state={state.state} openId={null} onOpen={() => undefined} />);
  expect(document.querySelector('.entry-main')!.nextElementSibling).toHaveClass('warning-list');
});

test('an entry can be marked done and deleted, and shows its warnings', async () => {
  const [id] = threeEntries();
  render(<EntryListLive warnings={{ [id]: [{ code: 'shortResources', params: { needed: 3, paid: 1 } }] }} />);
  const row = screen.getByRole('listitem', { name: 'Pass' });
  expect(row).toHaveTextContent('short by 2');
  await userEvent.click(within(row).getByRole('checkbox', { name: 'Done' }));
  expect(plan().rounds[0].entries[0].status).toBe('done');
  await userEvent.click(within(row).getByRole('checkbox', { name: 'Done' }));
  expect(plan().rounds[0].entries[0].status).toBe('planned');
  await userEvent.click(within(row).getByRole('button', { name: 'Delete' }));
  expect(plan().rounds[0].entries).toHaveLength(2);
});
