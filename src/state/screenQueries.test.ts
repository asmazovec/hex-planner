/** The questions of the screens over the kernel's rounds and boards, against the old questions they replaced. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { allTurns, holdingRoundsOf, mergedCountsOf, sliceOwnersOf, spendableOn, structureWarningsOn, upgradeRoundsOf } from '../game/screenQueries';
import { holdingRounds } from '../domain/holdings';
import { mergedCounts } from '../domain/losses';
import { createGame } from '../testing/old/domain/newGame';
import { sliceOwners } from '../testing/old/domain/thundersEdge';
import { entryUpgradeRounds } from '../domain/unitStats';
import type { Entry, Game } from '../domain/types';
import { projectionAtRound, timelineOf as oldTimeline } from '../testing/projection';
import { savedOf } from '../testing/legacySave';
import { boardAt, timelineOf } from './projection';
import { readyResources } from '../testing/old/domain/replay/payment';
import { planetStructureWarnings } from '../testing/old/domain/replay/structures';

const pack = loadPack(['pok']);
const SLOT = '1,0';

function game(): Game {
  const g = createGame({ expansions: ['pok'], playerCount: 4, faction: 'sol' }, pack);
  g.map[SLOT] = '25';
  const planet = pack.tiles['25'].planetIds[0];
  g.planetControl[planet] = 'me';
  g.pds = { [planet]: 3 };
  g.expedition = { slices: { s1: 'me', s2: 'other', s3: null }, thundersEdgeSystem: null };
  const entries: Entry[] = [
    { id: 'a', phase: 'strategy', status: 'done', type: 'strategic', effects: { researched: ['technology:gd', 'technology:sd'] } },
    { id: 'b', phase: 'action', status: 'planned', type: 'component', note: '', gains: ['actionCard:bribery'] },
    { id: 'c', phase: 'action', status: 'done', type: 'adjustment', kind: 'build', label: '', delta: { units: { systemId: SLOT, units: { cruiser: 1 } }, ground: { [planet]: { infantry: 2 } } } },
    { id: 'd', phase: 'action', status: 'planned', type: 'pass', acts: [{ kind: 'expedition', sliceId: 's4', payment: { planets: [], tradeGoods: 0 } }] },
    { id: 'e', phase: 'status', status: 'done', type: 'statusTokens', tactic: 0, fleet: 0, strategy: 0, scored: ['publicObjective:corner'], gains: ['relic:nanoforge'] },
    { id: 'f', phase: 'action', status: 'cancelled', type: 'adjustment', kind: 'build', label: '', delta: { units: { systemId: SLOT, units: { dreadnought: 1 } } } },
  ];
  g.plans[0].rounds[0].entries = entries;
  return g;
}

describe('the questions of the screens, kernel against old', () => {
  const g = game();
  const saved = savedOf(g);
  const round = saved.plans[0].rounds[0];
  const planet = pack.tiles['25'].planetIds[0];

  test('merged counts of a system and kind', () => {
    for (const kind of ['build', 'losses', 'setup'] as const) {
      expect(mergedCountsOf(round, kind, SLOT)).toEqual(mergedCounts(g.plans[0].rounds[0], kind, SLOT));
    }
  });

  test('where the components of each player first appear, and the upgrades the plan researches', () => {
    for (const filter of ['now', 'forecast'] as const) {
      expect(holdingRoundsOf(saved.table, saved.plans[0].rounds, filter)).toEqual(holdingRounds(g.plans[0], filter));
      expect(upgradeRoundsOf(saved.table, saved.plans[0].rounds, filter, pack)).toEqual(entryUpgradeRounds(g.plans[0], filter, pack));
    }
  });

  test('who holds each expedition part', () => {
    expect(sliceOwnersOf(saved)).toEqual(sliceOwners(g, g.plans[0]));
  });

  test('the structure limit of a planet and what the shop can spend, at the end of the round', () => {
    const old = projectionAtRound(oldTimeline(g, g.plans[0], 'forecast', pack), 1).state;
    const line = timelineOf(saved, saved.plans[0].id, 'forecast', pack);
    const board = boardAt(line, 1);
    expect(structureWarningsOn(board, [planet])).toEqual(planetStructureWarnings(old, [planet]));
    expect(structureWarningsOn(board, [planet]).length).toBe(1);
    expect(spendableOn(line.table, board, pack, line.table.viewer)).toBe(readyResources(old, pack, { faction: g.faction }) + old.tradeGoods);
  });

  test('the turns of a round with the actions nested in its cards', () => {
    expect(allTurns(round).map(t => t.id)).toEqual(round.turns.map(t => t.id));
    const nested = { ...round.turns[0], id: 'n' };
    const card = { ...round, turns: [{ ...round.turns[0], action: { kind: 'strategic' as const, nested: [nested] } }] };
    expect(allTurns(card).map(t => t.id)).toEqual([round.turns[0].id, 'n']);
  });
});
