/**
 * A planet a play gains is taken as a landing takes it (one path, `gainedPlanet` of `invasion.ts`): the hooks of the
 * gain run, and a play of a rival's entry changes that rival's planets, not the viewer's.
 */
import { describe, expect, test } from 'vitest';
import type { Opponent } from '../../domain/types';
import { adjust, bench, componentAction, endOf } from '../../domain/effects/components/kit';

const RIVAL: Opponent = { id: 'o1', faction: 'sol', vp: 0, seat: 2, color: 2 };

describe('a planet gained by a play', () => {
  // Assimilate (L1Z1X): "When you gain control of a planet: Replace each PDS and space dock that is on that planet with a
  // matching unit from your reinforcements." The planet is gained by Maxis Central Control, not by a landing.
  test('runs the onGainControl hooks as a landing does (Faunus gained by the L1Z1X: the structures of the rival become theirs)', () => {
    const play = componentAction('legendary:faunus', { choices: { faunusPlanet: 't1' } });
    const table = bench({
      faction: 'l1z1x', expansions: ['pok', 'te'], entries: [play],
      game: { opponents: [RIVAL], planetControl: { t1: 'enemy' }, planetOwner: { t1: 'o1' }, pds: { t1: 1 }, docks: ['t1'] },
    });
    const end = endOf(table);
    expect(end.control.t1).toBe('me');
    expect(end.pds.t1).toBe(1);
    expect(end.docks).toContain('t1');
    expect(end.rivals?.o1.pds.t1 ?? 0).toBe(0);
  });

  // Scavenge (Saar): "After you gain control of a planet: Gain 1 trade good."
  test('the trade goods a component adds with a planet gained (Scavenge) come with it, and only for the Saar', () => {
    const play = componentAction('legendary:faunus', { choices: { faunusPlanet: 't1' } });
    const goods = (faction: string): number => endOf(bench({ faction, expansions: ['pok', 'te'], entries: [play] })).tradeGoods;
    expect(goods('saar')).toBe(goods('sol') + 1);
  });
});

describe('Mercenary Contract in a rival\'s entry', () => {
  // "... place 2 neutral infantry on any non-home planet that contains no units": the planet the rival held is no longer theirs.
  test('removes the planet from that rival and leaves the viewer\'s planets as they are', () => {
    const id = 'actionCard:mercenarycontract';
    const play = componentAction(id, { choices: { planet: 't1' }, owner: 'o1' });
    const table = bench({
      faction: 'sol', expansions: ['te'], entries: [adjust({ tradeGoods: 3 }), play],
      start: { hand: [id] },
      game: { opponents: [RIVAL], planetControl: { t1: 'enemy', t2: 'me' }, planetOwner: { t1: 'o1' } },
    });
    const end = endOf(table);
    expect(end.control.t2).toBe('me');
    expect(end.control.t1).not.toBe('me');
    expect(end.rivals?.o1.control.t1).not.toBe('me');
  });
});
