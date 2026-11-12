import { describe, expect, test } from 'vitest';
import type { Game, Opponent, UnitCounts } from '../../../types';
import { bench, effect, expectNone, expectStanding, expectWaived, HOME, NEAR, quote, TARGET, tactical, warningsOf } from '../kit';
import { id } from './mentakbt';

const CRUISER_II = 'technology:cr2';
const RIVAL: Opponent = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };

/** Ships of the rival in the system on the way (NEAR) and, with `defended`, a non-fighter ship in the active system. */
const enemies = (defended: UnitCounts | null): Partial<Game> => ({
  opponents: [RIVAL],
  enemyUnits: { [NEAR]: { o1: { destroyer: 1 } }, ...(defended ? { [TARGET]: { o1: defended } } : {}) },
});

/** The Mentak fly `units` from home through NEAR into the target. */
const raid = (units: UnitCounts, options: { technologies?: string[]; breakthrough?: boolean; defended?: UnitCounts | null } = {}) => {
  const move = tactical(TARGET, { moves: [{ from: HOME, units, via: [NEAR] }] });
  const table = bench({
    faction: 'mentak', expansions: ['te'], units: { [HOME]: units }, entries: [move],
    start: { technologies: options.technologies ?? [CRUISER_II], ...(options.breakthrough === false ? {} : { breakthrough: 'held' as const }) },
    game: enemies(options.defended === undefined ? { cruiser: 1 } : options.defended),
  });
  return { move, ...table };
};

describe('breakthrough:mentakbt The Table\'s Grace', () => {
  // "If the active system contains another player's non-fighter ships, this unit can move through systems that
  //  contain other players' ships."
  // Checks: a Corsair (the breakthrough with Cruiser II) passes a system with an enemy destroyer on its way to an
  // active system with an enemy cruiser; the warning that the route is blocked is listed and lifted.
  // Why the check is redundant here: LRR 58.3.2 says "The ship cannot move through a system that contains ships that
  // are controlled by another player", and the Corsair's ability says it can while the active system is defended.
  test('breakthrough:mentakbt a Corsair moves through enemy ships into a defended system: routeBlocked is waived', () => {
    const table = raid({ cruiser: 1 });
    quote(table.pack, id, "this unit can move through systems that contain other players' ships");
    expectWaived(warningsOf(table, table.move), 'routeBlocked', id);
  });

  // Faction note 1: "the Mentak player may move a Corsair through systems containing any other player's ships, not
  //  just those of the player in the active system."
  // Checks: the condition is about the active system, not about whose ships stand on the way.
  // Why the check is redundant here: the text names other players' ships in general.
  test('breakthrough:mentakbt the ships on the way need not be those of the defender', () => {
    const move = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
    const table = bench({
      faction: 'mentak', expansions: ['te'], units: { [HOME]: { cruiser: 1 } }, entries: [move],
      start: { technologies: [CRUISER_II], breakthrough: 'held' },
      game: {
        opponents: [RIVAL, { id: 'o2', faction: 'hacan', vp: 0, seat: 3, color: 3 }],
        enemyUnits: { [NEAR]: { o2: { destroyer: 1 } }, [TARGET]: { o1: { carrier: 1 } } },
      },
    });
    expectWaived(warningsOf(table, move), 'routeBlocked', id);
  });

  // "If the active system contains another player's non-fighter ships ..."
  // Checks: with no enemy ship in the active system the route through the enemy destroyer stays blocked.
  // Why the check is NOT redundant here: the Corsair's condition does not hold.
  test('breakthrough:mentakbt into an undefended system the route stays blocked', () => {
    const table = raid({ cruiser: 1 }, { defended: null });
    expectStanding(warningsOf(table, table.move), 'routeBlocked');
  });

  // "... another player's non-fighter ships ..."
  // Checks: fighters alone in the active system do not open the route.
  // Why the check is NOT redundant here: the text excludes fighters.
  test('breakthrough:mentakbt fighters alone in the active system do not open the route', () => {
    const table = raid({ cruiser: 1 }, { defended: { fighter: 2 } });
    expectStanding(warningsOf(table, table.move), 'routeBlocked');
  });

  // "... this unit can move through ..."
  // Checks: a destroyer flying with the same move is not a Corsair; its route stays blocked.
  // Why the check is NOT redundant here: the ability is the Corsair's alone.
  test('breakthrough:mentakbt a destroyer is no Corsair: its route stays blocked', () => {
    const table = raid({ destroyer: 1 });
    expectStanding(warningsOf(table, table.move), 'routeBlocked');
  });

  // "If you have the Cruiser II unit upgrade technology, flip this card and place it on top of cruiser II."
  // Checks: the breakthrough without Cruiser II is not flipped: the cruiser stays a cruiser and its route is blocked.
  // Why the check is NOT redundant here: there is no Corsair until Cruiser II is owned.
  test('breakthrough:mentakbt without Cruiser II there is no Corsair', () => {
    const table = raid({ cruiser: 1 }, { technologies: [] });
    expectStanding(warningsOf(table, table.move), 'routeBlocked');
  });

  // LRR 58.3.2: "The ship cannot move through a system that contains ships that are controlled by another player."
  // Checks: Cruiser II without the breakthrough is blocked.
  // Why the check is NOT redundant here: the Corsair is printed on the breakthrough, which is not held.
  test('breakthrough:mentakbt Cruiser II without the breakthrough is blocked', () => {
    const table = raid({ cruiser: 1 }, { breakthrough: false });
    expectStanding(warningsOf(table, table.move), 'routeBlocked');
  });

  // "Corsair [Cost 2, Combat 6, Move 3, Capacity 2]"
  // Checks: a Corsair carries two infantry; Cruiser II carries one.
  // Why the check is redundant here: the capacity check (16.1) counts against the Corsair's capacity of 2; the number
  // changes, nothing is waived.
  test('breakthrough:mentakbt a Corsair has capacity 2', () => {
    const corsair = tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1, infantry: 2 } }] });
    const table = bench({ faction: 'mentak', expansions: ['te'], units: { [HOME]: { cruiser: 1, infantry: 2 } }, entries: [corsair], start: { technologies: [CRUISER_II], breakthrough: 'held' } });
    expectNone(warningsOf(table, corsair), 'capacityGroup');
  });

  // Checks: Cruiser II alone has capacity 1, so the same load is over.
  // Why the check is NOT redundant here: without the breakthrough the card on top is Cruiser II.
  test('breakthrough:mentakbt Cruiser II alone carries one infantry, not two', () => {
    const move = tactical(NEAR, { moves: [{ from: HOME, units: { cruiser: 1, infantry: 2 } }] });
    const table = bench({ faction: 'mentak', expansions: ['te'], units: { [HOME]: { cruiser: 1, infantry: 2 } }, entries: [move], start: { technologies: [CRUISER_II] } });
    expectStanding(warningsOf(table, move), 'capacityGroup');
  });

  test('breakthrough:mentakbt is a passive effect that changes the cruiser and waives the blocked route', () => {
    const { pack } = raid({ cruiser: 1 });
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).modify?.capacity).toBeDefined();
    expect(effect(pack, id).waive?.map(w => w.code)).toEqual(['routeBlocked']);
  });
});
