import { describe, expect, test } from 'vitest';
import type { Entry, Game } from '../../../types';
import { bench, effect, endOf, NEAR, quote, tactical, TARGET } from '../kit';
import { id } from './scavenge';

/** A carrier next to the target lands infantry on the planets of `landings`. */
const invade = (faction: string, planets: string[], game: Partial<Game> = {}) => {
  const move: Entry = tactical(TARGET, {
    moves: [{ from: NEAR, units: { carrier: 1, infantry: planets.length } }],
    landings: planets.map(planetId => ({ planetId, units: { infantry: 1 } })),
  });
  return bench({ faction, units: { [NEAR]: { carrier: 1, infantry: planets.length } }, entries: [move], game });
};

describe('ability:scavenge Scavenge', () => {
  // "After you gain control of a planet: Gain 1 trade good."
  // Checks: the Saar land on t1 and gain control of it; they end the plan with 1 trade good.
  // Why it is counted here: the plan keeps the trade goods, and the ability adds one whenever control is gained; no
  // check is lifted, the count itself changes.
  test.fails('ability:scavenge gaining control of a planet brings 1 trade good', () => {
    const table = invade('saar', ['t1']);
    quote(table.pack, id, 'After you gain control of a planet: Gain 1 trade good.');
    expect(endOf(table).control.t1).toBe('me');
    expect(endOf(table).tradeGoods).toBe(1);
  });

  // Saar, Scavenge note 1: "If the Saar player gains control of multiple planets during one invasion, the trade goods
  //  are gained one at a time."
  // Checks: two planets taken in one invasion bring two trade goods.
  test.fails('ability:scavenge two planets gained in one invasion bring 2 trade goods', () => {
    expect(endOf(invade('saar', ['t1', 't2'])).tradeGoods).toBe(2);
  });

  // "After you gain control of a planet ..."
  // Checks: landing on a planet the Saar already control gains no control, so no trade good.
  // Why nothing is gained here: the trigger is gaining control, which does not happen on a planet already theirs.
  test('ability:scavenge landing on a planet already controlled brings nothing', () => {
    expect(endOf(invade('saar', ['t1'], { planetControl: { t1: 'me' } })).tradeGoods).toBe(0);
  });

  // LRR 25: gaining control of a planet brings no trade good by itself.
  // Checks: another faction taking the same planet ends with no trade good.
  // Why nothing is gained here: the ability is printed on the Saar faction sheet only.
  test('ability:scavenge is the Saar\'s own: another faction gains nothing with a planet', () => {
    const table = invade('sol', ['t1']);
    expect(endOf(table).control.t1).toBe('me');
    expect(endOf(table).tradeGoods).toBe(0);
  });

  test.fails('ability:scavenge is a passive effect of the faction sheet', () => {
    const { pack } = invade('saar', ['t1']);
    expect(effect(pack, id).tier).toBe('passive');
  });
});
