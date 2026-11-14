import { describe, expect, test } from 'vitest';
import type { Entry, EntryBody } from '../../../../testing/old/domain/types';
import { adjust, bench, effect, endOf, planned, quote } from '../kit';
import { id } from './disarmament';

/**
 * The directive resolved in the agenda phase on the elected planet. The shape is a proposal for pass 2: an agenda
 * entry that names the directive and the planet elected (`choices.planet`), as a component action names its choices.
 */
const elect = (planet: string): Entry => planned({ type: 'component', componentId: id, note: '', choices: { planet } } as EntryBody, 'agenda');
const onHomeOne = () => adjust({ ground: { h1: { infantry: 2, mech: 1 } } });

describe('agenda:disarmament Compensated Disarmament', () => {
  // "Destroy each ground force on the elected planet. For each unit that was destroyed, the player who control that
  //  planet gains 1 trade good."
  // Checks: two infantry and a mech of mine on Home One are destroyed and I, who control it, gain 3 trade goods.
  // Why the check is redundant here: there is no check; the directive changes the ground forces and the trade goods
  // the plan counts.
  test('agenda:disarmament destroys my ground forces on the elected planet and pays a trade good for each', () => {
    const table = bench({ faction: 'sol', entries: [onHomeOne(), elect('h1')] });
    quote(table.pack, id, 'Destroy each ground force on the elected planet.');
    const end = endOf(table);
    expect(end.ground.h1 ?? {}).toEqual({});
    expect(end.tradeGoods).toBe(3);
  });

  // Compensated Disarmament note 4: "Structures are unaffected by Compensated Disarmament."
  // Checks: a PDS and a space dock on the elected planet stay.
  // Why the check is NOT redundant here: the directive speaks of ground forces only.
  test('agenda:disarmament leaves the structures of the planet', () => {
    const table = bench({ faction: 'sol', entries: [onHomeOne(), elect('h1')], game: { pds: { h1: 1 }, docks: ['h1'] } });
    const end = endOf(table);
    expect(end.ground.h1 ?? {}).toEqual({});
    expect(end.pds.h1).toBe(1);
    expect(end.docks).toContain('h1');
  });

  // "... on the elected planet."
  // Checks: the ground forces on another planet stay.
  // Why the check is NOT redundant here: only the elected planet is disarmed.
  test('agenda:disarmament leaves the ground forces of other planets', () => {
    const table = bench({ faction: 'sol', entries: [adjust({ ground: { h1: { infantry: 1 }, h2: { infantry: 2 } } }), elect('h1')] });
    const end = endOf(table);
    expect(end.ground.h2).toEqual({ infantry: 2 });
    expect(end.tradeGoods).toBe(1);
  });

  test.todo('agenda:disarmament on a planet another player controls pays them, and destroys their ground forces: a directive on my entry reaches only my state');

  test('agenda:disarmament is a play effect', () => {
    const { pack } = bench({ faction: 'sol' });
    expect(effect(pack, id).tier).toBe('play');
  });
});
