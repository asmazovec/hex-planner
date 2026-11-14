import { describe, expect, test } from 'vitest';
import type { Entry, UnitCounts } from '../../../types';
import { bench, effect, expectStanding, expectWaived, HOME, quote, tactical, using, warningsOf } from '../kit';
import { id } from './htp';

/** The home dock on h1 produces; h2 is 1 resource and 2 influence, t2 1 and 3. */
const produce = (production: UnitCounts, planets: string[]) => tactical(HOME, { production, payment: { planets, tradeGoods: 0 } });
const table = (faction: string, entries: Entry[]) =>
  bench({ faction, start: { technologies: [id] }, entries, game: { docks: ['h1'], planetControl: { t2: 'me' } } });

describe('technology:htp Hegemonic Trade Policy', () => {
  // "Exhaust this card when 1 or more of your units use PRODUCTION; swap the resource and influence values of 1 planet
  //  you control during that use of Production."
  // Checks: a cruiser (cost 2) is paid with h2 alone (1 resource, 2 influence) and the technology named in «Used»;
  // the warning that 1 resource falls short is listed and lifted by the technology.
  // Why the check is redundant here: with h2's values swapped it gives 2 resources, the whole cost.
  test('technology:htp swaps a paying planet\'s values: the shortfall it covers is waived', () => {
    const build = using(produce({ cruiser: 1 }, ['h2']), id);
    const winnu = table('winnu', [build]);
    quote(winnu.pack, id, 'swap the resource and influence values of 1 planet you control during that use of Production');
    expectWaived(warningsOf(winnu, build), 'shortResources', id);
  });

  // Checks: the same payment without the technology falls short.
  // Why the check is NOT redundant here: the card is exhausted to be used; held, it swaps nothing.
  test('technology:htp not used, the shortfall stands', () => {
    const build = produce({ cruiser: 1 }, ['h2']);
    expectStanding(warningsOf(table('winnu', [build]), build), 'shortResources');
  });

  // "... of 1 planet ..."
  // Checks: h2 and t2 pay 2 resources for a cost of 5; swapping the better one (t2) gives 4, still short.
  // Why the check is NOT redundant here: only one planet is swapped.
  test('technology:htp swaps one planet only: a shortfall that needs two stands', () => {
    const build = using(produce({ cruiser: 2, infantry: 2 }, ['h2', 't2']), id);
    expectStanding(warningsOf(table('winnu', [build]), build), 'shortResources');
  });

  // "Exhaust this card ..." LRR 34.1.
  // Checks: a second production in the round finds the card exhausted, and its shortfall stands.
  test('technology:htp is exhausted by its use: a second use in the round is warned of', () => {
    const again = using(produce({ cruiser: 1 }, []), id);
    const warnings = warningsOf(table('winnu', [using(produce({ infantry: 2 }, []), id), again]), again);
    expectStanding(warnings, 'componentExhausted');
    expectStanding(warnings, 'shortResources');
  });

  test('technology:htp is a play effect that waives the shortfall a swapped planet covers', () => {
    const { pack } = table('winnu', []);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).permit?.map(w => w.code)).toEqual(['shortResources']);
  });
});
