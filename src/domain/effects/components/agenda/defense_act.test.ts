import { describe, expect, test } from 'vitest';
import { CARD } from '../../../strategy';
import type { Entry, Game } from '../../../types';
import { adjust, bench, effect, endOf, expectStanding, expectWaived, primary, quote, warningsOf } from '../kit';
import { id } from './defense_act';

/** The law passes in the agenda phase of round 1. */
const law = (): Entry => ({ ...adjust({}, 'agenda'), gains: [id] });
/** Construction's primary puts one more PDS on Home One. */
const build = (): Entry => primary(CARD.construction, { structures: [{ kind: 'pds', planetId: 'h1' }] });
const table = (rounds: Entry[][], game: Partial<Game> = { pds: { h1: 2 } }) => bench({ faction: 'sol', rounds, game });

describe('agenda:defense_act Homeland Defense Act', () => {
  // "For: Each player can have any number of PDS units on planets they control."
  // Checks: with the law in play a third PDS goes on Home One; the warning that a planet holds two PDS is listed and
  // lifted by the law, and the PDS stands there.
  // Why the check is redundant here: LRR 63.3 ("Each planet can have a maximum of two PDS units") is the very number the
  // law removes for PDS on a planet the player controls.
  test.fails('agenda:defense_act in play lifts the two-PDS limit of a planet', () => {
    const third = build();
    const defended = table([[law()], [third]]);
    quote(defended.pack, id, 'Each player can have any number of PDS units on planets they control.');
    expectWaived(warningsOf(defended, third), 'structureLimit', id);
    expect(endOf(defended).pds.h1).toBe(3);
  });

  // LRR 63.3: "A PDS unit is placed on a planet. Each planet can have a maximum of two PDS units."
  // Checks: without the law the same third PDS is warned of, and placed all the same: the plan forbids nothing.
  // Why the check is NOT redundant here: no law is in play.
  test('agenda:defense_act not in play, a third PDS on a planet stands warned', () => {
    const third = build();
    const plain = table([[third]]);
    expectStanding(warningsOf(plain, third), 'structureLimit');
    expect(endOf(plain).pds.h1).toBe(3);
  });

  // LRR 24.4: structures come from the reinforcements (six PDS).
  // Checks: with the law in play a seventh PDS, put on a planet with none, is still warned of.
  // Why the check is NOT redundant here: the law speaks of how many PDS a planet holds, not of the units a player has
  // (components are limited, 24.4); the PDS still has to come from the reinforcements.
  test('agenda:defense_act does not lift the limit of the reinforcements', () => {
    const seventh = build();
    const defended = table([[law()], [seventh]], { pds: { h2: 2, t1: 2, t2: 2 }, planetControl: { t1: 'me', t2: 'me' } });
    expectStanding(warningsOf(defended, seventh), 'structureLimit');
  });

  // LRR 24.2: the primary places one PDS or space dock, then may place one more PDS.
  // Checks: with the law in play Construction's primary placing three PDS is still warned of.
  // Why the check is NOT redundant here: the law lets a planet hold more PDS, it does not let the card place more.
  test('agenda:defense_act does not lift the number of structures Construction places', () => {
    const two = primary(CARD.construction, { structures: [{ kind: 'pds', planetId: 'h1' }, { kind: 'pds', planetId: 'h2' }, { kind: 'pds', planetId: 'h2' }] });
    const defended = table([[law()], [two]], {});
    expectStanding(warningsOf(defended, two), 'structureLimit');
  });

  // Homeland Defense Act note 1: "If the Homeland Defense Act law is discarded, players might have to remove PDS so that
  //  they have no more than two on each planet."
  // Checks: once the law leaves play the third PDS is warned of again.
  // Why the check is NOT redundant here: the law is no longer in play.
  test('agenda:defense_act discarded, a third PDS is warned of again', () => {
    const third = build();
    const repealed = table([[law()], [{ ...adjust({}, 'agenda'), spends: [id] }], [third]]);
    expectStanding(warningsOf(repealed, third), 'structureLimit');
  });

  test.todo('agenda:defense_act "Against": each player destroys 1 PDS: a one-off outcome and a choice an entry cannot name');

  test.fails('agenda:defense_act is a passive effect that waives the PDS limit of a planet', () => {
    const { pack } = table([[]]);
    expect(effect(pack, id).tier).toBe('passive');
    expect(effect(pack, id).waive?.map(w => w.code)).toEqual(['structureLimit']);
  });
});
