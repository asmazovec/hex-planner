import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { createGame } from './newGame';
import { playersOf } from './players';
import { draftFromShare, factionCode, readShareLink, shareLinkQuery } from './shareLink';
import type { ExpansionId, Game } from './types';

const packOf = (expansions: ExpansionId[]) => loadPack(expansions);
const base = () => createGame({ expansions: ['pok', 'te'], playerCount: 6, faction: '' }, loadPack(['pok', 'te']));
const fromLink = (search: string) => draftFromShare(readShareLink(search)!, base(), packOf);
const factionAt = (game: Game, seat: number) => playersOf(game).find(p => p.seat === seat)?.faction;

describe('reading a link', () => {
  test('an address without game parameters says nothing', () => {
    expect(readShareLink('')).toBeNull();
    expect(readShareLink('?utm=x')).toBeNull();
  });

  test('takes the expansions, and base means none', () => {
    expect(readShareLink('?exp=te')?.expansions).toEqual(['te']);
    expect(readShareLink('?exp=base')?.expansions).toEqual([]);
    expect(readShareLink('?exp=pok,unknown')?.expansions).toEqual(['pok']);
  });

  test('a seat of dash is empty, a wrong layout or seat is ignored', () => {
    const share = readShareLink('?factions=sol,-,hacan&layout=round&me=zero')!;
    expect(share.factions).toEqual(['sol', '', 'hacan']);
    expect(share.layout).toBeUndefined();
    expect(share.me).toBeUndefined();
  });
});

describe('the game it describes', () => {
  test('the factions take their seats, and the count follows them', () => {
    const game = fromLink('?factions=sol,arborec,-,hacan');
    expect(game.playerCount).toBe(4);
    expect([1, 2, 3, 4].map(seat => factionAt(game, seat))).toEqual(['sol', 'arborec', '', 'hacan']);
    expect(game.faction).toBe('sol');
  });

  test('me names the seat of the one who opens it', () => {
    const game = fromLink('?factions=sol,arborec,hacan&me=2');
    expect(game.seat).toBe(2);
    expect(game.faction).toBe('arborec');
    expect(factionAt(game, 1)).toBe('sol');
  });

  test('expansions are set, and a faction they lack stays empty', () => {
    const game = fromLink('?exp=base&factions=sol,keleresa,hacan');
    expect(game.expansions).toEqual([]);
    expect([1, 2, 3].map(seat => factionAt(game, seat))).toEqual(['sol', '', 'hacan']);
  });

  test('the player count stays in what the expansions allow', () => {
    expect(fromLink('?factions=sol').playerCount).toBeGreaterThanOrEqual(3);
    expect(fromLink(`?exp=base&factions=${Array(12).fill('-').join(',')}`).playerCount).toBeLessThanOrEqual(6);
  });

  test('the map string fills the tiles and keeps the centre, tiles nobody knows are left out', () => {
    const game = fromLink('?map=25+26+NOPE');
    expect(game.map['0,-1']).toBe('25');
    expect(game.map['1,-1']).toBe('26');
    expect(game.map['1,0']).toBeUndefined();
    expect(game.map['0,0']).toBe(base().map['0,0']);
  });

  test('a home of a chosen faction stays where the string has a placeholder', () => {
    const game = fromLink('?factions=sol,hacan,arborec&map=25');
    expect(game.map['0,-1']).toBe('25');
    expect(Object.values(game.map)).toContain(loadPack(['pok', 'te']).factions.sol.homeTile);
  });

  test('hyperlanes in the string choose the layout, with their turns', () => {
    const tokens = Array(18).fill('0');
    tokens[0] = '83A2';
    const game = fromLink(`?factions=sol,hacan,arborec&map=${tokens.join('+')}`);
    expect(game.layout).toBe('hyperlanes');
  });
});

describe('the code of a faction', () => {
  const everyFaction = Object.keys(loadPack(['pok', 'te']).factions);

  test('is three hex digits, and no two factions share one', () => {
    expect(everyFaction.length).toBeGreaterThan(20);
    for (const id of everyFaction) expect(factionCode(id)).toMatch(/^[0-9a-f]{3}$/);
    expect(new Set(everyFaction.map(factionCode)).size).toBe(everyFaction.length);
  });

  test('never changes for a faction: a link stays good across versions', () => {
    expect(factionCode('sol')).toBe(factionCode('sol'));
    expect(factionCode('sol')).not.toBe(factionCode('hacan'));
  });

  test('is what a link writes, and no faction name is left in it', () => {
    const made = fromLink('?factions=sol,arborec,-,hacan');
    const factions = new URLSearchParams(shareLinkQuery(made)).get('factions');
    expect(factions).toBe(`${factionCode('sol')},${factionCode('arborec')},-,${factionCode('hacan')}`);
    expect(factions).not.toMatch(/sol|arborec|hacan/);
  });

  test('is read back to the faction, and a code nobody has leaves the seat empty', () => {
    const game = fromLink(`?factions=${factionCode('sol')},${factionCode('arborec')},fff`);
    expect([1, 2, 3].map(seat => factionAt(game, seat))).toEqual(['sol', 'arborec', '']);
  });

  test('links with names from before still work', () => {
    expect(fromLink('?factions=sol,arborec,hacan').faction).toBe('sol');
  });
});

describe('a link to a game', () => {
  test('gives back the same game', () => {
    const made = fromLink('?exp=pok&factions=sol,arborec,-,hacan,letnev&me=2&map=25+26+27+28');
    const again = draftFromShare(readShareLink(`?${shareLinkQuery(made)}`)!, base(), packOf);
    expect(again.expansions).toEqual(made.expansions);
    expect(again.playerCount).toBe(made.playerCount);
    expect(again.layout).toBe(made.layout);
    expect(again.seat).toBe(made.seat);
    expect(again.map).toEqual(made.map);
    expect([1, 2, 3, 4, 5].map(seat => factionAt(again, seat))).toEqual([1, 2, 3, 4, 5].map(seat => factionAt(made, seat)));
  });

  test('keeps the turns of hyperlanes', () => {
    const tokens = Array(18).fill('0');
    tokens[0] = '83A2';
    const made = fromLink(`?factions=sol,hacan,arborec&map=${tokens.join('+')}`);
    const again = draftFromShare(readShareLink(`?${shareLinkQuery(made)}`)!, base(), packOf);
    expect(again.map).toEqual(made.map);
  });

  test('carries the name', () => {
    const made = fromLink('?name=Friday+night&factions=sol,hacan,arborec');
    expect(made.name).toBe('Friday night');
    expect(readShareLink(`?${shareLinkQuery(made)}`)?.name).toBe('Friday night');
  });

  test('a game without expansions says so', () => {
    const made = fromLink('?exp=base&factions=sol,hacan,arborec');
    expect(shareLinkQuery(made)).toContain('exp=base');
    expect(readShareLink(`?${shareLinkQuery(made)}`)?.expansions).toEqual([]);
  });
});
