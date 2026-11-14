/**
 * What an entry plays (`playedBy`) and how the replay calls `play`, apart from any component. The waiver pass itself is
 * tested on the kernel (`game/resolve/waive.test.ts`); the components that really waive have their own tests under `components/`.
 */
import { describe, expect, test, vi } from 'vitest';
import { forecast } from '../rules/kit';
import { bench, componentAction, NEAR, tactical, using } from './components/kit';
import { effectOf } from './registry';
import type { Entry } from '../types';
import { playedBy } from './waivers';

describe('waivers', () => {
  test('the replay calls `play` of every component an entry plays, once, with the entry, the owner\'s state and the choices', () => {
    const hero = 'leader:letnevhero';
    const action = componentAction(hero, { choices: { planet: 'h1' } } as Partial<Entry>);
    const move = using(tactical(NEAR, { moves: [] }), hero);
    const table = bench({ faction: 'letnev', expansions: ['pok'], start: { leaders: { [hero]: 'unlocked' } }, entries: [action, move] });
    const effect = effectOf(table.pack, hero)!;
    const play = vi.fn();
    const real = effect.nativePlay;
    effect.nativePlay = play;
    try {
      forecast(table.game, table.pack);
    } finally {
      effect.nativePlay = real;
    }
    expect(play).toHaveBeenCalledTimes(2);
    expect(play.mock.calls[0][0]).toMatchObject({ entry: { id: action.id }, choices: { planet: 'h1' }, pack: table.pack });
    expect(play.mock.calls[0][0].my.holds(hero)).toBe(false);
    expect(play.mock.calls[1][0]).toMatchObject({ entry: { id: move.id }, choices: {} });
  });

  test('an entry plays its component action, what it spends and what it uses', () => {
    const base = { id: 'e', phase: 'action', status: 'planned' } as const;
    const action: Entry = { ...base, type: 'component', componentId: 'leader:a', note: '', spends: ['actionCard:b'], uses: ['technology:c', 'leader:a'] };
    expect(playedBy(action)).toEqual(['leader:a', 'actionCard:b', 'technology:c']);
    expect(playedBy({ ...base, type: 'pass' })).toEqual([]);
  });
});
