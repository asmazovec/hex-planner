/** Waivers that read what the round has already seen: the kernel gives them its round track, not a plan to search. */
import { describe, expect, test } from 'vitest';
import { CARD } from '../../domain/replay/cards/ids';
import { primary, rulesGame, rulesPack, secondary } from '../../domain/rules/kit';
import { applyAll } from '../apply';
import { emptyBoard } from '../board';
import { tableOf, turnOf } from '../../testing/old/game/fromLegacy';
import { resolveTurn, warningsOf } from './index';
import { newTrack } from './track';

const pack = rulesPack(undefined, ['te']);
const game = rulesGame({ expansions: ['te'], game: { opponents: [{ id: 'o1', faction: 'rules-tester', vp: 0, seat: 2, color: 2 }] } });
const table = tableOf(game);
const [me] = table.players.map(p => p.id);
const STRATEGIZE = 'actionCard:strategize1';
const start = () => applyAll(emptyBoard(table), [
  { type: 'TokensChanged', player: me, delta: { strategy: 2 } },
  { type: 'CardGained', player: me, card: STRATEGIZE },
]);
const withStrategize = () => ({ ...secondary(CARD.trade), uses: [STRATEGIZE] });

describe('Strategize lifts ownSecondary of a card that is still readied', () => {
  // "Perform the secondary ability of any readied or unchosen strategy card." A card whose primary I resolved earlier this round is not readied.
  test('the primary of the card was not resolved this round: lifted', () => {
    const r = resolveTurn(table, start(), turnOf(table, withStrategize(), pack), pack, { track: newTrack({ [me]: [CARD.trade] }) });
    expect(warningsOf(r.steps).find(w => w.code === 'ownSecondary')?.waivedBy).toEqual([STRATEGIZE]);
  });

  test('the primary of the card was resolved earlier this round: the warning stands', () => {
    const first = resolveTurn(table, start(), turnOf(table, primary(CARD.trade), pack), pack, { track: newTrack({ [me]: [CARD.trade] }) });
    const r = resolveTurn(table, first.board, turnOf(table, withStrategize(), pack), pack, { track: first.track });
    expect(warningsOf(r.steps).find(w => w.code === 'ownSecondary')?.waivedBy).toBeUndefined();
  });
});
