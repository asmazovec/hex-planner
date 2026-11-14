import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, LeaderState, TileDef, UnitCounts } from '../../../types';
import type { Entry, EntryBody } from '../../../../testing/old/domain/types';
import { adjust, bench, effect, endOf, expectNone, expectStanding, expectWaived, FAR, FARTHER, HOME, NEAR, quote, tactical, TARGET, warningsOf } from '../kit';
import { id } from './sardakkcommander';

/** The new check of pass 2: a ground force committed from a planet, not from the space area of the active system (49.2). */
const CODE = 'landingFromPlanet' as AnyWarningCode;

type Landing = Extract<EntryBody, { type: 'tactical' }>['landings'][number];
/** A landing on `planetId` of ground forces that come from the planet `from` (the field pass 2 adds to a landing). */
const commit = (from: string, planetId: string, units: UnitCounts): Landing => ({ planetId, units, from } as Landing);

/** The test row with a planet in the system next to the target: 1,0 holds n1 "Near One". */
const NEAR_TILE: TileDef = { id: 'r-near', number: 'r-near', planetIds: ['n1'], kind: 'system', wormholes: [] };
const MAP = { [HOME]: 'r-home', [NEAR]: 'r-near', [TARGET]: 'r-target', [FAR]: 'r-empty', [FARTHER]: 'r-empty' };

/** My ground forces stand on n1, t2 and h1; `before` runs first in the round, then the action into the target. */
const table = (move: Entry, options: { faction?: string; leader?: LeaderState | null; before?: Entry[] } = {}) => {
  const leader = options.leader === undefined ? 'unlocked' : options.leader;
  const ground = adjust({ ground: { n1: { infantry: 2 }, t2: { infantry: 2 }, h1: { infantry: 1 } } });
  return {
    move,
    ...bench({
      faction: options.faction ?? 'sardakk', expansions: ['pok'],
      start: { leaders: leader ? { [id]: leader } : {} },
      entries: [ground, ...(options.before ?? []), move],
      game: { map: MAP },
      edit: pack => {
        pack.tiles['r-near'] = NEAR_TILE;
        pack.planets.n1 = { id: 'n1', name: 'Near One', resources: 1, influence: 1 };
      },
    }),
  };
};

describe('leader:sardakkcommander G\'hom Sek\'kus', () => {
  // "You can commit (move) up to 1 ground force from each planet in the active system and each planet in adjacent
  //  systems that do not contain 1 of your command tokens."
  // Checks: with no ship in the target, one infantry is committed from n1 (the next system) to t1; the warning that it
  // does not come from the space area is listed and lifted by the commander, and the infantry moves from n1 to t1.
  // Why the check is redundant here: LRR 49.2 commits only "ground forces in the space area of the active system",
  // and the commander commits from planets of adjacent systems, without a ship (G'hom Sek'kus ruling 2).
  test('leader:sardakkcommander commits a ground force from a planet of an adjacent system: the warning is waived', () => {
    const sardakk = table(tactical(TARGET, { landings: [commit('n1', 't1', { infantry: 1 })] }));
    const warnings = warningsOf(sardakk, sardakk.move);
    expectWaived(warnings, CODE, id);
    expectNone(warnings, 'landingOverLimit');
    const end = endOf(sardakk);
    expect(end.ground.n1).toEqual({ infantry: 1 });
    expect(end.ground.t1).toEqual({ infantry: 1 });
  });

  // "... from each planet in the active system ..."
  // Checks: one infantry is committed from t2 to t1, both in the active system: waived as well.
  // Why the check is redundant here: the planets of the active system are named by the card besides the adjacent ones.
  test('leader:sardakkcommander commits a ground force from another planet of the active system: the warning is waived', () => {
    const sardakk = table(tactical(TARGET, { landings: [commit('t2', 't1', { infantry: 1 })] }));
    expectWaived(warningsOf(sardakk, sardakk.move), CODE, id);
    expect(endOf(sardakk).ground.t2).toEqual({ infantry: 1 });
  });

  // "... up to 1 ground force from each planet ..."
  // Checks: two infantry from n1 at once stand over the card's limit.
  // Why the check is NOT redundant here: the card moves one ground force per planet (G'hom Sek'kus ruling 4: per
  // Invasion step, whatever the number of planets committed to).
  test('leader:sardakkcommander two ground forces from one planet: the warning stands', () => {
    const sardakk = table(tactical(TARGET, { landings: [commit('n1', 't1', { infantry: 2 })] }));
    expectStanding(warningsOf(sardakk, sardakk.move), CODE);
  });

  // "... adjacent systems that do not contain 1 of your command tokens."
  // Checks: an earlier action this round put my command token in 1,0; committing from n1 then stands.
  // Why the check is NOT redundant here: the card excludes systems with the player's command token (compare 95.3).
  test('leader:sardakkcommander a planet in a system with my command token: the warning stands', () => {
    const sardakk = table(tactical(TARGET, { landings: [commit('n1', 't1', { infantry: 1 })] }), { before: [tactical(NEAR)] });
    expectStanding(warningsOf(sardakk, sardakk.move), CODE);
  });

  // Checks: h1 is two systems from the target, not adjacent: committing from it stands.
  // Why the check is NOT redundant here: only the active system and the systems adjacent to it are named.
  test('leader:sardakkcommander a planet two systems away: the warning stands', () => {
    const sardakk = table(tactical(TARGET, { landings: [commit('h1', 't1', { infantry: 1 })] }));
    expectStanding(warningsOf(sardakk, sardakk.move), CODE);
  });

  // LRR 49.2: "If the active player has ground forces in the space area of the active system, that player may commit
  //  any number of those ground forces to land on any of the planets in that system."
  // Checks: the commander still locked (not in the start's leaders): the same commit stands.
  // Why the check is NOT redundant here: a locked leader is not in force (51.7 via `inForce`).
  test('leader:sardakkcommander locked: the warning stands', () => {
    const sardakk = table(tactical(TARGET, { landings: [commit('n1', 't1', { infantry: 1 })] }), { leader: null });
    expectStanding(warningsOf(sardakk, sardakk.move), CODE);
  });

  // Checks: another faction committing from a planet is warned of; the infantry still moves, as a warning forbids nothing.
  // Why the check is NOT redundant here: nothing of the Federation of Sol speaks of committing from planets.
  test('leader:sardakkcommander another faction committing from a planet: the warning stands, the unit still moves', () => {
    const sol = table(tactical(TARGET, { landings: [commit('n1', 't1', { infantry: 1 })] }), { faction: 'sol', leader: null });
    expectStanding(warningsOf(sol, sol.move), CODE);
    expect(endOf(sol).ground.t1).toEqual({ infantry: 1 });
  });

  // "During the "Commit Ground Forces" step: You can commit (move) up to 1 ground force from each planet ..."
  // Checks: a landing that names no planet of origin takes its ground forces from the space area, as for everyone: an
  // infantry that is not there is short, the commander or not.
  // Why the check is NOT redundant here: the card moves ground forces from planets; it creates none in space.
  test('leader:sardakkcommander a landing from the space area that has no infantry is still short', () => {
    const sardakk = table(tactical(TARGET, { landings: [{ planetId: 't1', units: { infantry: 1 } }] }));
    quote(sardakk.pack, id, 'You can commit (move) up to 1 ground force from each planet in the active system and each planet in adjacent systems');
    expectStanding(warningsOf(sardakk, sardakk.move), 'landingOverLimit');
  });

  test('leader:sardakkcommander is a passive effect that waives committing from planets', () => {
    const { pack } = table(tactical(TARGET));
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).permit?.map(w => w.code)).toEqual([CODE]);
  });
});
