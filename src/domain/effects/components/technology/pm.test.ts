import { describe, expect, test } from 'vitest';
import type { Entry, Opponent } from '../../../types';
import { adjust, bench, componentAction, effect, endOf, expectStanding, FAR, quote, warningsOf } from '../kit';
import { id } from './pm';

const RIVAL: Opponent = { id: 'o1', faction: 'letnev', vp: 0, seat: 2, color: 2 };
const biomes = () => componentAction(id, { choices: { player: 'o1' } });
const table = (entries: Entry[]) =>
  bench({ faction: 'hacan', start: { technologies: [id] }, entries, game: { opponents: [RIVAL], enemyUnits: { [FAR]: { o1: { carrier: 1 } } } } });

describe('technology:pm Production Biomes', () => {
  // "ACTION: Exhaust this card and spend 1 token from your strategy pool to gain 4 trade goods and choose 1 other
  //  player; that player gains 2 trade goods."
  // Checks: the component action spends a strategy token, gives the Hacan 4 trade goods and the rival 2.
  // Why the check is redundant here: trade goods otherwise come from Trade's primary (92.3); the card makes them.
  test.fails('technology:pm gains 4 trade goods for a strategy token, and the chosen player gains 2', () => {
    const hacan = table([biomes()]);
    quote(hacan.pack, id, 'spend 1 token from your strategy pool to gain 4 trade goods');
    const end = endOf(hacan);
    expect(end.strategy).toBe(1);
    expect(end.tradeGoods).toBe(4);
    expect(end.rivals?.o1.tradeGoods).toBe(2);
  });

  // Checks: with an empty strategy pool the play is warned of.
  // Why the check is NOT redundant here: the token is the card's price.
  test.fails('technology:pm with an empty strategy pool is warned of', () => {
    const play = biomes();
    expectStanding(warningsOf(table([adjust({ strategy: -2 }), play]), play), 'shortStrategy');
  });

  // "Exhaust this card ..."
  // Checks: played twice in a round, the second play is warned of.
  // Why the check is NOT redundant here: an exhausted technology is readied only in the status phase (34.2).
  test('technology:pm played twice in a round is warned of the second time', () => {
    const again = biomes();
    expectStanding(warningsOf(table([biomes(), again]), again), 'componentExhausted');
  });

  test.fails('technology:pm is a play effect', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
