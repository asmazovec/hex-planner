/**
 * The hooks that let a component of one player act on the entry of another (docs/phase4/infra/rivals.md): the systems
 * a component bars to other players' ships, a note in the play area, the Alliance purge of Hubris at the start.
 */
import { describe, expect, test } from 'vitest';
import { genericNotes, startForFaction } from '../../holdings';
import { passageBarredOf, shipBlockersOf } from '../../../testing/old/domain/movement';
import type { Opponent } from '../../types';
import { bench, endOf, FAR, NEAR, TARGET, tactical } from '../components/kit';
import { notesInPlay } from './rivals';

const RIVAL: Opponent = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };
const ALLIANCE = 'promissory:<color>_an@me';

describe('stopsPassage: a system a component bars to the ships of other players', () => {
  const table = (technologies: string[]) => bench({
    faction: 'argent', expansions: ['pok'], start: { technologies }, entries: [tactical(NEAR)],
    game: { opponents: [RIVAL], enemyUnits: { [FAR]: { o1: { destroyer: 1 } } }, pds: { t1: 1 }, planetControl: { t1: 'me' } },
  });

  test('a rival is barred from the system with my structure, I am not, and it is no ship blocker', () => {
    const held = table(['technology:ah']);
    const state = endOf(held);
    expect([...passageBarredOf(held.game, state, 'o1', held.pack)]).toContain(TARGET);
    expect([...passageBarredOf(held.game, state, undefined, held.pack)]).not.toContain(TARGET);
    expect([...shipBlockersOf(held.game, state, 'o1', held.pack)]).not.toContain(TARGET);
  });

  test('without the component nothing is barred', () => {
    const held = table([]);
    expect(passageBarredOf(held.game, endOf(held), 'o1', held.pack).size).toBe(0);
  });
});

describe('a note in the play area', () => {
  test('only a note still held counts as in play', () => {
    expect(notesInPlay({ technologies: [], hand: [], relics: [], promissory: ['a'], leaders: {}, scored: [], secrets: [], exhausted: [], found: [], inPlay: ['a', 'b'] })).toEqual(['a']);
  });
});

describe('Hubris at the start', () => {
  test('a player who leaves Mahact has their Alliance back, and one who joins it loses it', () => {
    const { pack } = bench({ faction: 'mahact', expansions: ['pok'] });
    const generic = genericNotes(pack, 'me');
    expect(generic).toContain(ALLIANCE);
    const mahact = startForFaction({ promissory: generic }, '', 'mahact', pack);
    expect(mahact.promissory).not.toContain(ALLIANCE);
    expect(startForFaction(mahact, 'mahact', 'sol', pack).promissory).toContain(ALLIANCE);
  });
});
