/**
 * The waivers themselves, apart from any component: which of the components asked lift a warning, and that a lifted
 * warning stays in the list. The components that really waive have their own tests under `components/`.
 */
import { describe, expect, test, vi } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { forecast } from '../rules/kit';
import { isWaived, standing, violation } from '../rules/registry';
import { bench, componentAction, NEAR, tactical, using } from './components/kit';
import { effectOf } from './registry';
import type { Entry, Game, GameState, Warning } from '../types';
import type { ComponentEffect, WaiverContext } from './types';
import { marked, playedBy, type Asked } from './waivers';

const ctx = { pack: loadPack([]), game: {} as Game, before: {} as GameState, after: {} as GameState, shared: {} as GameState } satisfies WaiverContext;
const over = (): Warning => violation('fleetPool', { systemId: '0,0', ships: 4, fleet: 3 });
const lifts = (extra: Partial<ComponentEffect> = {}, waiver = {}): ComponentEffect =>
  ({ tier: 'passive', rule: 'test', waive: [{ code: 'fleetPool', rule: 'test', ...waiver }], ...extra });
const ask = (id: string, effect: ComponentEffect, by: Asked['by'] = 'force'): Asked => ({ id, effect, by });

describe('waivers', () => {
  test('a waived warning stays in the list, marked with the component; it no longer stands', () => {
    const warnings = marked([over(), violation('capacitySystem', { systemId: '0,0', load: 2, capacity: 1 })], [ask('ability:a', lifts())], ctx);
    expect(warnings.map(w => w.code)).toEqual(['fleetPool', 'capacitySystem']);
    expect(warnings[0].waivedBy).toEqual(['ability:a']);
    expect(isWaived(warnings[0])).toBe(true);
    expect(isWaived(warnings[1])).toBe(false);
    expect(standing(warnings).map(w => w.code)).toEqual(['capacitySystem']);
  });

  test('a warning nobody waives is left as it was: it still equals its plain code and params', () => {
    const [warning] = marked([over()], [ask('ability:a', { tier: 'passive', rule: 'test' })], ctx);
    expect(warning).toEqual({ code: 'fleetPool', params: { systemId: '0,0', ships: 4, fleet: 3 } });
    expect('waivedBy' in warning).toBe(false);
  });

  test('`when` narrows a waiver to the warnings the component covers, and is given the entry and the boards', () => {
    const seen: unknown[] = [];
    const effect = lifts({}, { when: (w: Warning, c: WaiverContext) => { seen.push(c.before); return Number(w.params.ships) <= 4; } });
    const [small, large] = marked([over(), violation('fleetPool', { systemId: '1,0', ships: 9, fleet: 3 })], [ask('ability:a', effect)], ctx);
    expect(small.waivedBy).toEqual(['ability:a']);
    expect(large.waivedBy).toBeUndefined();
    expect(seen[0]).toBe(ctx.before);
  });

  test('every component that lifts a warning is named, each once', () => {
    const [warning] = marked([over()], [ask('ability:a', lifts()), ask('leader:b', lifts({ tier: 'play' }), 'entry'), ask('ability:a', lifts())], ctx);
    expect(warning.waivedBy).toEqual(['ability:a', 'leader:b']);
  });

  test('a passive effect waives while in force; a play or hint effect only when the entry names it', () => {
    const play = lifts({ tier: 'play' });
    const hint = lifts({ tier: 'hint' });
    expect(marked([over()], [ask('x:play', play, 'force'), ask('x:hint', hint, 'force')], ctx)[0].waivedBy).toBeUndefined();
    expect(marked([over()], [ask('x:play', play, 'entry'), ask('x:hint', hint, 'entry')], ctx)[0].waivedBy).toEqual(['x:play', 'x:hint']);
    // A passive one the entry names (another player's ability lent for this action) waives as well.
    expect(marked([over()], [ask('x:passive', lifts(), 'entry')], ctx)[0].waivedBy).toEqual(['x:passive']);
  });

  test('a component played earlier in the round waives only what it says lasts for the round', () => {
    const once = lifts({ tier: 'play' });
    const lasting = lifts({ tier: 'play' }, { lasts: 'round' });
    expect(marked([over()], [ask('x:once', once, 'round')], ctx)[0].waivedBy).toBeUndefined();
    expect(marked([over()], [ask('x:lasting', lasting, 'round')], ctx)[0].waivedBy).toEqual(['x:lasting']);
  });

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
