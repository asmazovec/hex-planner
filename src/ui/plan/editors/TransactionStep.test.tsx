import { render, screen, within } from '@testing-library/react';
import { viewOf } from '../../../ui/testing/legacyMap';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { throwaway } from '../../../domain/effects/points/throwaway';
import { bench, NEAR, tactical } from '../../../domain/effects/components/kit';
import { stateBeforeEntry } from '../../../testing/old/domain/project';
import type { Act, Game, Opponent } from '../../../domain/types';
import { uiBench } from '../../testing/effects';
import { TransactionStep } from './TransactionStep';
import { transactionProps } from '../../testing/turnProps';
import { seedGame } from '../../../testing/store';

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
  seedGame(table.game);
  const nothing = () => undefined;
  render(<TransactionStep {...transactionProps(viewOf(table.game, board, table.pack), table.pack, act, "me", uses, nothing)} view={viewOf(table.game, board, table.pack)} pack={table.pack} warnings={[]} onBack={nothing} onRemove={nothing}/>);
  await userEvent.click(within(screen.getByRole('group', { name: 'Give' })).getByRole('button', { name: '+ Component' }));
}

test('a deal offers no relic nor secret objective by default', async () => {
  await openGive([]);
  expect(screen.queryByRole('button', { name: 'Choose Dynamis Core' })).toBeNull();
});

test('a used component that lifts the check of the kind opens relics and unscored secret objectives to the deal', async () => {
  throwaway[MARKET] = { tier: 'play', rule: 'x', permit: [{ code: 'transactionKind', rule: 'x' }] };
  await openGive([MARKET]);
  expect(await screen.findByRole('button', { name: 'Choose Dynamis Core' })).toBeEnabled();
});
