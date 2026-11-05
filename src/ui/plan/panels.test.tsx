import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

vi.mock('../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
}));

import { loadPack } from '../../data/loadPack';
import { strategyCards } from '../../domain/cards';
import { project } from '../../domain/project';
import type { Warning, WarningCode } from '../../domain/types';
import { setLanguage } from '../../i18n';
import { useGame } from '../../state/gameStore';
import { ActionMenu, ACTION_TYPES } from './ActionMenu';
import { EntryList } from './EntryList';
import { PaymentBlock } from './PaymentBlock';
import { PlanTabs, planDisplayName } from './PlanTabs';
import { StrategyCards } from './StrategyCards';
import { SummaryBar } from './SummaryBar';
import { WarningText } from './WarningText';

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

test('cards show their summaries and the Thunder\'s Edge change; taps cycle primary, backup, none', async () => {
  render(<StrategyCardsLive />);
  const cards = strategyCards(game().expansions);
  expect(screen.getAllByRole('listitem')).toHaveLength(cards.length);
  const warfare = screen.getByRole('button', { name: /Warfare/ });
  expect(within(warfare).getByText('Changed in TE')).toBeVisible();
  expect(warfare).toHaveTextContent('tactical action without a token');
  expect(within(screen.getByRole('button', { name: /Trade/ })).queryByText('Changed in TE')).toBeNull();
  expect(screen.getByRole('button', { name: /Trade/ })).toHaveTextContent('Primary:');
  expect(screen.getByRole('button', { name: /Trade/ })).toHaveTextContent('Secondary:');

  expect(screen.getByText('Tap once for backup, again for main, again to clear.')).toBeVisible();

  await userEvent.click(warfare);
  expect(plan().rounds[0]).toMatchObject({ strategyCard: null, backupCard: 6 });
  expect(screen.getByRole('button', { name: /Warfare/ })).toHaveTextContent('Backup');
  expect(screen.getAllByRole('listitem')).toHaveLength(cards.length);
  await userEvent.click(screen.getByRole('button', { name: /Warfare/ }));
  expect(plan().rounds[0]).toMatchObject({ strategyCard: 6, backupCard: null });
  expect(screen.getByRole('button', { name: /Warfare/ })).toHaveTextContent('Main');
  await userEvent.click(screen.getByRole('button', { name: /Warfare/ }));
  expect(plan().rounds[0]).toMatchObject({ strategyCard: null, backupCard: null });
});

test('choosing a main card collapses the list; clearing it opens the list again', async () => {
  render(<StrategyCardsLive />);
  await userEvent.click(screen.getByRole('button', { name: /Trade/ }));
  expect(screen.getAllByRole('listitem')).toHaveLength(8);
  await userEvent.click(screen.getByRole('button', { name: /Trade/ }));
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
  await userEvent.click(screen.getByRole('button', { name: /Trade/ }));
  expect(screen.getAllByRole('listitem')).toHaveLength(8);
});

test('the card list collapses to the chosen cards', async () => {
  useGame.getState().setStrategyCard(1, 5);
  useGame.getState().setStrategyCard(1, 5);
  render(<StrategyCardsLive />);
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
  await userEvent.click(screen.getByRole('button', { name: 'All cards' }));
  expect(screen.getAllByRole('listitem')).toHaveLength(8);
  await userEvent.click(screen.getByRole('button', { name: 'Collapse' }));
  expect(screen.getByRole('button', { name: /Trade/ })).toBeVisible();
  expect(screen.queryByRole('button', { name: /Warfare/ })).toBeNull();
});

function StrategyCardsLive() {
  const live = useGame(s => s.game)!;
  const round = live.plans[0].rounds[0];
  return <StrategyCards expansions={live.expansions} round={round} />;
}

test('the menu holds all seven items', async () => {
  const onPick = vi.fn();
  render(<ActionMenu onPick={onPick} />);
  await userEvent.click(screen.getByRole('button', { name: 'Add action' }));
  const names = ['Tactical action', 'Strategic action', 'Secondary ability', 'Component action', 'Expedition contribution', 'Pass', 'Manual adjustment'];
  for (const name of names) expect(screen.getByRole('button', { name })).toBeVisible();
  expect(ACTION_TYPES).toHaveLength(7);
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
  sliceTaken: { sliceId: 'res5' },
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
    <PlanTabs game={live} roundNo={1} onSelectRound={() => undefined} onSelectPlan={() => undefined} onAddRound={() => undefined} />
  );
}

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

test('up and down buttons move an entry, and stop at the ends', async () => {
  threeEntries();
  render(<EntryListLive />);
  const row = () => screen.getByRole('listitem', { name: 'Strategic action' });
  await userEvent.click(within(row()).getByRole('button', { name: 'Move up' }));
  expect(order()).toEqual(['strategic', 'pass', 'secondary']);
  expect(within(row()).getByRole('button', { name: 'Move up' })).toBeDisabled();
  await userEvent.click(within(row()).getByRole('button', { name: 'Move down' }));
  await userEvent.click(within(row()).getByRole('button', { name: 'Move down' }));
  expect(order()).toEqual(['pass', 'secondary', 'strategic']);
});

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
  fireEvent.pointerUp(handle, { pointerId: 1, clientY: 140 });
  expect(order()).toEqual(['strategic', 'secondary', 'pass']);
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
