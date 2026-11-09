import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { loadPack } from '../../../data/loadPack';
import { createGame } from '../../../domain/newGame';
import type { Act, Entry, Game } from '../../../domain/types';
import { setLanguage } from '../../../i18n';
import { TransactionStep } from '../editors/TransactionStep';
import { TurnActs } from './TurnActs';

const pack = loadPack(['pok', 'te']);
afterEach(cleanup);
beforeEach(() => setLanguage('en'));

const gameWith = (expansions: Game['expansions'] = ['pok', 'te']): Game => createGame({ expansions, playerCount: 4, faction: 'sol' }, pack);
const turn = (acts: Act[] = []): Entry => ({ id: 't', phase: 'action', status: 'planned', type: 'pass', acts });

function block(entry: Entry, game = gameWith()) {
  const onChange = vi.fn();
  const onOpen = vi.fn();
  render(<TurnActs game={game} pack={pack} entry={entry} warnings={[]} owners={{}} onChange={onChange} onOpen={onOpen} />);
  return { onChange, onOpen, game };
}

test('the block lists the acts of the turn as cards, each opening its step and removed by its cross', async () => {
  const game = gameWith();
  const deal: Act = { kind: 'transaction', with: game.opponents[0].id, give: { tradeGoods: 2 }, get: {} };
  const { onChange, onOpen } = block(turn([deal]), game);
  const section = within(screen.getByRole('group', { name: 'In this turn' }));
  await userEvent.click(section.getByRole('button', { name: /^\+ Transaction with Player 2/ }));
  expect(onOpen).toHaveBeenCalledWith(0);
  await userEvent.click(section.getByRole('button', { name: 'Remove: transaction' }));
  expect(onChange).toHaveBeenCalledWith([]);
});

test('«+ Transaction» adds one with the first opponent and opens it', async () => {
  const { onChange, onOpen, game } = block(turn());
  await userEvent.click(screen.getByRole('button', { name: '+ Transaction' }));
  expect(onChange).toHaveBeenCalledWith([{ kind: 'transaction', with: game.opponents[0].id, give: {}, get: {} }]);
  expect(onOpen).toHaveBeenCalledWith(0);
});

test('«+ Expedition» stands only with Thunder\'s Edge and while a part is free', async () => {
  const { onChange, onOpen } = block(turn());
  await userEvent.click(screen.getByRole('button', { name: '+ Expedition' }));
  expect(onChange).toHaveBeenCalledWith([{ kind: 'expedition', sliceId: null, payment: { planets: [], tradeGoods: 0 } }]);
  expect(onOpen).toHaveBeenCalledWith(0);
  cleanup();
  block(turn(), gameWith(['pok']));
  expect(screen.queryByRole('button', { name: '+ Expedition' })).toBeNull();
  cleanup();
  const full = gameWith();
  full.expedition.slices = { res5: 'me', inf5: 'me', tg3: 'me', secret: 'me', cards: 'me', tech: 'me' };
  block(turn(), full);
  expect(screen.queryByRole('button', { name: '+ Expedition' })).toBeNull();
});

test('the transaction step sets the player and what is given and got', async () => {
  const game = gameWith();
  const onChange = vi.fn();
  const act: Act = { kind: 'transaction', with: game.opponents[0].id, give: {}, get: {} };
  render(<TransactionStep game={game} pack={pack} act={act} owner="me" warnings={[]} onChange={onChange} onBack={vi.fn()} onRemove={vi.fn()} />);
  await userEvent.click(within(screen.getByRole('group', { name: 'Give' })).getByRole('button', { name: 'Add one Trade goods' }));
  expect(onChange).toHaveBeenLastCalledWith({ ...act, give: { tradeGoods: 1 } });
  await userEvent.click(within(screen.getByRole('group', { name: 'Get' })).getByRole('button', { name: 'Promissory note' }));
  expect(onChange).toHaveBeenLastCalledWith({ ...act, get: { note: true } });
  await userEvent.click(within(screen.getByRole('group', { name: 'With whom' })).getByRole('button', { name: 'Player 3' }));
  expect(onChange).toHaveBeenLastCalledWith({ ...act, with: game.opponents[1].id });
});

test('in the turn of an opponent the transaction step lists every other player once, me among them', async () => {
  const { gameAs } = await import('../../../domain/players');
  const game = gameWith();
  const rival = game.opponents[0].id;
  const act: Act = { kind: 'transaction', with: 'me', give: {}, get: {} };
  render(<TransactionStep game={gameAs(game, rival)} pack={pack} act={act} owner={rival} warnings={[]} onChange={vi.fn()} onBack={vi.fn()} onRemove={vi.fn()} />);
  const names = within(screen.getByRole('group', { name: 'With whom' })).getAllByRole('button').map(b => b.textContent);
  expect(names).toHaveLength(game.opponents.length);
  expect(new Set(names).size).toBe(names.length);
});
