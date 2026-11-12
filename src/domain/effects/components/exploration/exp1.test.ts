import { describe, expect, test } from 'vitest';
import { CARD } from '../../../replay/cards/ids';
import { tech } from '../../../rules/kit';
import type { AnyWarningCode, Entry, EntryBody, UnitCounts } from '../../../types';
import { bench, effect, endOf, expectNone, expectStanding, NEAR, planned, quote, secondary, TARGET, tactical, warningsOf, type Bench } from '../kit';
import { id } from './exp1';

/** The code pass 2 adds: the card's condition is not met (no mech on the planet and no infantry to remove). */
const CONDITION = 'explorationCondition' as AnyWarningCode;
/** A carrier from the next system lands `units` on Target One and gains it; the card explored is in its gains. */
const landing = (units: UnitCounts, gains: string[] = []) => tactical(TARGET, {
  moves: [{ from: NEAR, units: { carrier: 1, infantry: 2, mech: 1 } }], landings: [{ planetId: 't1', units }],
}, gains.length > 0 ? { gains } : {});
/** Later in the round: the secondary of Technology paid with Target One (2) and Home One (3). */
const research = () => secondary(CARD.technology, { researched: [tech('cruiser')], payment: { planets: ['t1', 'h1'], tradeGoods: 0 } });
const table = (entries: Entry[]): Bench => bench({ faction: 'letnev', expansions: ['pok'], units: { [NEAR]: { carrier: 1, infantry: 2, mech: 1 } }, entries });
const gained = (t: Bench) => (endOf(t).exhausted.includes('t1') ? 0 : 1);

describe('exploration:exp1 Expedition', () => {
  // "If you have at least 1 mech on this planet, or if you remove 1 infantry from this planet, ready this planet."
  // Checks: a mech lands on Target One with an infantry; the planet gained is ready after the action, and no infantry is removed.
  // Why the check is redundant here: nothing is lifted; a planet gained is exhausted (49.5.2) and the card readies it.
  test('exploration:exp1 with a mech on the planet: the planet gained is ready after the action', () => {
    const entry = landing({ mech: 1, infantry: 1 }, [id]);
    const explored = table([entry]);
    quote(explored.pack, id, 'If you have at least 1 mech on this planet, or if you remove 1 infantry from this planet, ready this planet.');
    expect(gained(explored)).toBe(gained(table([landing({ mech: 1, infantry: 1 })])) + 1);
    expect(endOf(explored).ground.t1).toEqual({ mech: 1, infantry: 1 });
  });

  // "... or if you remove 1 infantry from this planet ..."
  // Checks: two infantry land without a mech; one of them is removed and the planet gained is ready after the action.
  // Why the check is redundant here: the removal is the price the text names, so the plan makes it.
  test('exploration:exp1 without a mech one infantry is removed from the planet', () => {
    const entry = landing({ infantry: 2 }, [id]);
    const explored = table([entry]);
    expect(gained(explored)).toBe(gained(table([landing({ infantry: 2 })])) + 1);
    expect(endOf(explored).ground.t1).toEqual({ infantry: 1 });
  });

  // "If you have at least 1 mech on this planet, or if you remove 1 infantry from this planet"
  // Checks: the card named by an entry that has no ground force on a planet is warned of.
  // Why the check is NOT redundant here: neither condition of the text is met.
  test('exploration:exp1 with no mech and no infantry on the planet is warned of', () => {
    const entry = planned({ type: 'component', note: '' } as EntryBody, 'action', { gains: [id] });
    expectStanding(warningsOf(table([entry]), entry), CONDITION);
  });

  // Checks: the same landing without the card changes nothing.
  // Why nothing is validated here: no card was explored.
  test('exploration:exp1 not explored, the landing keeps its ground forces', () => {
    expect(endOf(table([landing({ infantry: 2 })])).ground.t1).toEqual({ infantry: 2 });
  });

  // "If you have at least 1 mech on this planet, or if you remove 1 infantry from this planet, ready this planet." LRR 49.5.2: a planet gained enters exhausted.
  // Checks: Target One gained this action pays a research later in the same round.
  // Why the check is redundant here: the planetExhausted check asks whether the planet is ready, and the card readied
  // it; nothing is lifted.
  test('exploration:exp1 a planet readied by the card pays later in the round', () => {
    const pay = research();
    const ready = table([landing({ mech: 1 }, [id]), pay]);
    expectNone(warningsOf(ready, pay), 'planetExhausted');
  });

  // Checks: without the card the planet gained is still exhausted when it pays.
  // Why the check is NOT redundant here: nothing readies Target One.
  test('exploration:exp1 not explored, the planet gained is exhausted when it pays', () => {
    const pay = research();
    const plain = table([landing({ mech: 1 }), pay]);
    expectStanding(warningsOf(plain, pay), 'planetExhausted');
  });

  test('exploration:exp1 is a played effect', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
