import { render, screen } from '@testing-library/react';
import { kernelViewOf } from '../../testing/view';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, test, vi } from 'vitest';
import { throwaway } from '../../../domain/effects/points/throwaway';
import { bench, componentAction } from '../../../domain/effects/components/kit';
import { stateBeforeEntry } from '../../../domain/project';
import type { Entry } from '../../../domain/types';
import { useGame } from '../../../state/gameStore';
import { uiBench } from '../../testing/effects';
import { TurnEditor } from './TurnEditor';

vi.mock('../../../domain/effects/registry', async original => (await import('../../../domain/effects/points/throwaway')).mockRegistry(await original()));

uiBench();

const CARD = 'actionCard:sabo1';

beforeEach(() => { for (const key of Object.keys(throwaway)) delete throwaway[key]; });

function show(entry: Entry, onPayment: (p: unknown) => void) {
  const table = bench({ faction: 'sol', expansions: ['pok'], start: { hand: [CARD] }, entries: [entry] });
  useGame.setState({ game: table.game });
  const board = stateBeforeEntry(table.game, table.game.plans[0], entry.id, table.pack);
  const nothing = () => undefined;
  render(
    <TurnEditor view={kernelViewOf(table.game, table.pack)}
      entry={entry as Extract<Entry, { type: 'component' }>} game={table.game} pack={table.pack} board={board} warnings={[]} common={null}
      onNote={nothing} onComponent={nothing} onPayment={onPayment} onDone={nothing} onRemove={nothing}
    />,
  );
}

test('a component with a declared cost shows the payment block, and the planets are chosen by hand', async () => {
  throwaway[CARD] = { tier: 'play', rule: 'x', cost: { kind: 'influence', amount: 3 } };
  const seen: unknown[] = [];
  show(componentAction(CARD), p => seen.push(p));
  expect(screen.getByText(/Cost 3, paid 0/)).toBeTruthy();
  await userEvent.click(screen.getByRole('button', { name: 'Choose manually' }));
  await userEvent.click(screen.getByRole('button', { name: /Home Two/ }));
  expect(seen).toEqual([{ planets: ['h2'], tradeGoods: 0 }]);
});

test('a component without a cost shows no payment block', () => {
  show(componentAction(CARD), () => undefined);
  expect(screen.queryByText(/Cost 3/)).toBeNull();
});
