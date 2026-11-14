import { describe, expect, test } from 'vitest';
import type { Entry, EntryBody } from '../../../../testing/old/domain/types';
import { adjust, bench, effect, endOf, planned, quote } from '../kit';
import { id } from './redistribution';

/**
 * The directive resolved in the agenda phase on the elected planet. The shape is a proposal for pass 2: an agenda
 * entry that names the directive and the planet elected (`choices.planet`), as a component action names its choices.
 */
const elect = (planet: string): Entry => planned({ type: 'component', componentId: id, note: '', choices: { planet } } as EntryBody, 'agenda');

describe('agenda:redistribution Colonial Redistribution', () => {
  // "Destroy each unit on the elected planet."
  // Checks: my infantry, mech and PDS on Target One, elected, are destroyed.
  // Why the check is redundant here: there is no check; the directive removes units the plan counts, structures among
  // them (85: a structure is a unit).
  test('agenda:redistribution destroys each unit of mine on the elected planet', () => {
    const table = bench({
      faction: 'sol', entries: [adjust({ ground: { t1: { infantry: 2, mech: 1 } } }), elect('t1')],
      game: { planetControl: { t1: 'me' }, pds: { t1: 1 } },
    });
    quote(table.pack, id, 'Destroy each unit on the elected planet.');
    const end = endOf(table);
    expect(end.ground.t1 ?? {}).toEqual({});
    expect(end.pds.t1 ?? 0).toBe(0);
  });

  // "... on the elected planet."
  // Checks: the units on the other planet of the system stay.
  // Why the check is NOT redundant here: only the elected planet is cleared.
  test('agenda:redistribution leaves the units of other planets', () => {
    const table = bench({
      faction: 'sol', entries: [adjust({ ground: { t1: { infantry: 1 }, t2: { infantry: 2 } } }), elect('t1')],
      game: { planetControl: { t1: 'me', t2: 'me' } },
    });
    const end = endOf(table);
    expect(end.ground.t1 ?? {}).toEqual({});
    expect(end.ground.t2).toEqual({ infantry: 2 });
  });

  test.todo('agenda:redistribution the player with the fewest victory points may then place 1 infantry there: another player\'s choice, not modelled');
  test.todo('agenda:redistribution the units of other players on the planet are destroyed too: a directive on my entry reaches only my state');

  test('agenda:redistribution is a play effect', () => {
    const { pack } = bench({ faction: 'sol' });
    expect(effect(pack, id).tier).toBe('play');
  });
});
