/** LRR 32 Diplomacy. Source: tirules2 rules-reference/diplomacy.md. */
import { describe, expect, test } from 'vitest';
import { MECATOL_PLANET, MECATOL_TILE } from '../../mecatol';
import { CARD } from '../../strategy';
import type { Player } from '../../players';
import { codesOf, FACTION, forecast, HOME, NEAR, primary, rulesGame, rulesPack, secondary, tactical, TARGET } from '../kit';

const pack = rulesPack();
const RIVAL: Player = { id: 'o1', faction: FACTION, vp: 0, seat: 2, color: 2 };
/** h1, h2 and t1 spent by one action, t1 being mine. */
const spendThree = () => tactical(TARGET, { payment: { planets: ['h1', 'h2', 't1'], tradeGoods: 0 } });

describe('LRR 32 Diplomacy', () => {
  test('32.1: the primary is played as a strategic action and costs no token on one\'s own card', () => {
    const game = rulesGame({ entries: [primary(CARD.diplomacy, { systemId: HOME })] });
    expect(forecast(game, pack).state.strategy).toBe(2);
  });

  test('32.2: the primary readies two of the player\'s exhausted planets', () => {
    const spend = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1', 'h2'], tradeGoods: 0 } });
    const play = primary(CARD.diplomacy, { systemId: HOME, readied: ['h1', 'h2'] });
    expect(forecast(rulesGame({ entries: [spend, play], game: { docks: ['h1'] } }), pack).state.exhausted).toEqual([]);
  });

  test('32.2: the primary readies at most two planets', () => {
    const play = primary(CARD.diplomacy, { systemId: HOME, readied: ['h1', 'h2', 't1'] });
    const game = rulesGame({ entries: [spendThree(), play], game: { planetControl: { t1: 'me' }, expansions: ['pok'] } });
    expect(codesOf(game, pack, play)).toContain('readyOverLimit');
  });

  test('32.2: the chosen system cannot be the Mecatol Rex system', () => {
    const play = primary(CARD.diplomacy, { systemId: '0,-1' });
    const game = rulesGame({
      map: { ...rulesGame().map, '0,-1': MECATOL_TILE },
      entries: [play],
      game: { planetControl: { [MECATOL_PLANET]: 'me' } },
    });
    expect(codesOf(game, pack, play)).toContain('diplomacySystem');
  });

  test('32.2: the chosen system holds a planet the player controls', () => {
    const play = primary(CARD.diplomacy, { systemId: NEAR });
    expect(codesOf(rulesGame({ entries: [play] }), pack, play)).toContain('diplomacySystem');
  });

  test('32.2: each other player gets a command token in the chosen system', () => {
    const game = rulesGame({ entries: [primary(CARD.diplomacy, { systemId: HOME })], game: { opponents: [RIVAL] } });
    expect(forecast(game, pack).state.rivals?.[RIVAL.id].tokensOnMap).toContain(HOME);
  });

  test('32.2: the tokens other players place come from reinforcements, not from their pools', () => {
    const game = rulesGame({ entries: [primary(CARD.diplomacy, { systemId: HOME })], game: { opponents: [RIVAL] } });
    const rival = forecast(game, pack).state.rivals?.[RIVAL.id];
    expect([rival?.tactic, rival?.fleet, rival?.strategy]).toEqual([3, 3, 2]);
  });

  test.todo('32.2.1: a player with no tokens in reinforcements places one from their command sheet — not modelled: reinforcements of command tokens are not counted');

  test('32.2.2: a player who already has a token in the chosen system places no second one', () => {
    const theirs = tactical(HOME, {}, { owner: RIVAL.id });
    const game = rulesGame({ entries: [theirs, primary(CARD.diplomacy, { systemId: HOME })], game: { opponents: [RIVAL] } });
    expect(forecast(game, pack).state.rivals?.[RIVAL.id].tokensOnMap.filter(id => id === HOME)).toHaveLength(1);
  });

  test('32.3: the secondary costs a strategy token', () => {
    const game = rulesGame({ entries: [secondary(CARD.diplomacy, { readied: [] })] });
    expect(forecast(game, pack).state.strategy).toBe(1);
  });

  test('32.3: the secondary readies at most two planets', () => {
    const spend = tactical(TARGET, { payment: { planets: ['h1', 'h2', 't1'], tradeGoods: 0 } });
    const play = secondary(CARD.diplomacy, { readied: ['h1', 'h2', 't1'] });
    const game = rulesGame({ entries: [spend, play], game: { planetControl: { t1: 'me' } } });
    expect(codesOf(game, pack, play)).toContain('readyOverLimit');
  });

  test('32.3: the secondary readies up to two of the player\'s exhausted planets', () => {
    const play = secondary(CARD.diplomacy, { readied: ['h1', 't1'] });
    const game = rulesGame({ entries: [spendThree(), play], game: { planetControl: { t1: 'me' } } });
    expect(forecast(game, pack).state.exhausted).toEqual(['h2']);
    expect(codesOf(game, pack, play)).toEqual([]);
  });

  test.todo('32 note 1: with no planet or only Mecatol Rex the primary is still played, and no one places a token — not modelled: the primary without a system is not told apart');

  test('32 note 2: with fewer than two exhausted planets the primary readies what there is, without a warning', () => {
    const spend = tactical(HOME, { production: { cruiser: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const play = primary(CARD.diplomacy, { systemId: HOME, readied: ['h1'] });
    const game = rulesGame({ entries: [spend, play], game: { docks: ['h1'] } });
    expect(forecast(game, pack).state.exhausted).toEqual([]);
    expect(codesOf(game, pack, play)).toEqual([]);
  });

  test.todo('32 note 3: the Diplomacy token stands for a token of each other player — not modelled: the token is drawn as the players\' own tokens');
  test.todo('32 note 3.1: using the Diplomacy token changes nothing in the game state — not modelled: there is no separate token');
  test.todo('32 note 3.2: the token gives no player more tokens: each keeps one back in reinforcements — not modelled: reinforcements of command tokens are not counted');
  test.todo('32 note 3.3: effects that remove a token may remove one of those the Diplomacy token stands for — not modelled: there is no separate token');

  test('32 note 3.4: the other players cannot move ships out of the chosen system', () => {
    const theirs = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] }, { owner: RIVAL.id });
    const game = rulesGame({
      entries: [primary(CARD.diplomacy, { systemId: HOME }), theirs],
      game: { opponents: [RIVAL], enemyUnits: { [HOME]: { [RIVAL.id]: { cruiser: 1 } } } },
    });
    expect(codesOf(game, pack, theirs)).toContain('sourceActivated');
  });
});
