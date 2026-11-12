import { describe, expect, test } from 'vitest';
import type { Entry, UnitCounts } from '../../../types';
import { bench, componentAction, effect, endOf, FARTHER, HOME, quote, tactical, warningsOf } from '../kit';
import { id } from './argenthero';

/**
 * The hero's component action with its moves, each straight from a system to a destination: pass 2 gives the component
 * entry that field, or renames it here.
 */
const heroPlay = (moves: { from: string; to: string; units: UnitCounts }[]): Entry => componentAction(id, { moves } as unknown as Partial<Entry>);

/** I activate home first (my command token goes there), then the hero brings a cruiser from four systems away. */
const table = (play: Entry, before: Entry[] = [tactical(HOME)]) => ({
  play, ...bench({ faction: 'argent', expansions: ['pok'], units: { [FARTHER]: { cruiser: 1 } }, start: { leaders: { [id]: 'unlocked' } }, entries: [...before, play] }),
});

describe('leader:argenthero Mirik Aun Sissiri — Helix Protocol', () => {
  // "ACTION: Move any number of your ships from any systems to any number of other systems that contain 1 of your
  //  command tokens and no other players' ships."
  // Checks: a cruiser four systems away is moved into home, which holds my command token; it stands there after the
  // action, and neither its speed nor the token of its destination is warned of.
  // Why the check is redundant here: movement is bound by the move value (58.3.6) and happens in a tactical action
  // into the active system; the hero moves ships directly to their destination (Argent, hero note 4).
  test.fails('leader:argenthero moves a ship from any system into a system with my command token', () => {
    const hero = table(heroPlay([{ from: FARTHER, to: HOME, units: { cruiser: 1 } }]));
    quote(hero.pack, id, 'Move any number of your ships from any systems to any number of other systems that contain 1 of your command tokens');
    const end = endOf(hero);
    expect(end.systems[HOME]).toEqual({ cruiser: 1 });
    expect(end.systems[FARTHER]).toBeUndefined();
    expect(warningsOf(hero, hero.play).map(w => w.code)).not.toContain('speedShort');
  });

  // Argent, hero note 2: "Ships in systems with one of the Argent player's command tokens may move."
  // Checks: the cruiser leaves a system that holds my token, and that is not warned of.
  // Why the check is redundant here: 58.3.3 holds ships in an activated system during a tactical action; the hero's
  // move is not one.
  test.fails('leader:argenthero moves ships out of a system that holds my command token', () => {
    const hero = table(heroPlay([{ from: FARTHER, to: HOME, units: { cruiser: 1 } }]), [tactical(HOME), tactical(FARTHER)]);
    expect(endOf(hero).systems[HOME]).toEqual({ cruiser: 1 });
    expect(warningsOf(hero, hero.play).map(w => w.code)).not.toContain('sourceActivated');
  });

  // "Then, purge this card." LRR 51.12: "A hero is purged after its abilities are resolved."
  // Checks: played twice, the second play is warned of as a card no longer held.
  test('leader:argenthero is purged by its play', () => {
    const again = componentAction(id);
    const hero = table(again, [componentAction(id)]);
    expect(warningsOf(hero, again).map(w => w.code)).toContain('componentNotHeld');
  });

  test.fails('leader:argenthero is a play effect', () => {
    expect(effect(table(componentAction(id)).pack, id).tier).toBe('play');
  });

  test.todo('leader:argenthero a destination without my command token or with other players\' ships is warned of: the code of that condition comes with the moves of a component action');
  test.todo('leader:argenthero ships transport units only from an origin without my command token (Argent, hero note 3): transport of a component action\'s moves is not modelled');
});
