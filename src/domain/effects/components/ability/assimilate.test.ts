import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import type { Player } from '../../../players';
import { bench, effect, endOf, expectNone, expectStanding, NEAR, NO_PAYMENT, quote, TARGET, tactical, warningsOf } from '../kit';
import { id } from './assimilate';

const RIVAL: Player = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };

/** A carrier with two infantry flies from NEAR into the target and lands both on Target One. */
const invade = (extra: Partial<Extract<Entry, { type: 'tactical' }>> = {}) =>
  tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 2 } }], landings: [{ planetId: 't1', units: { infantry: 2 } }], ...extra });

/** Target One is the rival's, with a PDS and a space dock on it. */
const table = (faction: string, move: Entry) => bench({
  faction, units: { [NEAR]: { carrier: 1, infantry: 2 } }, entries: [move],
  game: { opponents: [RIVAL], planetControl: { t1: 'enemy' }, planetOwner: { t1: 'o1' }, pds: { t1: 1 }, docks: ['t1'] },
});

describe('ability:assimilate Assimilate', () => {
  // "When you gain control of a planet: Replace each PDS and space dock that is on that planet with a matching unit from
  //  your reinforcements."
  // Checks: the L1Z1X take Target One; its PDS and space dock are theirs afterwards, and no longer the rival's.
  // Why nothing is waived: LRR 49.5.1 destroys the structures of the player who loses the planet; the ability
  // replaces them instead, a change of the board the replay must make (faction note 4: every structure, mandatorily).
  test('ability:assimilate the structures of a planet taken become the L1Z1X\'s', () => {
    const move = invade();
    const l1z1x = table('l1z1x', move);
    quote(l1z1x.pack, id, 'Replace each PDS and space dock that is on that planet with a matching unit from your reinforcements');
    const end = endOf(l1z1x);
    expect(end.pds.t1).toBe(1);
    expect(end.docks).toContain('t1');
    expect(end.rivals?.o1.pds.t1 ?? 0).toBe(0);
    expect(end.rivals?.o1.docks).not.toContain('t1');
  });

  // LRR 49.5.1 (Invasion): the structures of another player on a planet gained are destroyed.
  // Checks: another faction taking the same planet ends with neither structure.
  // Why the check is NOT redundant here: the ability is printed on the L1Z1X sheet.
  test('ability:assimilate is the L1Z1X\'s own: another faction destroys the structures', () => {
    const end = endOf(table('sol', invade()));
    expect(end.pds.t1 ?? 0).toBe(0);
    expect(end.docks).not.toContain('t1');
    expect(end.rivals?.o1.docks).not.toContain('t1');
  });

  // Faction note 1: "Any space docks that are placed by this ability during a tactical action may produce units during
  //  the Production step of that tactical action."
  // Checks: the dock gained on Target One produces two infantry in the same action without a warning of no production.
  // Why the check is redundant here: production asks for a dock of mine in the active system (67.1), which the
  // ability has just given.
  test('ability:assimilate a space dock gained produces in the same tactical action', () => {
    const move = invade({ production: { infantry: 2 }, payment: { planets: [], tradeGoods: 1 } });
    expectNone(warningsOf(table('l1z1x', move), move), 'noProduction');
  });

  // Checks: the same production without the ability has no dock to produce from.
  // Why the check is NOT redundant here: the rival's dock was destroyed, so there is no dock in the system.
  test('ability:assimilate without it the destroyed dock produces nothing', () => {
    const move = invade({ production: { infantry: 2 }, payment: NO_PAYMENT });
    expectStanding(warningsOf(table('sol', move), move), 'noProduction');
  });

  // "When you gain control of a planet ..."
  // Checks: ships that fly into the system without landing take no planet and no structure.
  // Why the check is NOT redundant here: control is not gained, so the ability does not trigger.
  test('ability:assimilate without a landing nothing is replaced', () => {
    const end = endOf(table('l1z1x', invade({ landings: [] })));
    expect(end.pds.t1 ?? 0).toBe(0);
    expect(end.rivals?.o1.pds.t1).toBe(1);
  });

  test.todo('ability:assimilate with no PDS or space dock left in reinforcements the structure may be taken from elsewhere (faction note 3): the replay does not choose a structure on the board');

  test('ability:assimilate is a passive effect that waives nothing', () => {
    const { pack } = table('l1z1x', invade());
    expect(effect(pack, id).tier).toBe('passive');
  });
});
