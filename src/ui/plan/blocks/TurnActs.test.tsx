import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

vi.mock('../../../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
}));

import { loadPack } from '../../../data/loadPack';
import { emptyHoldings } from '../../../domain/holdings';
import { createGame } from '../../../domain/newGame';
import type { Act, Entry, Game, GameState, Holdings } from '../../../domain/types';
import { setLanguage } from '../../../i18n';
import { useGame } from '../../../state/gameStore';
import { TransactionStep } from '../editors/TransactionStep';
import { TurnActs } from './TurnActs';

const pack = loadPack(['pok', 'te']);
afterEach(cleanup);
beforeEach(() => {
  setLanguage('en');
  // The choice of a component reads the pack of the open game.
  useGame.getState().newGame({ expansions: ['pok', 'te'], playerCount: 4, faction: 'sol' }, pack);
});

/** The board before an entry, as far as a transaction reads it: what I hold and what each rival holds. */
const boardOf = (mine: Partial<Holdings> = {}, rivals: Record<string, Partial<Holdings>> = {}): GameState => ({
  holdings: { ...emptyHoldings(), ...mine },
  rivals: Object.fromEntries(Object.entries(rivals).map(([id, held]) => [id, { holdings: { ...emptyHoldings(), ...held } }])),
} as unknown as GameState);
const NOTE = 'promissory:war_funding';
const THEIR_NOTE = 'promissory:ragh';
const CARD = 'actionCard:sabo1';

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
  render(<TransactionStep game={game} pack={pack} act={act} owner="me" board={boardOf()} warnings={[]} onChange={onChange} onBack={vi.fn()} onRemove={vi.fn()} />);
  await userEvent.click(within(screen.getByRole('group', { name: 'Give' })).getByRole('button', { name: 'Add one Trade goods' }));
  expect(onChange).toHaveBeenLastCalledWith({ ...act, give: { tradeGoods: 1 } });
  await userEvent.click(within(screen.getByRole('group', { name: 'With whom' })).getByRole('button', { name: 'Player 3' }));
  expect(onChange).toHaveBeenLastCalledWith({ ...act, with: game.opponents[1].id });
});

const offered = () => within(screen.getByRole('dialog', { name: 'Choose a component' })).queryAllByTestId(/^component-/).map(card => card.getAttribute('data-testid'));

test('«+ Component» offers only what the giving side holds and a transaction hands over: notes first, then action cards', async () => {
  const game = gameWith();
  const rival = game.opponents[0].id;
  const onChange = vi.fn();
  const act: Act = { kind: 'transaction', with: rival, give: {}, get: {} };
  const board = boardOf(
    { promissory: [NOTE], hand: [CARD, CARD], technologies: ['technology:st'], relics: ['relic:shard'] },
    { [rival]: { promissory: [THEIR_NOTE] }, [game.opponents[1].id]: { promissory: ['promissory:fires'] } },
  );
  render(<TransactionStep game={game} pack={pack} act={act} owner="me" board={board} warnings={[]} onChange={onChange} onBack={vi.fn()} onRemove={vi.fn()} />);
  await userEvent.click(within(screen.getByRole('group', { name: 'Give' })).getByRole('button', { name: '+ Component' }));
  expect(offered()).toEqual([`component-${NOTE}`, `component-${CARD}`]);
  await userEvent.click(screen.getByRole('button', { name: 'Choose War Funding' }));
  expect(onChange).toHaveBeenLastCalledWith({ ...act, give: { components: [NOTE] } });
  expect(screen.queryByRole('dialog', { name: 'Choose a component' })).toBeNull();
  // What I get comes from the hand of the player the transaction is with, and of no one else.
  await userEvent.click(within(screen.getByRole('group', { name: 'Get' })).getByRole('button', { name: '+ Component' }));
  expect(offered()).toEqual([`component-${THEIR_NOTE}`]);
});

test('in a rival\'s turn the sides swap: the rival gives from their holdings and gets from mine', async () => {
  const { gameAs } = await import('../../../domain/players');
  const game = gameWith();
  const rival = game.opponents[0].id;
  const act: Act = { kind: 'transaction', with: 'me', give: {}, get: {} };
  const board = boardOf({ promissory: [NOTE] }, { [rival]: { promissory: [THEIR_NOTE] } });
  render(<TransactionStep game={gameAs(game, rival)} pack={pack} act={act} owner={rival} board={board} warnings={[]} onChange={vi.fn()} onBack={vi.fn()} onRemove={vi.fn()} />);
  await userEvent.click(within(screen.getByRole('group', { name: 'Give' })).getByRole('button', { name: '+ Component' }));
  expect(offered()).toEqual([`component-${THEIR_NOTE}`]);
  await userEvent.keyboard('{Escape}');
  await userEvent.click(within(screen.getByRole('group', { name: 'Get' })).getByRole('button', { name: '+ Component' }));
  expect(offered()).toEqual([`component-${NOTE}`]);
});

test('a chosen component is not offered again, and a side with nothing left to hand over cannot open the choice', async () => {
  const game = gameWith();
  const rival = game.opponents[0].id;
  const act: Act = { kind: 'transaction', with: rival, give: { components: [NOTE, CARD] }, get: {} };
  render(<TransactionStep game={game} pack={pack} act={act} owner="me" board={boardOf({ promissory: [NOTE], hand: [CARD, CARD] })} warnings={[]} onChange={vi.fn()} onBack={vi.fn()} onRemove={vi.fn()} />);
  await userEvent.click(within(screen.getByRole('group', { name: 'Give' })).getByRole('button', { name: '+ Component' }));
  // The note is held once; the second copy of the action card is still in hand.
  expect(offered()).toEqual([`component-${CARD}`]);
  expect(within(screen.getByRole('group', { name: 'Get' })).getByRole('button', { name: '+ Component' })).toBeDisabled();
});

test('the chosen components stand under the counters and the button that adds them, so nothing above moves when one is added', async () => {
  const game = gameWith();
  const onChange = vi.fn();
  const act: Act = { kind: 'transaction', with: game.opponents[0].id, give: { tradeGoods: 1, components: [NOTE, CARD] }, get: {} };
  render(<TransactionStep game={game} pack={pack} act={act} owner="me" board={boardOf({ promissory: [NOTE], hand: [CARD] })} warnings={[]} onChange={onChange} onBack={vi.fn()} onRemove={vi.fn()} />);
  const give = within(screen.getByRole('group', { name: 'Give' }));
  const order = [
    give.getByRole('group', { name: 'Trade goods' }), give.getByRole('group', { name: 'Commodities' }),
    give.getByRole('button', { name: '+ Component' }), give.getByTestId(`component-${NOTE}`), give.getByTestId(`component-${CARD}`),
  ];
  for (let i = 1; i < order.length; i += 1) {
    expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING, String(i)).toBeTruthy();
  }
  // An action card changes hands only by an ability (94.3.1): the card says so.
  expect(give.getByTestId(`component-${CARD}`)).toHaveTextContent('by an ability');
  expect(give.getByTestId(`component-${NOTE}`)).not.toHaveTextContent('by an ability');
  // The cross inside the card takes the component out of the transaction.
  await userEvent.click(give.getByRole('button', { name: 'Remove War Funding' }));
  expect(onChange).toHaveBeenLastCalledWith({ ...act, give: { tradeGoods: 1, components: [CARD] } });
  await userEvent.click(give.getByRole('button', { name: 'Remove Sabotage' }));
  expect(onChange).toHaveBeenLastCalledWith({ ...act, give: { tradeGoods: 1, components: [NOTE] } });
});

test('the line of a transaction names the components that change hands', async () => {
  const game = gameWith();
  const deal: Act = { kind: 'transaction', with: game.opponents[0].id, give: { tradeGoods: 2, components: [NOTE] }, get: { components: [CARD] } };
  block(turn([deal]), game);
  expect(screen.getByRole('button', { name: '+ Transaction with Player 2: give trade goods 2, War Funding; get Sabotage' })).toBeVisible();
});

test('in the turn of an opponent the transaction step lists every other player once, me among them', async () => {
  const { gameAs } = await import('../../../domain/players');
  const game = gameWith();
  const rival = game.opponents[0].id;
  const act: Act = { kind: 'transaction', with: 'me', give: {}, get: {} };
  render(<TransactionStep game={gameAs(game, rival)} pack={pack} act={act} owner={rival} board={boardOf()} warnings={[]} onChange={vi.fn()} onBack={vi.fn()} onRemove={vi.fn()} />);
  const names = within(screen.getByRole('group', { name: 'With whom' })).getAllByRole('button').map(b => b.textContent);
  expect(names).toHaveLength(game.opponents.length);
  expect(new Set(names).size).toBe(names.length);
});

test('a note got from a rival says whose it is, in the choice, in its text and once chosen; a search finds it among what they hold', async () => {
  useGame.getState().setOpponent(0, { faction: 'hacan' });
  const game = useGame.getState().game!;
  const rival = game.opponents[0].id;
  const theirs = `promissory:<color>_ta@${rival}`;
  const onChange = vi.fn();
  const act: Act = { kind: 'transaction', with: rival, give: {}, get: { components: [`promissory:convoys@${rival}`] } };
  const board = boardOf({ promissory: ['promissory:<color>_ta@me'] }, { [rival]: { promissory: [theirs, `promissory:convoys@${rival}`] } });
  render(<TransactionStep game={game} pack={pack} act={act} owner="me" board={board} warnings={[]} onChange={onChange} onBack={vi.fn()} onRemove={vi.fn()} />);
  const get = within(screen.getByRole('group', { name: 'Get' }));
  expect(get.getByTestId(`component-promissory:convoys@${rival}`)).toHaveTextContent('Hacan');
  await userEvent.click(get.getByRole('button', { name: '+ Component' }));
  expect(offered()).toEqual([`component-${theirs}`]);
  const choice = within(screen.getByRole('dialog', { name: 'Choose a component' }));
  const card = choice.getByTestId(`component-${theirs}`);
  await userEvent.click(within(card).getByRole('button', { name: /^Trade Agreement\s*Hacan/ }));
  expect(card).toHaveTextContent('return this card to the Hacan player');
  await userEvent.type(choice.getByRole('searchbox'), 'trade agreement');
  expect(offered()).toEqual([`component-${theirs}`]);
  await userEvent.click(choice.getByRole('button', { name: 'Choose Trade Agreement' }));
  expect(onChange).toHaveBeenLastCalledWith({ ...act, get: { components: [`promissory:convoys@${rival}`, theirs] } });
});

test('in a rival\'s turn the note the rival gives is still marked as theirs, and mine as mine', async () => {
  const { gameAs } = await import('../../../domain/players');
  useGame.getState().setOpponent(0, { faction: 'hacan' });
  const game = useGame.getState().game!;
  const rival = game.opponents[0].id;
  const act: Act = { kind: 'transaction', with: 'me', give: { components: [`promissory:<color>_ta@${rival}`] }, get: { components: ['promissory:<color>_ta@me'] } };
  render(<TransactionStep game={gameAs(game, rival)} pack={pack} act={act} owner={rival} board={boardOf()} warnings={[]} onChange={vi.fn()} onBack={vi.fn()} onRemove={vi.fn()} />);
  expect(within(screen.getByRole('group', { name: 'Give' })).getByTestId(`component-promissory:<color>_ta@${rival}`)).toHaveTextContent('Hacan');
  expect(within(screen.getByRole('group', { name: 'Get' })).getByTestId('component-promissory:<color>_ta@me')).toHaveTextContent('Sol');
});
