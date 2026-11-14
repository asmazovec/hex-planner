import { render, screen, within } from '@testing-library/react';
import { viewOf } from '../../../../ui/testing/legacyMap';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { expectShownStanding, expectShownWaived, showUses, use, uiBench } from '../../../../ui/testing/effects';
import { TransactionStep } from '../../../../ui/plan/editors/TransactionStep';
import { project, stateBeforeEntry } from '../../../../testing/old/domain/project';
import type { Act, Entry, Game, Opponent } from '../../../types';
import { bench, NEAR, quote, tactical, using } from '../kit';
import { id } from './blackmarketdealing';
import { transactionProps } from '../../../../ui/testing/turnProps';

uiBench();

const RIVAL: Opponent = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };
const RELIC = 'relic:dynamiscore';
type Transaction = Extract<Act, { kind: 'transaction' }>;

const table = (entry: Entry) => bench({
  faction: 'letnev', expansions: ['pok', 'te'], units: { [NEAR]: { carrier: 1 } }, entries: [entry],
  game: { opponents: [RIVAL], enemyUnits: { [NEAR]: { o1: { carrier: 1 } } }, start: { me: { hand: [id], relics: [RELIC] }, opponents: {} } } as Partial<Game>,
});
const giving = (components: string[]): Transaction => ({ kind: 'transaction', with: 'o1', give: { components }, get: {} });

// "You and the other player may include relics, action cards, and unscored secret objectives as part of the transaction."
// Checks: a turn whose transaction gives a relic is warned of; I name the card in «Used», it is written into the entry,
// and the warning reads as allowed by Black Market Dealings.
// Why the check is redundant here: LRR 94.3 keeps relics out of transactions, and the card lets them in.
test('actionCard:blackmarketdealing named in «Used», the relic in the transaction reads as allowed by Black Market Dealings', async () => {
  const turn = tactical(NEAR, { acts: [giving([RELIC])] });
  const market = table(turn);
  quote(market.pack, id, 'may include relics, action cards, and unscored secret objectives');
  const live = showUses(market, turn);
  expectShownStanding('transactionKind');
  await use('Black Market Dealings');
  expect(live.entry().uses).toEqual([id]);
  expectShownWaived('transactionKind', 'Black Market Dealings');
});

// "You and the other player may include relics ... as part of the transaction."
// Checks: in the transaction of a turn that plays the card, «+ Component» of my side offers the relic I hold (today the
// side offers only promissory notes and action cards: the card itself, not the relic).
// Why the check is redundant here: the card adds relics to what a transaction hands over (94.3).
test('actionCard:blackmarketdealing the transaction offers the relic I hold once the card is played', async () => {
  const act = giving([]);
  const turn = using(tactical(NEAR, { acts: [act] }), id);
  const market = table(turn);
  const plan = market.game.plans[0];
  const board = stateBeforeEntry(market.game, plan, turn.id, market.pack);
  const warnings = project(market.game, plan, 'forecast', market.pack).warningsByEntry[turn.id] ?? [];
  const nothing = () => undefined;
  render(<TransactionStep {...transactionProps(viewOf(market.game, board, market.pack), market.pack, act, "me", turn.uses, nothing)} view={viewOf(market.game, board, market.pack)} pack={market.pack} warnings={warnings} onBack={nothing} onRemove={nothing}/>);
  await userEvent.click(within(screen.getByRole('group', { name: 'Give' })).getByRole('button', { name: '+ Component' }));
  expect(await screen.findByRole('button', { name: 'Choose Dynamis Core' })).toBeEnabled();
});

// LRR 94.3: "... but cannot exchange other types of cards or tokens."
// Checks: without the card the relic stays in the transaction and its warning stands.
// Why the check is NOT redundant here: the card is held, not played with this turn.
test('actionCard:blackmarketdealing not named, the relic in the transaction stands warned', () => {
  const turn = tactical(NEAR, { acts: [giving([RELIC])] });
  showUses(table(turn), turn);
  expectShownStanding('transactionKind');
});
