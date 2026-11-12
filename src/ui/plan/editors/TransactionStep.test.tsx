import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { throwaway } from '../../../domain/effects/points/throwaway';
import { bench, NEAR, tactical } from '../../../domain/effects/components/kit';
import { stateBeforeEntry } from '../../../domain/project';
import type { Act, Game, Opponent } from '../../../domain/types';
import { useGame } from '../../../state/gameStore';
import { uiBench } from '../../testing/effects';
import { TransactionStep } from './TransactionStep';

vi.mock('../../../domain/effects/registry', async original => (await import('../../../domain/effects/points/throwaway')).mockRegistry(await original()));

uiBench();

const RIVAL: Opponent = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };
const RELIC = 'relic:dynamiscore';
const SECRET = 'secretObjective:ans';
const MARKET = 'actionCard:blackmarketdealing';
type Transaction = Extract<Act, { kind: 'transaction' }>;

beforeEach(() => { for (const key of Object.keys(throwaway)) delete throwaway[key]; });

async function openGive(uses: string[]) {
  const act: Transaction = { kind: 'transaction', with: 'o1', give: {}, get: {} };
  const turn = tactical(NEAR, { acts: [act] });
  const table = bench({
    faction: 'letnev', expansions: ['pok', 'te'], units: { [NEAR]: { carrier: 1 } }, entries: [turn],
    game: { opponents: [RIVAL], enemyUnits: { [NEAR]: { o1: { carrier: 1 } } }, start: { me: { relics: [RELIC], secrets: [SECRET] }, opponents: {} } } as Partial<Game>,
  } as Parameters<typeof bench>[0]);
  const board = stateBeforeEntry(table.game, table.game.plans[0], turn.id, table.pack);
  useGame.setState({ game: table.game });
  const nothing = () => undefined;
  render(<TransactionStep game={table.game} pack={table.pack} act={act} owner="me" board={board} warnings={[]} uses={uses} onChange={nothing} onBack={nothing} onRemove={nothing} />);
  await userEvent.click(within(screen.getByRole('group', { name: 'Give' })).getByRole('button', { name: '+ Component' }));
}

test('a deal offers no relic nor secret objective by default', async () => {
  await openGive([]);
  expect(screen.queryByRole('button', { name: 'Choose Dynamis Core' })).toBeNull();
});

test('a used component that lifts the check of the kind opens relics and unscored secret objectives to the deal', async () => {
  throwaway[MARKET] = { tier: 'play', rule: 'x', waive: [{ code: 'transactionKind', rule: 'x' }] };
  await openGive([MARKET]);
  expect(await screen.findByRole('button', { name: 'Choose Dynamis Core' })).toBeEnabled();
});
