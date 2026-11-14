import { describe, expect, test } from 'vitest';
import type { Entry } from '../../../types';
import type { Player } from '../../../players';
import { bench, componentAction, effect, endOf, expectStanding, NEAR, quote, warningsOf } from '../kit';
import { id } from './saarhero';

const RIVAL: Player = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };

/** My dock is on Home One; the system next to home holds the opponent's cruiser, fighters and infantry, and my own. */
const relay = (entries: Entry[]) => bench({
  faction: 'saar', expansions: ['pok'], units: { [NEAR]: { carrier: 1, fighter: 1, infantry: 1 } },
  start: { leaders: { [id]: 'unlocked' } }, entries,
  game: { docks: ['h1'], opponents: [RIVAL], enemyUnits: { [NEAR]: { [RIVAL.id]: { cruiser: 1, fighter: 2, infantry: 2 } } } },
});
const play = (system: string) => componentAction(id, { choices: { system } } as Partial<Entry>);

describe('leader:saarhero Gurno Aggero', () => {
  // "ACTION: Choose 1 system that is adjacent to 1 of your space docks. Destroy all other players' infantry and
  //  fighters in that system."
  // Checks: played on the system next to my home dock, the opponent's fighters and infantry there are gone and the
  // cruiser stays.
  // Why it is counted here: the plan keeps every opponent's units; the hero removes some of them by its play.
  test('leader:saarhero destroys the other players\' infantry and fighters in the chosen system', () => {
    const table = relay([play(NEAR)]);
    quote(table.pack, id, "Destroy all other players' infantry and fighters in that system.");
    expect(endOf(table).rivals?.[RIVAL.id]?.systems[NEAR]).toEqual({ cruiser: 1 });
  });

  // "Destroy all other players' infantry and fighters ..."
  // Checks: my own fighters and infantry in that system stay.
  // Why nothing of mine is destroyed: the text names other players' units only.
  test('leader:saarhero leaves my own infantry and fighters in the chosen system', () => {
    expect(endOf(relay([play(NEAR)])).systems[NEAR]).toEqual({ carrier: 1, fighter: 1, infantry: 1 });
  });

  // "Then, purge this card." with LRR 51.12.
  // Checks: played once the hero is purged; a second play is warned of as not held.
  // Why the check is NOT redundant here: a purged hero is gone for the rest of the game.
  test('leader:saarhero is purged by its play', () => {
    const again = play(NEAR);
    expectStanding(warningsOf(relay([play(NEAR), again]), again), 'componentNotHeld');
  });

  test.todo('leader:saarhero a system that is not adjacent to one of my docks (a dock\'s own system included: Saar note "A unit is not adjacent to the system it is in") is warned of: no code for the choice of a component yet');
  test.todo('leader:saarhero the infantry on the planets of the chosen system: "in that system" covers its planets too; the plan must remove the opponent\'s ground forces there');

  test('leader:saarhero is a play effect', () => {
    const { pack } = relay([]);
    expect(effect(pack, id).tier).toBe('play');
    expect(effect(pack, id).play).toBeTypeOf('function');
  });
});
