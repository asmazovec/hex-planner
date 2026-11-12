import { describe, expect, test } from 'vitest';
import type { Entry, Game } from '../../../types';
import { bench, effect, expectStanding, expectWaived, FAR, FARTHER, HOME, NEAR, quote, tactical, TARGET, using, warningsOf } from '../kit';
import { id } from './silence_space';

/** A cruiser flies from home to the target through NEAR, where another player's destroyer stands. */
const through = () => tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
const blocked: Partial<Game> = { enemyUnits: { [NEAR]: { o1: { destroyer: 1 } } } };
const table = (entries: Entry[], game: Partial<Game> = blocked, hand: string[] = [id], cruisers = 1) =>
  bench({ faction: 'sol', units: { [HOME]: { cruiser: cruisers } }, start: { hand }, entries, game });

describe('actionCard:silence_space In The Silence Of Space', () => {
  // "Choose 1 system. During this tactical action, your ships in the chosen system can move through systems that
  //  contain other players' ships."
  // Checks: the card named in the action's «Used» lifts the warning that the route passes another player's ships;
  // the warning is still listed, marked with the card.
  // Why the check is redundant here: LRR 58.3.2 forbids moving through a system with other players' ships, and the
  // card says the ships of the chosen system can.
  test.fails('actionCard:silence_space played with the action lifts the route blocked by other players\' ships', () => {
    const move = using(through(), id);
    const silent = table([move]);
    quote(silent.pack, id, 'your ships in the chosen system can move through systems that contain other players\' ships');
    expectWaived(warningsOf(silent, move), 'routeBlocked', id);
  });

  // LRR 58.3.2: "A ship cannot move through a system that contains another player's ships."
  // Checks: without the card the same route is warned of.
  // Why the check is NOT redundant here: no card was played.
  test('actionCard:silence_space not played, the route through other players\' ships stands warned', () => {
    const move = through();
    expectStanding(warningsOf(table([move]), move), 'routeBlocked');
  });

  // "... can move through systems that contain other players' ships."
  // Checks: a route through a nebula is still warned of with the card played.
  // Why the check is NOT redundant here: the card speaks of other players' ships only; a nebula ends a move (59.2)
  // whoever is in it.
  test('actionCard:silence_space does not open a route through a nebula', () => {
    const move = using(through(), id);
    const nebula = table([move], { map: { [HOME]: 'r-home', [NEAR]: 'r-nebula', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' } });
    expectStanding(warningsOf(nebula, move), 'routeBlocked');
  });

  // "... During this tactical action ..."
  // Checks: the card played in a first tactical action does not open the route of a second one.
  // Why the check is NOT redundant here: the card lasts for its own tactical action only.
  test('actionCard:silence_space played in an earlier action does not help the next one', () => {
    const first = using(tactical(FAR, { moves: [] }), id);
    const second = through();
    expectStanding(warningsOf(table([first, second]), second), 'routeBlocked');
  });

  // Ruling (In The Silence Of Space 1): "Only the ships in the chosen system may move through systems that contain
  //  other players' ships."
  test.todo('actionCard:silence_space lifts the route of the chosen system only, another source still blocked: a card in `uses` has no choices, so the chosen system cannot be entered yet');

  test.fails('actionCard:silence_space waives the blocked route and nothing else', () => {
    const { pack } = table([]);
    expect(effect(pack, id).waive?.map(w => w.code)).toEqual(['routeBlocked']);
  });
});
