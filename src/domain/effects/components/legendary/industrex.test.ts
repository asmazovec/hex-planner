import { describe, expect, test } from 'vitest';
import { tech } from '../../../rules/kit';
import type { ExtensionCode } from '../../../types';
import type { Entry, EntryBody } from '../../../../testing/old/domain/types';
import { bench, effect, endOf, expectNone, expectStanding, FAR, HOME, NEAR, planned, quote, tactical, using, warningsOf } from '../kit';
import { id } from './industrex';

/** The warning that a component's own condition is not met (src/domain/rules/codes/componentCondition.ts in pass 2). */
const CONDITION = 'componentCondition' as ExtensionCode;
const CRUISER_II = tech('cruiser');

/**
 * `entry` exhausts Aeurex Mechanica to place one `unit` in `system`. The choices are written as the entry's `choices`;
 * pass 2 decides where the choices of a used component live and changes only this helper.
 */
const placing = (entry: Entry, unit: string, system: string): Entry => ({ ...using(entry, id), choices: { unit, system } }) as Entry;
const pass = (): Entry => planned({ type: 'pass' } as EntryBody);

const table = (entry: Entry, { technologies = [CRUISER_II], control = true } = {}) =>
  bench({ faction: 'letnev', expansions: ['te'], units: { [HOME]: { cruiser: 1 } }, start: { technologies }, entries: [entry], game: { planetControl: control ? { industrex: 'me' } : {} } });

describe('legendary:industrex Aeurex Mechanica', () => {
  // "You may exhaust this card when you pass to place 1 ship that matches a unit upgrade technology you own from your
  //  reinforcements into a system that contains your ships."
  // Checks: with Cruiser II owned, the pass places one cruiser from reinforcements in the home system, beside my cruiser.
  // Why no check is lifted: ships come onto the board by production (67) in the plan; the card is a placement of its
  // own, done by its play, and its conditions are checked by it.
  test('legendary:industrex when passing places a ship of an owned unit upgrade in a system with my ships', () => {
    const entry = placing(pass(), 'cruiser', HOME);
    const game = table(entry);
    quote(game.pack, id, 'when you pass to place 1 ship that matches a unit upgrade technology you own');
    expect(endOf(game).systems[HOME]?.cruiser).toBe(2);
    expectNone(warningsOf(game, entry), CONDITION);
  });

  // Checks: the pass without the card places nothing.
  test('legendary:industrex not used: the pass places no ship', () => {
    expect(endOf(table(pass())).systems[HOME]?.cruiser).toBe(1);
  });

  // "... 1 ship that matches a unit upgrade technology you own ..."
  // Checks: without Cruiser II the cruiser is warned of, and placed all the same, as the plan forbids nothing.
  // Why the check is NOT redundant here: the card places only a ship whose unit upgrade the player owns.
  test('legendary:industrex a ship without its unit upgrade owned is warned of', () => {
    const entry = placing(pass(), 'cruiser', HOME);
    const game = table(entry, { technologies: [] });
    expectStanding(warningsOf(game, entry), CONDITION);
    expect(endOf(game).systems[HOME]?.cruiser).toBe(2);
  });

  // "... into a system that contains your ships."
  // Checks: a system where I have no ship is warned of.
  // Why the check is NOT redundant here: the card names only systems with the player's ships.
  test('legendary:industrex a system without my ships is warned of', () => {
    const entry = placing(pass(), 'cruiser', FAR);
    expectStanding(warningsOf(table(entry), entry), CONDITION);
  });

  // "... when you pass ..."
  // Checks: named on a tactical action, not a pass, it is warned of.
  // Why the check is NOT redundant here: the card's moment is the pass alone.
  test('legendary:industrex used on another action than the pass is warned of', () => {
    const entry = placing(tactical(NEAR), 'cruiser', HOME);
    expectStanding(warningsOf(table(entry), entry), CONDITION);
  });

  // LRR 53.3 with 53.2: the card is in the play area of the player who controls Industrex.
  test('legendary:industrex used without controlling Industrex is warned of as not held', () => {
    const entry = placing(pass(), 'cruiser', HOME);
    expectStanding(warningsOf(table(entry, { control: false }), entry), 'componentNotHeld');
  });

  // "... from your reinforcements ..."; the unit limit of the production check (`reinforcementsOut`, LRR 96.3), and
  //  Reinforcements note 1: with none left the player may take one from a system without their command token instead.
  // Checks: all eight cruisers are on the board already; a ninth on the board is warned of as beyond the reinforcements.
  // Why the check is NOT redundant here: the card places from reinforcements, it does not add to the pieces of the game.
  test('legendary:industrex a ship with none left in reinforcements is warned of', () => {
    const entry = placing(pass(), 'cruiser', HOME);
    const game = bench({ faction: 'letnev', expansions: ['te'], units: { [HOME]: { cruiser: 8 } }, start: { technologies: [CRUISER_II] }, entries: [entry], game: { planetControl: { industrex: 'me' } } });
    expectStanding(warningsOf(game, entry), 'reinforcementsOut');
  });

  test('legendary:industrex is a play effect', () => {
    const { pack } = table(pass());
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeTypeOf('function');
  });
});
