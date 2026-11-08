/** LRR 82 Strategic Action. Source: tirules2 rules-reference/strategic-action.md. */
import { describe, expect, test } from 'vitest';
import { CARD } from '../../strategy';
import type { Entry, Game } from '../../types';
import { codesOf, forecast, primary, rulesGame, rulesPack, secondary } from '../kit';

const pack = rulesPack();

/** A round in which my card is set, as the strategy phase sets it. */
function holding(game: Game, card: number, backup: number | null = null): Game {
  const [first, ...rest] = game.plans[0].rounds;
  return { ...game, plans: [{ ...game.plans[0], rounds: [{ ...first, strategyCard: card, backupCard: backup }, ...rest] }] };
}

let passes = 0;
const pass = (): Entry => ({ id: `pass-${(passes += 1)}`, phase: 'action', status: 'planned', type: 'pass' });

describe('LRR 82 Strategic Action', () => {
  test('82: the primary of my own card is resolved by a strategic action, for no token', () => {
    const play = primary(CARD.trade);
    const game = holding(rulesGame({ entries: [play] }), CARD.trade);
    expect(codesOf(game, pack, play)).toEqual([]);
    expect(forecast(game, pack).state.tradeGoods).toBe(3);
  });

  test('82.1: the other players may resolve the secondary of the active player\'s card', () => {
    const follow = secondary(CARD.trade);
    const game = holding(rulesGame({ entries: [follow] }), CARD.leadership);
    expect(codesOf(game, pack, follow)).toEqual([]);
  });

  test('82.1: the active player does not resolve the secondary of their own card', () => {
    const follow = secondary(CARD.trade);
    const game = holding(rulesGame({ entries: [follow] }), CARD.trade);
    expect(codesOf(game, pack, follow)).toContain('ownSecondary');
  });

  test.todo('82.1.1: secondaries are optional — nothing to check: a secondary is an entry the player adds or not');

  test('82.2: the card is exhausted after the strategic action: its primary cannot be used again this round', () => {
    const first = primary(CARD.trade);
    const again = primary(CARD.trade);
    const game = holding(rulesGame({ entries: [first, again] }), CARD.trade);
    expect(codesOf(game, pack, again)).toContain('primaryRepeated');
  });

  test('82.2: a player can pass only after the strategic action of their card', () => {
    const early = pass();
    const game = holding(rulesGame({ entries: [early, primary(CARD.trade)] }), CARD.trade);
    expect(codesOf(game, pack, early)).toContain('passBeforeStrategy');
  });

  test('82.2: having resolved it, the player may pass', () => {
    const late = pass();
    const game = holding(rulesGame({ entries: [primary(CARD.trade), late] }), CARD.trade);
    expect(codesOf(game, pack, late)).toEqual([]);
  });

  test('82.2.1: with three or four players, both chosen cards must be resolved before passing', () => {
    const early = pass();
    const game = holding(rulesGame({ playerCount: 4, entries: [primary(CARD.trade), early, primary(CARD.leadership, { tokens: { tactic: 3 } })] }), CARD.trade, CARD.leadership);
    expect(codesOf(game, pack, early)).toContain('passBeforeStrategy');
  });

  test.todo('82.3: each ability resolves its effects top to bottom — not modelled: a card\'s effects are recorded together, their order is not kept');
});
