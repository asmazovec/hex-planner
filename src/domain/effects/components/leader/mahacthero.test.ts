import { describe, expect, test } from 'vitest';
import type { AnyWarningCode, Entry } from '../../../types';
import type { Player } from '../../../players';
import { bench, componentAction, endOf, expectStanding, FAR, HOME, NEAR, quote, warningsOf } from '../kit';
import { id } from './mahacthero';

const CONDITION = 'componentCondition' as AnyWarningCode;
const SOL: Player = { id: 'sol1', faction: 'sol', vp: 0, seat: 2, color: 2 };
const table = (entries: Entry[]) => bench({
  faction: 'mahact', expansions: ['pok'], units: { [HOME]: { cruiser: 2, fighter: 1 } }, start: { leaders: { [id]: 'unlocked' } }, entries,
  game: { opponents: [SOL], enemyUnits: { [NEAR]: { sol1: { destroyer: 1 } } } },
});
const benediction = () => componentAction(id, { choices: { from: HOME, to: NEAR } });

describe('leader:mahacthero Airo Shir Aur', () => {
  // "ACTION: Move all units in the space area of any system to an adjacent system that contains a different player's
  //  ships."
  // Checks: the hero's action names my home system and the next one, where a Sol destroyer stands: my two cruisers
  // and the fighter in the home space area end in that system, none is left at home.
  // Why the default count does not apply: units move only in the movement of a tactical action (58); the hero moves
  // them by a component action, with no route, no speed and no token.
  test('leader:mahacthero moves every unit of a space area to the adjacent system', () => {
    const table_ = table([benediction()]);
    quote(table_.pack, id, 'Move all units in the space area of any system to an adjacent system that contains a different player\'s ships.');
    const end = endOf(table_);
    expect(end.systems[NEAR]).toEqual({ cruiser: 2, fighter: 1 });
    expect(end.systems[HOME] ?? {}).toEqual({});
  });

  // "Then, purge this card." (LRR 51.12)
  // Checks: the hero is purged by its action, so a second one is warned of.
  test('leader:mahacthero is purged by its play', () => {
    const again = benediction();
    expectStanding(warningsOf(table([benediction(), again]), again), 'componentNotHeld');
  });

  // Same card text. Checks: a target system where nobody has ships is warned of (the units still move).
  // Why the check is NOT redundant here: the hero moves only to a system that contains a different player's ships.
  test('leader:mahacthero a target system without another player\'s ships is warned of', () => {
    const empty = componentAction(id, { choices: { from: HOME, to: FAR } });
    expectStanding(warningsOf(table([empty]), empty), CONDITION);
  });

  // Checks: the target with the Sol destroyer raises no such warning.
  test('leader:mahacthero a target system with another player\'s ships is not warned of', () => {
    const fine = benediction();
    expect(warningsOf(table([fine]), fine).map(w => w.code)).not.toContain(CONDITION);
  });

  test.todo('leader:mahacthero a target system not adjacent is warned of: no code for the choice of a component yet');
  test.todo('leader:mahacthero moves another player\'s units: units of a rival moved by my component action are not modelled');
});
