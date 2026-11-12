import { describe, expect, test } from 'vitest';
import type { Game, StartHoldings } from '../../../types';
import { bench, effect, endOf, NEAR, quote, TARGET, tactical } from '../kit';
import { id } from './l1z1xbt';

/** A carrier with one infantry flies from NEAR into the target and lands it on Target Two (influence 3). */
const invade = (faction: string, start: StartHoldings = { breakthrough: 'held' }, game: Partial<Game> = {}) => {
  const move = tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 't2', units: { infantry: 1 } }] });
  return { move, ...bench({ faction, expansions: ['te'], units: { [NEAR]: { carrier: 1, infantry: 1 } }, start, entries: [move], game }) };
};

describe('breakthrough:l1z1xbt Fealty Uplink', () => {
  // "When you gain control of a planet, place infantry from your reinforcements equal to that planet's influence value
  //  on that planet."
  // Checks: the L1Z1X take Target Two (influence 3) with one infantry; three more are placed on it.
  // Why nothing is waived: the breakthrough adds units to the board; no check of the rules forbids it, the replay
  // must place them (faction note 2: the placement is mandatory).
  test.fails('breakthrough:l1z1xbt places infantry equal to the influence of a planet gained', () => {
    const table = invade('l1z1x');
    quote(table.pack, id, "place infantry from your reinforcements equal to that planet's influence value on that planet");
    expect(endOf(table).ground.t2).toEqual({ infantry: 4 });
  });

  // LRR 25.5 / 49.5: the planet is gained by the ground forces that land; nothing else is placed.
  // Checks: without the breakthrough the planet holds the one infantry that landed.
  // Why the check is NOT redundant here: a breakthrough acts once it is held.
  test('breakthrough:l1z1xbt not held, only the landed infantry stands on the planet', () => {
    expect(endOf(invade('l1z1x', {})).ground.t2).toEqual({ infantry: 1 });
  });

  // "When you gain control of a planet ..."
  // Checks: landing on a planet I already control gains nothing, so nothing is placed.
  // Why the check is NOT redundant here: control was not gained.
  test('breakthrough:l1z1xbt landing on a planet already controlled places nothing', () => {
    expect(endOf(invade('l1z1x', { breakthrough: 'held' }, { planetControl: { t2: 'me' } })).ground.t2).toEqual({ infantry: 1 });
  });

  // Checks: the breakthrough is printed on the L1Z1X sheet; another faction's landing places nothing.
  test('breakthrough:l1z1xbt is the L1Z1X\'s own', () => {
    expect(endOf(invade('sol')).ground.t2).toEqual({ infantry: 1 });
  });

  test.todo('breakthrough:l1z1xbt when the reinforcements hold fewer infantry than the influence: the infantry limit is not counted by the replay');

  test.fails('breakthrough:l1z1xbt is a passive effect that places units and waives nothing', () => {
    const { pack } = invade('l1z1x');
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).waive).toBeUndefined();
  });
});
