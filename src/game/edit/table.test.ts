/** The table edits against the old edits of `Game` they replace. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { createGame } from '../../domain/newGame';
import type { Game } from '../../domain/types';
import { savedOf } from '../../storage/legacySave';
import { withName, withTile } from './table';

const pack = loadPack(['pok']);
const base = (): Game => createGame({ expansions: ['pok'], playerCount: 4, faction: 'sol' }, pack, p => `${p}-1`);

describe('name and tiles', () => {
  test('a name is trimmed, kept, and taken away by an empty one', () => {
    const g = base();
    const s = savedOf(g);
    expect(withName(s, '  Friday ')).toEqual(savedOf({ ...g, name: 'Friday' }));
    const named = withName(s, 'Friday');
    expect(withName(named, 'Friday ')).toBe(named);
    expect(withName(named, ' ')).toEqual(s);
    expect(withName(s, '')).toBe(s);
  });
  test('a tile is set on a slot and taken off it', () => {
    const g = base();
    const s = savedOf(g);
    const set = withTile(s, '1,-1', '26');
    expect(set).toEqual(savedOf({ ...g, map: { ...g.map, '1,-1': '26' } }));
    expect(withTile(set, '1,-1', '26')).toBe(set);
    expect(withTile(set, '1,-1', null)).toEqual(s);
    expect(withTile(s, '2,2', null)).toBe(s);
  });
});
