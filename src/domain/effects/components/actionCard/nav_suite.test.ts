import { describe, expect, test } from 'vitest';
import type { Entry, Game, Opponent } from '../../../types';
import { bench, effect, expectStanding, expectWaived, FAR, FARTHER, HOME, NEAR, quote, TARGET, tactical, using, warningsOf } from '../kit';
import { id } from './nav_suite';

const RIVAL: Opponent = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };

/** The test row with `near` in place of the empty system between home and target. */
const row = (near: string, target = 'r-target'): Game['map'] =>
  ({ [HOME]: 'r-home', [NEAR]: near, [TARGET]: target, [FAR]: 'r-empty', [FARTHER]: 'r-empty' });

/** Two cruisers fly from home through the next system into the target. */
const through = () => tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 2 }, via: [NEAR] }] });

const table = (entries: Entry[], map: Game['map'], game: Partial<Game> = {}, hand = [id]) =>
  bench({ faction: 'letnev', expansions: ['pok'], units: { [HOME]: { cruiser: 2 }, [NEAR]: { cruiser: 1 } }, start: { hand }, entries, game: { map, ...game } });

describe('actionCard:nav_suite Nav Suite', () => {
  // "During the 'Movement' step of this tactical action, ignore the effect of anomalies."
  // Note 3 (tirules2, Nav Suite): "A player may move ships through or into an asteroid field without the Antimass
  //  Deflectors technology."
  // Checks: a tactical action that plays the card moves through an asteroid field; the route warning is listed and
  // lifted by the card.
  // Why the check is redundant here: LRR 11.1 closes an asteroid field to movement as an effect of the anomaly, and the
  // card says to ignore the effect of anomalies for this movement.
  test.fails('actionCard:nav_suite played with the action lets ships fly through an asteroid field: routeBlocked is waived', () => {
    const move = using(through(), id);
    const navy = table([move], row('r-asteroid'));
    quote(navy.pack, id, 'ignore the effect of anomalies');
    expectWaived(warningsOf(navy, move), 'routeBlocked', id);
  });

  // Note 5: "A player may move ships through a nebula."
  // Checks: the same through a nebula, which otherwise ends a move.
  // Why the check is redundant here: a nebula stops a route (LRR 59.1) by its anomaly effect, which the card ignores.
  test.fails('actionCard:nav_suite lets ships fly through a nebula: routeBlocked is waived', () => {
    const move = using(through(), id);
    expectWaived(warningsOf(table([move], row('r-nebula')), move), 'routeBlocked', id);
  });

  // Note 6: "A player may move ships through or into a supernova."
  // Checks: a supernova as the active system itself; the move into it is lifted as well.
  // Why the check is redundant here: LRR 86.1 forbids moving into a supernova as its anomaly effect.
  test.fails('actionCard:nav_suite lets ships move into a supernova: routeBlocked is waived', () => {
    const move = using(tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 2 } }] }), id);
    expectWaived(warningsOf(table([move], row('r-supernova')), move), 'routeBlocked', id);
  });

  // Note 5: "Ships moving out of a nebula retain their normal move value."
  // Checks: a cruiser starting in a nebula flies two systems; the speed warning (move value 1 in a nebula) is lifted.
  // Why the check is redundant here: the move value of 1 is the nebula's effect (LRR 59.3), which the card ignores, so
  // the cruiser keeps its move value of 2 and reaches.
  test.fails('actionCard:nav_suite keeps the normal move value out of a nebula: speedShort is waived', () => {
    const move = using(tactical(FAR, { moves: [{ from: NEAR, units: { cruiser: 1 }, via: [TARGET] }] }), id);
    expectWaived(warningsOf(table([move], row('r-nebula')), move), 'speedShort', id);
  });

  // LRR 11.1: "A ship cannot move through or into an asteroid field."
  // Checks: the same flight without the card is warned of and nothing lifts it.
  // Why the check is NOT redundant here: the card is not played with this action (only held in hand).
  test('actionCard:nav_suite held but not played leaves the asteroid field closed', () => {
    const move = through();
    expectStanding(warningsOf(table([move], row('r-asteroid')), move), 'routeBlocked');
  });

  // LRR 58.3.2 (a system with another player's ships ends the move) with note 1: "Wormholes are not anomalies."
  // Checks: a system holding a rival's ship is no anomaly; the card does not open it.
  // Why the check is NOT redundant here: the card speaks of anomalies only; other players' ships still stop a route.
  test('actionCard:nav_suite does not let ships fly through a system with another player\'s ships', () => {
    const move = using(through(), id);
    const navy = table([move], row('r-empty'), { opponents: [RIVAL], enemyUnits: { [NEAR]: { o1: { destroyer: 1 } } } });
    expectStanding(warningsOf(navy, move), 'routeBlocked');
  });

  // "... during the 'Movement' step of this tactical action ..."
  // Checks: the card played with the first action does not lift the asteroid field for the next one.
  // Why the check is NOT redundant here: the card covers its own tactical action only, not the rest of the round.
  test('actionCard:nav_suite played with one action leaves the next action\'s asteroid field closed', () => {
    const first = using(through(), id);
    const second = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 2 }, via: [NEAR] }] });
    const navy = bench({ faction: 'letnev', expansions: ['pok'], units: { [HOME]: { cruiser: 4 } }, start: { hand: [id] }, entries: [first, second], game: { map: row('r-asteroid') } });
    expectStanding(warningsOf(navy, second), 'routeBlocked');
  });

  test.todo('actionCard:nav_suite through a gravity rift the ships get no +1 (note 4): the movement step would have to know the card, and nobody plays it for a shorter move');

  test('actionCard:nav_suite is played after the activation, so its reminder stands at the activation', () => {
    const { pack } = table([], row('r-empty'));
    expect(effect(pack, id).hintAt).toEqual(['activation']);
  });

  test.fails('actionCard:nav_suite waives routeBlocked and speedShort for its own action only', () => {
    const { pack } = table([], row('r-empty'));
    expect(effect(pack, id).waive?.map(w => [w.code, w.lasts])).toEqual([['routeBlocked', undefined], ['speedShort', undefined]]);
  });
});
