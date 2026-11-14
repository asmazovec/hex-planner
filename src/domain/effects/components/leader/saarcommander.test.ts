import { describe, expect, test } from 'vitest';
import type { LeaderState, UnitCounts } from '../../../types';
import { bench, effect, expectStanding, expectWaived, HOME, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './saarcommander';

/**
 * The Saar produce at their dock on t1 (the target) and place what is built on `planet`: h1 at home holds another
 * dock of theirs, h2 none. With `opponentShips` an opponent's cruiser blockades the home dock.
 */
const produce = (units: UnitCounts, planet: string, leaders: Record<string, LeaderState> = { [id]: 'unlocked' }, faction = 'saar') => {
  const build = tactical(TARGET, { production: units, productionGround: { [planet]: units } });
  return { build, ...bench({
    faction, expansions: ['pok'], units: { [TARGET]: { carrier: 1 }, [HOME]: { cruiser: 1 } }, start: { leaders }, entries: [build],
    game: { docks: ['t1', 'h1'], planetControl: { t1: 'me' } },
  }) };
};

describe('leader:saarcommander Rowl Sarrig', () => {
  // "When you produce fighters or infantry: You may place each of those units at any of your space docks that are not
  //  blockaded."
  // Checks: two infantry produced at the dock of t1 are placed on Home One, at another dock of mine; the placement
  // warning is listed and lifted by the commander.
  // Why the check is redundant here: LRR 68.3 puts produced ground forces on the planet of the producing unit, and the
  // commander lets infantry go to any of my docks not blockaded.
  test('leader:saarcommander places produced infantry at another space dock: the warning is waived', () => {
    const saar = produce({ infantry: 2 }, 'h1');
    quote(saar.pack, id, 'You may place each of those units at any of your space docks that are not blockaded.');
    expectWaived(warningsOf(saar, saar.build), 'productionPlace', id);
  });

  // "When you produce fighters or infantry ..."
  // Checks: a mech produced at t1 and placed on Home One is still warned of.
  // Why the check is NOT redundant here: the commander moves fighters and infantry only.
  test('leader:saarcommander does not move a mech: its placement at another dock stands', () => {
    const saar = produce({ mech: 1 }, 'h1');
    expectStanding(warningsOf(saar, saar.build), 'productionPlace');
  });

  // Saar, Floating Factory 2: "When a Floating Factory produces ground forces, they may be placed in the space area or on a planet they control in that system."
  // Checks: infantry produced at the dock of t1 and placed on t2, the other planet of that system, are not warned of at all.
  // Why the check is redundant here: every Saar space dock is a Floating Factory, so the placement is no breach, with or without the commander.
  test('leader:saarcommander the other planet of the producing system is no breach for the Saar', () => {
    const saar = produce({ infantry: 2 }, 't2', {});
    expect(warningsOf(saar, saar.build).some(w => w.code === 'productionPlace')).toBe(false);
  });

  // LRR 68.3: produced ground forces are placed on the planet of the producing unit.
  // Checks: the commander not unlocked, the same placement is warned of.
  // Why the check is NOT redundant here: a locked commander's ability is not in force (LRR 51.10).
  test('leader:saarcommander locked, the infantry placed at another dock are warned of', () => {
    const saar = produce({ infantry: 2 }, 'h1', {});
    expectStanding(warningsOf(saar, saar.build), 'productionPlace');
  });

  // Checks: the dock stands on h1 and the infantry are placed on h2, the other planet of the same system (the Saar home
  // system holds the dock on one planet and the infantry go to the other); the warning is lifted by the commander.
  // Why the check is redundant here: the commander lets the infantry go to a space dock of mine, and that dock is in the system.
  test('leader:saarcommander infantry placed on another planet of a system with a dock of mine: the warning is waived', () => {
    const saar = produce({ infantry: 1 }, 'h2');
    quote(saar.pack, id, 'You may place each of those units at any of your space docks that are not blockaded.');
    expectWaived(warningsOf(saar, saar.build), 'productionPlace', id);
  });

  test.todo('leader:saarcommander fighters placed in the space area of another dock: the entry has no field for produced ships placed outside the active system');
  test.todo('leader:saarcommander a blockaded dock is not a place for them: the waiver must ask whether another player\'s ships stand in the dock\'s system');

  test('leader:saarcommander is a passive effect that waives the placement of produced units', () => {
    const { pack } = produce({ infantry: 1 }, 'h1');
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).permit?.map(w => w.code)).toEqual(['productionPlace']);
  });
});
