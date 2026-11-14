import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { createGame } from '../domain/newGame';
import { setPlayerFaction } from '../domain/players';
import type { Entry } from '../domain/types';
import { timelineOf } from './projection';
import { legacyKey } from '../game/keys';
import { ownNotes } from '../domain/holdings';
import { legacyNotes, shelfOf, shownOf } from '../game/shelf';

const pack = loadPack(['pok', 'te']);
let game = createGame({ expansions: ['pok', 'te'], playerCount: 3, faction: 'sol' }, pack);
game = setPlayerFaction(game, 1, 'winnu', pack);
const gained = { id: 'g', phase: 'action', status: 'done', type: 'pass', gains: ['actionCard:sabotage1', 'actionCard:sabotage1', 'relic:thetriad'], spends: ['technology:amd'] } as Entry;
game.plans[0].rounds[0].entries = [gained];

describe('the shelf of a player', () => {
  for (const filter of ['now', 'forecast'] as const) {
    test(`is what the old state holds (${filter}), for me and for every rival`, () => {
      const line = timelineOf(game, game.plans[0], filter, pack);
      const { table } = line.kernel;
      const board = line.kernel.end;
      const sorted = (h: ReturnType<typeof shelfOf>) => JSON.parse(JSON.stringify(h, (_k, v) => (Array.isArray(v) ? [...v].sort() : v)));
      for (const p of table.players) {
        const key = legacyKey(table, p.id);
        const old = key === 'me' ? line.end.holdings : line.end.rivals?.[key]?.holdings;
        expect(sorted(shelfOf(table, board, p.id)), key).toEqual(sorted(old!));
      }
    });
  }
});

describe('the notes of a player', () => {
  test('are ownNotes of the old holdings, with a note handed to a rival at the start', () => {
    const g = structuredClone(game);
    const rival = g.opponents[0];
    g.start.opponents[rival.id] = { promissory: ['promissory:<color>_ta@me'] };
    g.start.me = { ...g.start.me, promissory: g.start.me.promissory?.filter(id => id !== 'promissory:<color>_ta@me') };
    const line = timelineOf(g, g.plans[0], 'forecast', pack);
    const { table } = line.kernel;
    const holdings = { me: line.end.holdings, ...Object.fromEntries(Object.entries(line.end.rivals ?? {}).map(([id, s]) => [id, s.holdings])) };
    for (const key of ['me', rival.id]) {
      expect(legacyNotes(table, line.kernel.end, pack, key)).toEqual(ownNotes(g, pack, key, holdings));
    }
  });
});

describe('what the plan screen shows', () => {
  test('shownOf is what the old state says: sheets, docks and PDS, points, laws', () => {
    const line = timelineOf(game, game.plans[0], 'forecast', pack);
    const { table } = line.kernel;
    const shown = shownOf(table, line.kernel.end, pack);
    const count = (s: { docks: string[]; pds: Record<string, number> }) => ({ docks: s.docks.length, pds: Object.values(s.pds).reduce((sum, n) => sum + n, 0) });
    expect(shown.players.me.structures).toEqual(count(line.end));
    expect(shown.players.me.vp).toBe(line.end.vp);
    expect(shown.laws).toEqual(line.end.laws ?? []);
    for (const [id, rival] of Object.entries(line.end.rivals ?? {})) {
      expect(shown.players[id].structures, id).toEqual(count(rival));
      expect(shown.players[id].vp, id).toBe(line.end.opponentVp?.[id] ?? 0);
    }
  });
});
