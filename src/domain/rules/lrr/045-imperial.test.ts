/** LRR 45 Imperial (Strategy Card). Source: tirules2 rules-reference/imperial.md. */
import { describe, expect, test } from 'vitest';
import { MECATOL_PLANET, MECATOL_TILE } from '../../mecatol';
import { CARD, costsStrategyToken } from '../../strategy';
import type { Entry } from '../../../testing/old/domain/types';
import { codesOf, forecast, primary, rulesGame, rulesPack, secondary } from '../kit';

const pack = rulesPack();
const card = (e: Entry) => e as Extract<Entry, { type: 'strategic' | 'secondary' }>;

describe('LRR 45 Imperial', () => {
  const withMecatol = (control: boolean) => rulesGame({
    map: { ...rulesGame().map, '0,-1': MECATOL_TILE },
    entries: [primary(CARD.imperial, { mecatol: true })],
    game: { planetControl: control ? { [MECATOL_PLANET]: 'me' } : {} },
  });

  test('45 (intro): the Imperial card has initiative 8', () => {
    expect(CARD.imperial).toBe(8);
  });

  test('45.1: the primary of one\'s own Imperial card is a strategic action that costs no token', () => {
    const play = primary(CARD.imperial);
    expect(costsStrategyToken(card(play))).toBe(false);
    expect(forecast(rulesGame({ entries: [play] }), pack).state.strategy).toBe(2);
  });

  test.todo('45.2: the primary first scores one public objective whose requirement is met — not modelled: objectives are not tracked, points go in by hand');

  test('45.2: the primary gains one victory point when the player controls Mecatol Rex', () => {
    expect(forecast(withMecatol(true), pack).state.vp).toBe(1);
  });

  test('45.2: without control of Mecatol Rex the primary gains no point', () => {
    expect(forecast(withMecatol(false), pack).state.vp).toBe(0);
  });

  test('45.3: another player\'s Imperial secondary costs a strategy token', () => {
    const play = secondary(CARD.imperial);
    const game = rulesGame({ entries: [play] });
    expect(costsStrategyToken(card(play))).toBe(true);
    expect(forecast(game, pack).state.strategy).toBe(1);
  });

  test('45.3: the secondary with no strategy token left is warned about', () => {
    const play = secondary(CARD.imperial);
    const game = rulesGame({ entries: [secondary(CARD.trade), secondary(CARD.politics), play] });
    expect(codesOf(game, pack, play)).toContain('shortStrategy');
  });

  test('45.3: the secondary gains no victory point', () => {
    const play = secondary(CARD.imperial, { mecatol: true });
    const game = rulesGame({
      map: { ...rulesGame().map, '0,-1': MECATOL_TILE }, entries: [play], game: { planetControl: { [MECATOL_PLANET]: 'me' } },
    });
    expect(forecast(game, pack).state.vp).toBe(0);
  });

  test.todo('45.4: a player above three secret objectives returns an unscored one — not modelled: secret objectives are not tracked');
  test.todo('45 note 1: scoring a public objective with Imperial needs every home planet — not modelled: objectives are not tracked');

  test('45 note 2: the Mecatol point does not need the home planets', () => {
    const game = rulesGame({
      map: { ...rulesGame().map, '0,-1': MECATOL_TILE },
      entries: [primary(CARD.imperial, { mecatol: true })],
      game: { planetControl: { [MECATOL_PLANET]: 'me', h1: 'enemy' } },
    });
    expect(forecast(game, pack).state.vp).toBe(1);
  });

  test('45 note 3: a player controlling Mecatol Rex must take the point, so the primary gains it without being asked', () => {
    const game = rulesGame({
      map: { ...rulesGame().map, '0,-1': MECATOL_TILE },
      entries: [primary(CARD.imperial)],
      game: { planetControl: { [MECATOL_PLANET]: 'me' } },
    });
    expect(forecast(game, pack).state.vp).toBe(1);
  });

  test.todo('45 note 4: a discarded secret objective is shuffled back before the next player draws — not modelled: no decks');
});
