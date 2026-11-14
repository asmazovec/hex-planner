import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../../testing/old/domain/types';
import type { GameState } from '../../../../testing/old/domain/types';
import { bench, effect, endOf, expectStanding, HOME, NEAR, quote, tactical, using, warningsOf } from '../kit';
import { id } from './sar';

/** Two infantry built at the dock on h1, paid with h2. */
const production = () => tactical(HOME, { production: { infantry: 2 }, payment: { planets: ['h2'], tradeGoods: 0 } });
const table = (entries: Entry[], technologies: string[] = [id]) =>
  bench({ faction: 'hacan', expansions: ['pok'], start: { technologies }, entries, game: { docks: ['h1'] } });

const mechsOn = (state: GameState, planets: string[]): number => planets.reduce((sum, p) => sum + (state.ground[p]?.mech ?? 0), 0);

describe('technology:sar Self-Assembly Routines', () => {
  // "After 1 or more of your units use PRODUCTION, you may exhaust this card to place 1 mech from your reinforcements
  //  on a planet you control in that system."
  // Checks: the tactical action produces at home and names the card in «Used»: at its end one mech stands on a planet
  // of the home system, besides the two infantry built.
  // Why the default does not apply: a mech is otherwise only produced and paid for (67, 68); the card places one
  // without cost or Production.
  test('technology:sar used after a production places one mech on a planet I control in that system', () => {
    const entry = using(production(), id);
    const bench = table([entry]);
    quote(bench.pack, id, 'place 1 mech from your reinforcements on a planet you control in that system');
    const end = endOf(bench);
    expect(mechsOn(end, ['h1', 'h2'])).toBe(1);
    expect(end.systems[HOME]?.mech ?? 0).toBe(0);
  });

  // Checks: the same production without the card named places no mech.
  // Why nothing is placed here: the card is used by exhausting it, and it was not used.
  test('technology:sar not used, the production places no mech', () => {
    const bench = table([production()]);
    expect(mechsOn(endOf(bench), ['h1', 'h2'])).toBe(0);
  });

  // "After 1 or more of your units use PRODUCTION"
  // Checks: named in an action that produces nothing, the card places no mech.
  // Why nothing is placed here: the card's moment is after a production, and there was none.
  test('technology:sar used without a production places nothing', () => {
    const entry = using(tactical(NEAR, {}), id);
    expect(mechsOn(endOf(table([entry])), ['h1', 'h2'])).toBe(0);
  });

  // "you may exhaust this card": LRR 34.2, an exhausted card cannot be used until it is readied.
  // Checks: named in two productions of one round, the second use is warned of as exhausted.
  test('technology:sar is exhausted by its use: a second use in the round is warned of', () => {
    const first = using(production(), id);
    const second = using(tactical(HOME, { production: { infantry: 1 } }), id);
    expectStanding(warningsOf(table([first, second]), second), 'componentExhausted');
  });

  // "After 1 of your mechs is destroyed, gain 1 trade good."
  test.todo('technology:sar a trade good for each mech lost (`losses`, `groundLosses`): it is passive while the placing is played, and one effect has one tier');

  test('technology:sar is a play effect', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeTypeOf('function');
  });
});
