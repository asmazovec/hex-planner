import { describe, expect, test } from 'vitest';
import type { Entry, EntryBody } from '../../../../testing/old/domain/types';
import { adjust, bench, effect, endOf, planned, quote } from '../kit';
import { id } from './rearmament';

/** The agenda resolved with its outcome and, for "For", the planet; `choices` is not a field of an adjustment yet (pass 2). */
const resolved = (choices: Record<string, string | number>): Entry =>
  planned({ type: 'adjustment', label: '', delta: {}, choices } as EntryBody, 'agenda', { gains: [id] });
const table = (entries: Entry[]) => bench({ faction: 'sol', expansions: ['pok'], entries, game: { planetControl: { h1: 'me', h2: 'me', t1: 'me' } } });

describe('agenda:rearmament Rearmament Agreement', () => {
  // "For: Each player places 1 mech from their reinforcements on a planet they control in their home system."
  // Checks: "For" with the home planet h1 chosen puts one mech there by itself.
  // Why the check is redundant here: nothing is lifted; the agenda places a unit, which the plan counts.
  test('agenda:rearmament for places one mech on the chosen planet of the home system', () => {
    const t = table([resolved({ outcome: 'for', planet: 'h1' })]);
    quote(t.pack, id, 'Each player places 1 mech from their reinforcements on a planet they control in their home system');
    expect(endOf(t).ground.h1).toEqual({ mech: 1 });
  });

  // "Against: Each player replaces each of their mechs with 1 infantry from their reinforcements."
  // Checks: a mech on t1 and one in the home space become infantry; nothing else changes.
  test('agenda:rearmament against replaces each mech with an infantry', () => {
    const t = table([adjust({ ground: { t1: { mech: 1, infantry: 1 } }, units: { systemId: '0,0', units: { carrier: 1, mech: 1 } } }), resolved({ outcome: 'against' })]);
    quote(t.pack, id, 'Each player replaces each of their mechs with 1 infantry');
    const end = endOf(t);
    expect(end.ground.t1).toEqual({ infantry: 2 });
    expect(end.systems['0,0']).toEqual({ carrier: 1, infantry: 1 });
  });

  // Rulings: "A player that has no mechs on the game board is unaffected by the 'Against' effect".
  // Checks: with no mech on the board, "Against" changes nothing.
  // Why the check is NOT redundant here: the card replaces mechs; without one it has nothing to do.
  test('agenda:rearmament against with no mech on the board changes nothing', () => {
    const t = table([adjust({ ground: { t1: { infantry: 1 } } }), resolved({ outcome: 'against' })]);
    expect(endOf(t).ground.t1).toEqual({ infantry: 1 });
  });

  // Checks: the card is played by the agenda entry.
  test('agenda:rearmament is a play effect', () => {
    expect(effect(table([]).pack, id).tier).toBe('play');
  });
});
