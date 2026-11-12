import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, Entry, Game, UnitCounts } from '../../../types';
import { bench, effect, endOf, expectNone, expectStanding, expectWaived, HOME, NEAR, quote, tactical, TARGET, using, warningsOf } from '../kit';
import { id } from './bastionbt';

/**
 * The code pass 2 adds (LRR 68.2, step production): ships produced are placed outside the active system. It does not
 * exist yet, so it is named here as a plain string.
 */
const CODE = 'productionShipsAway' as AnyWarningCode;

/** A tactical action in the home system (dock on h1) that builds two cruisers and places them in `to` (the field pass 2 adds). */
const build = (to: string | undefined, uses: string[] = []): Entry => {
  const entry: Entry = Object.assign(tactical(HOME, { production: { cruiser: 2 } }), to ? { shipsTo: to } : {});
  return uses.length > 0 ? using(entry, ...uses) : entry;
};

/** The carrier next to the target flies in and lands one infantry on t1: my command token and a ground force there. */
const liberate = (): Entry => tactical(TARGET, { moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }] });

const table = (entries: Entry[], options: { units?: Record<string, UnitCounts>; game?: Partial<Game>; faction?: string } = {}) => bench({
  faction: options.faction ?? 'bastion', expansions: ['pok', 'te'], start: { breakthrough: 'held' },
  units: options.units ?? { [NEAR]: { carrier: 1, infantry: 1 } }, game: { docks: ['h1'], ...options.game }, entries,
});

describe('breakthrough:bastionbt The Icon', () => {
  // "When you produce ships, you may exhaust this card to place those ships in a system that contains 1 of your
  //  command tokens, at least 1 of your ground forces, and no other player's ships."
  // Checks: two cruisers built at home are placed in the target, where my command token and my infantry stand and no
  // other ship; the warning that ships leave the active system is listed and lifted by The Icon, and they stand there.
  // Why the check is redundant here: LRR 68.2 places ships produced in the active system; The Icon names another
  // system for them, under its own three conditions, which all hold.
  test.fails('breakthrough:bastionbt places the ships built in a system with my token and ground forces: the warning is waived', () => {
    const move = build(TARGET, [id]);
    const bastion = table([liberate(), move]);
    quote(bastion.pack, id, 'you may exhaust this card to place those ships in a system that contains 1 of your command tokens');
    expectWaived(warningsOf(bastion, move), CODE, id);
    const end = endOf(bastion);
    expect(end.systems[TARGET]?.cruiser).toBe(2);
    expect(end.systems[HOME]?.cruiser ?? 0).toBe(0);
    expect(end.holdings.breakthrough).toBe('exhausted');
  });

  // LRR 68.2: "When a player produces ships by using Production that player must place them in the active system."
  // Checks: the same placement without The Icon in «Used» is warned of, and the ships still go where the player put
  // them, as the plan forbids nothing.
  // Why the check is NOT redundant here: the card is used by exhausting it; not named, it is not used.
  test.fails('breakthrough:bastionbt not used, the ships placed away from the active system are warned of', () => {
    const move = build(TARGET);
    const bastion = table([liberate(), move]);
    expectStanding(warningsOf(bastion, move), CODE);
    expect(endOf(bastion).systems[TARGET]?.cruiser).toBe(2);
  });

  // "... at least 1 of your ground forces ..."
  // Checks: a cruiser alone took the target: my command token is there, no ground force; the warning stands.
  // Why the check is NOT redundant here: the second condition of the card fails.
  test.fails('breakthrough:bastionbt does not lift the warning for a system without my ground forces', () => {
    const arrive = tactical(TARGET, { moves: [{ from: NEAR, units: { cruiser: 1 } }] });
    const move = build(TARGET, [id]);
    expectStanding(warningsOf(table([arrive, move], { units: { [NEAR]: { cruiser: 1 } } }), move), CODE);
  });

  // "... 1 of your command tokens ..."
  // Checks: one infantry stands in the space area of the target, which holds no command token of mine; the warning stands.
  // Why the check is NOT redundant here: the first condition of the card fails.
  test.fails('breakthrough:bastionbt does not lift the warning for a system without my command token', () => {
    const move = build(TARGET, [id]);
    expectStanding(warningsOf(table([move], { units: { [TARGET]: { infantry: 1 } } }), move), CODE);
  });

  // "... and no other player's ships."
  // Checks: an opponent's cruiser stands in the target beside my token and my infantry; the warning stands.
  // Why the check is NOT redundant here: the third condition of the card fails (as 67.6 for a system with other
  // players' ships).
  test.fails('breakthrough:bastionbt does not lift the warning for a system with another player\'s ships', () => {
    const move = build(TARGET, [id]);
    const blocked = table([liberate(), move], { game: { enemyUnits: { [TARGET]: { rival: { cruiser: 1 } } } } });
    expectStanding(warningsOf(blocked, move), CODE);
  });

  // "... you may exhaust this card ..." (LRR 34: an exhausted card cannot be used until it is readied)
  // Checks: The Icon used in round 1 is exhausted; named again in the same round it is warned of as exhausted.
  // Why the check is NOT redundant here: the card readies only in the status phase.
  test('breakthrough:bastionbt used once is exhausted: a second use in the same round is warned of', () => {
    const first = build(undefined, [id]);
    const second = build(undefined, [id]);
    const bastion = table([first, second]);
    expectNone(warningsOf(bastion, first), 'componentExhausted');
    expectStanding(warningsOf(bastion, second), 'componentExhausted');
  });

  // Checks: ships built and placed in the active system make no warning of the new code, with The Icon or without.
  // Why the check is NOT redundant here: there is nothing to lift; 68.2 is kept.
  test('breakthrough:bastionbt ships placed in the active system make no warning', () => {
    const move = build(undefined, [id]);
    expectNone(warningsOf(table([move]), move), CODE);
  });

  test.fails('breakthrough:bastionbt is a play effect that waives the placement of ships away from the active system', () => {
    const { pack } = table([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).waive?.map(w => w.code)).toEqual([CODE]);
  });
});
