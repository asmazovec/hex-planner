import { describe, expect, test } from 'vitest';
import { adjust, bench, componentAction, HOME, NEAR } from '../../domain/effects/components/kit';
import type { Entry } from '../../testing/old/domain/types';
import type { Player } from '../../domain/players';
import { timelineOf } from '../../testing/projection';
import { turnOf } from '../../testing/old/game/fromLegacy';
import { choicesOf } from './choices';

const RIVAL: Player = { id: 'o1', faction: 'hacan', vp: 0, seat: 2, color: 2 };

/** The choices of component `id` that `entry` is asked, from the board just before it. */
function asked(entry: Entry, id: string, extra: Entry[] = []) {
  const table = bench({
    faction: 'sol', expansions: ['pok'], units: { [HOME]: { cruiser: 1 } }, start: { hand: ['actionCard:jamming', 'actionCard:refit'] }, entries: [...extra, entry],
    game: { opponents: [RIVAL], planetControl: { h1: 'me', t1: 'enemy' }, planetOwner: { t1: 'o1' } },
  });
  const line = timelineOf(table.game, table.game.plans[0], 'forecast', table.pack);
  const { table: kernelTable } = line.kernel;
  const before = line.kernel.byTurn.get(entry.id)!.before;
  return choicesOf(kernelTable, before, turnOf(kernelTable, entry, table.pack), id, table.pack);
}
const byKey = (found: ReturnType<typeof asked>, key: string) => found.find(c => c.spec.key === key)!;

describe('choicesOf: the choices of a component for a turn, from the board before it', () => {
  test('a static players choice offers the other players, whoever the entry belongs to', () => {
    const id = 'actionCard:jamming';
    const mine = asked(componentAction(id, { choices: { systemId: NEAR } }), id);
    expect(mine.map(c => c.spec.key)).toEqual(['systemId', 'player']);
    expect(byKey(mine, 'player').options).toEqual(['o1']);
    expect(byKey(mine, 'systemId').options).toContain(NEAR);
    const rival = asked(componentAction(id, { owner: 'o1' }), id);
    expect(byKey(rival, 'player').options).toEqual(['me']);
  });

  test('a planets-you-control choice offers the planets of the one whose entry it is', () => {
    const id = 'legendary:hopesend';
    const mine = byKey(asked(componentAction(id), id), 'hopesendPlanet').options;
    expect(mine).toContain('h1');
    expect(mine).not.toContain('t1');
    const rival = byKey(asked(componentAction(id, { owner: 'o1' }), id), 'hopesendPlanet').options;
    expect(rival).toContain('t1');
    expect(rival).not.toContain('h1');
  });

  test('a counts choice offers the places where the one whose entry it is has the unit, with how many', () => {
    const id = 'actionCard:refit';
    const found = asked(componentAction(id), id, [adjust({ ground: { h1: { infantry: 3 } } })]);
    expect(byKey(found, 'infantry').slots).toEqual([{ key: 'h1', unit: 'infantry', planet: 'h1', max: 3 }]);
  });

  test('a choice that depends on an earlier one is told so, and answered from what is chosen', () => {
    const id = 'actionCard:jamming';
    const found = asked(componentAction(id, { choices: { player: 'o1' } }), id);
    expect(found.every(c => c.shown)).toBe(true);
  });
});
