import { describe, expect, test } from 'vitest';
import type { Entry, UnitCounts } from '../../../types';
import { bench, effect, expectNone, expectStanding, expectWaived, FAR, FARTHER, HOME, NEAR, NO_PAYMENT, quote, TARGET, tactical, warningsOf } from '../kit';
import { id } from './mr';

const NOVA = { [HOME]: 'r-home', [NEAR]: 'r-supernova', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };
const table = (faction: string, move: Entry, technologies: string[] = [id]) =>
  ({ move, ...bench({ faction, units: { [HOME]: { cruiser: 1 } }, entries: [move], start: { technologies }, game: { map: NOVA } }) });
/** A cruiser flies into the supernova and, maybe, produces there. */
const into = (production: UnitCounts = {}) => tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1 } }], production, payment: NO_PAYMENT });

describe('technology:mr Magmus Reactor', () => {
  // "Your ships can move into supernovas."
  // Checks: with the technology a cruiser ends its move in a supernova; the route warning is listed and lifted by it.
  // Why the check is redundant here: LRR 86.1 forbids moving into a supernova, and the card allows exactly that.
  test('technology:mr lets a ship move into a supernova: the route warning is waived', () => {
    const muaat = table('muaat', into());
    quote(muaat.pack, id, 'Your ships can move into supernovas.');
    expectWaived(warningsOf(muaat, muaat.move), 'routeBlocked', id);
  });

  // LRR 86.1: "A ship cannot move through or into a supernova."
  // Checks: without the technology the same move stands.
  // Why the check is NOT redundant here: the technology is not held.
  test('technology:mr not held, the move into a supernova stands', () => {
    const muaat = table('muaat', into(), []);
    expectStanding(warningsOf(muaat, muaat.move), 'routeBlocked');
  });

  // Checks: a route through a supernova to the target stays warned of for a faction without Gashlai Physiology.
  // Why the check is NOT redundant here: the card says "into"; "through" is not in its text.
  test('technology:mr does not let a ship of another faction pass through a supernova', () => {
    const move = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
    const sol = table('sol', move);
    expectStanding(warningsOf(sol, move), 'routeBlocked');
  });

  // "Each supernova that contains 1 or more of your units gains the PRODUCTION 5 ability as if it were 1 of your units."
  // Checks: the cruiser in the supernova makes the system produce two fighters with no space dock: no warning that
  // nothing produces there and none that the production is over its limit.
  // Why the check is redundant here: production needs a unit with PRODUCTION in the system (67.1); the supernova
  // itself becomes one, with PRODUCTION 5.
  test('technology:mr a supernova with my units produces with PRODUCTION 5', () => {
    const muaat = table('muaat', into({ fighter: 2 }));
    quote(muaat.pack, id, 'gains the PRODUCTION 5 ability as if it were 1 of your units');
    const warnings = warningsOf(muaat, muaat.move);
    expectNone(warnings, 'noProduction');
    expectNone(warnings, 'productionOver');
  });

  // Checks: six fighters are beyond the PRODUCTION 5 of the supernova.
  // Why the check is NOT redundant here: the card gives a production value of 5, not an unlimited one.
  test('technology:mr the supernova\'s production is limited to five units', () => {
    const muaat = table('muaat', into({ fighter: 6 }));
    const warnings = warningsOf(muaat, muaat.move);
    expectNone(warnings, 'noProduction');
    expectStanding(warnings, 'productionOver');
  });

  // Checks: without the technology nothing produces in the supernova.
  test('technology:mr not held, nothing produces in a supernova', () => {
    const muaat = table('muaat', into({ fighter: 2 }), []);
    expectStanding(warningsOf(muaat, muaat.move), 'noProduction');
  });

  test('technology:mr is a passive effect that waives the route check', () => {
    const { pack } = table('muaat', into());
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).waive?.map(w => w.code)).toContain('routeBlocked');
  });
});
