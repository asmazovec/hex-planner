import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { createGame } from '../domain/newGame';
import { CURRENT_SCHEMA, parseGame, SAVE_FORMAT } from './schema';
import type { Game } from '../domain/types';
import { exportGame, importGame } from './transfer';
import { oldFormatSave, sampleGame } from './fixture';

const game = sampleGame();

test('экспорт и импорт туда и обратно', () => {
  expect(importGame(exportGame(game))).toEqual({ ok: true, game });
});

test('a new game goes to a file and back as it is', () => {
  const pack = loadPack(['pok', 'te']);
  const fresh = createGame({ expansions: ['pok', 'te'], playerCount: 6, faction: 'sol' }, pack);
  expect(importGame(exportGame(fresh))).toEqual({ ok: true, game: fresh });
});

test('a promissory note addressed to its player (`@`) goes to a file and back: held, handed over, played', () => {
  const pack = loadPack(['pok']);
  const fresh = createGame({ expansions: ['pok'], playerCount: 3, faction: 'sol' }, pack);
  const rival = fresh.opponents[0].id;
  const theirs = `promissory:<color>_ta@${rival}`;
  expect(fresh.start.opponents[rival].promissory).toContain(theirs);
  const played: Game = {
    ...fresh,
    plans: [{ ...fresh.plans[0], rounds: [{ number: 1, strategyCard: null, backupCard: null, entries: [
      { id: 'e1', phase: 'action', status: 'planned', type: 'pass', acts: [{ kind: 'transaction', with: rival, give: { components: ['promissory:ms@me'] }, get: { components: [theirs] } }] },
      { id: 'e2', phase: 'action', status: 'planned', type: 'component', componentId: theirs, note: '', gains: [theirs], spends: [theirs] },
    ] }] }],
  };
  expect(importGame(exportGame(played))).toEqual({ ok: true, game: played });
});

test('a new game is written with the format mark and schema version 1', () => {
  const fresh = createGame({ expansions: [], playerCount: 3, faction: 'sol' }, loadPack([]));
  expect(fresh.format).toBe('ti4-planner/2');
  expect(fresh.format).toBe(SAVE_FORMAT);
  expect(fresh.schemaVersion).toBe(1);
  expect(CURRENT_SCHEMA).toBe(1);
  expect(JSON.parse(exportGame(fresh))).toMatchObject({ format: 'ti4-planner/2', schemaVersion: 1 });
});

describe('a file of an earlier version of the app', () => {
  test('a file without the format mark is refused as saved by an earlier version', () => {
    const { game: old } = oldFormatSave();
    expect(importGame(JSON.stringify(old))).toEqual({ ok: false, reason: 'oldFormat' });
    expect(importGame('{}')).toEqual({ ok: false, reason: 'oldFormat' });
    expect(importGame('{"schemaVersion":1}')).toEqual({ ok: false, reason: 'oldFormat' });
  });

  test('so is a file with another format mark, whatever its schema version', () => {
    for (const schemaVersion of [1, 6, 99]) {
      expect(importGame(JSON.stringify({ ...game, format: 'ti4-planner/1', schemaVersion }))).toEqual({ ok: false, reason: 'oldFormat' });
    }
  });
});

test('a file whose format mark is of a later version of the app is refused as newer, not as earlier', () => {
  for (const format of ['ti4-planner/3', 'ti4-planner/10']) {
    expect(importGame(JSON.stringify({ ...game, format }))).toEqual({ ok: false, reason: 'newerVersion' });
    expect(parseGame({ ...game, format })).toMatchObject({ ok: false, kind: 'newerVersion' });
  }
  // Only a whole number after the name of the app is a version of the format.
  for (const format of ['ti4-planner/2.5', 'ti4-planner/x', 'ti4-planner/', 'other/3', 3]) {
    expect(importGame(JSON.stringify({ ...game, format }))).toEqual({ ok: false, reason: 'oldFormat' });
  }
});

describe('the seats of a file agree with its count of players', () => {
  const four = sampleGame();
  const seated = (seats: number[]) => ({ ...four, opponents: four.opponents.map((o, i) => ({ ...o, seat: seats[i] })) });

  test('the sample is in order: four players on seats 1 to 4', () => {
    expect([four.playerCount, four.seat, ...four.opponents.map(o => o.seat)]).toEqual([4, 1, 2, 3, 4]);
    expect(importGame(exportGame(four)).ok).toBe(true);
  });

  test('two players on one seat: the file is damaged', () => {
    expect(importGame(JSON.stringify(seated([2, 2, 4])))).toEqual({ ok: false, reason: 'invalidSchema' });
    expect(importGame(JSON.stringify(seated([1, 3, 4])))).toEqual({ ok: false, reason: 'invalidSchema' });
    expect(parseGame(seated([2, 2, 4]))).toMatchObject({ ok: false, kind: 'damaged' });
  });

  test('a seat outside 1..N: the file is damaged', () => {
    expect(importGame(JSON.stringify(seated([2, 3, 5])))).toEqual({ ok: false, reason: 'invalidSchema' });
    expect(importGame(JSON.stringify(seated([0, 3, 4])))).toEqual({ ok: false, reason: 'invalidSchema' });
    expect(importGame(JSON.stringify({ ...four, seat: 5 }))).toEqual({ ok: false, reason: 'invalidSchema' });
    expect(importGame(JSON.stringify({ ...four, seat: 0 }))).toEqual({ ok: false, reason: 'invalidSchema' });
  });

  test('a count of players that is not the opponents and me: the file is damaged', () => {
    expect(importGame(JSON.stringify({ ...four, playerCount: 6 }))).toEqual({ ok: false, reason: 'invalidSchema' });
    expect(importGame(JSON.stringify({ ...four, playerCount: 3 }))).toEqual({ ok: false, reason: 'invalidSchema' });
    expect(importGame(JSON.stringify({ ...four, opponents: four.opponents.slice(0, 2) }))).toEqual({ ok: false, reason: 'invalidSchema' });
  });
});

test('отказ на повреждённом файле и файле новее схемы', () => {
  expect(importGame('{oops')).toEqual({ ok: false, reason: 'invalidJson' });
  expect(importGame(exportGame({ ...game, schemaVersion: 99 }))).toEqual({ ok: false, reason: 'newerVersion' });
});

test('a file with a part that is no part of a game is refused as damaged, the import does not throw', () => {
  for (const opponents of [[null], [1, 'x'], [[]], 'none']) {
    const text = JSON.stringify({ ...game, opponents });
    expect(() => importGame(text)).not.toThrow();
    expect(importGame(text)).toEqual({ ok: false, reason: 'invalidSchema' });
  }
});

describe('схема', () => {
  test.each(['null', '[]', '"x"', '5'])('не-игра %s отклоняется', text => {
    expect(importGame(text)).toEqual({ ok: false, reason: 'invalidSchema' });
  });

  test.each([-3, 0, 0.5])('недопустимая версия схемы %s отклоняется', v => {
    expect(importGame(JSON.stringify({ ...game, schemaVersion: v }))).toEqual({ ok: false, reason: 'invalidSchema' });
  });

  test('запись неизвестного вида отклоняется', () => {
    const bad = structuredClone(game);
    (bad.plans[0].rounds[0].entries[0] as { type: string }).type = 'bogus';
    expect(importGame(JSON.stringify(bad))).toEqual({ ok: false, reason: 'invalidSchema' });
  });

  test('an expedition is an act of a turn: an entry of its own is refused', () => {
    const bad = structuredClone(game) as unknown as { plans: { rounds: { entries: unknown[] }[] }[] };
    bad.plans[0].rounds[0].entries.push({ id: 'x', phase: 'action', status: 'planned', type: 'expedition', sliceId: null, payment: { planets: [], tradeGoods: 0 } });
    expect(importGame(JSON.stringify(bad))).toEqual({ ok: false, reason: 'invalidSchema' });
  });

  test('неизвестный юнит и отрицательное число отклоняются', () => {
    const bad = structuredClone(game);
    bad.enemyUnits = { '1,0': { o: { spaceship: 1 } as never } };
    expect(importGame(JSON.stringify(bad)).ok).toBe(false);
    const neg = structuredClone(game);
    neg.enemyUnits = { '1,0': { o: { fighter: -1 } } };
    expect(importGame(JSON.stringify(neg)).ok).toBe(false);
    expect(importGame(JSON.stringify({ ...game, enemyUnits: 5 })).ok).toBe(false);
  });
});

describe('раскладка карты', () => {
  test('файл без раскладки и с неизвестной раскладкой отклоняется', () => {
    const withoutLayout = JSON.parse(exportGame(game)) as Record<string, unknown>;
    delete withoutLayout.layout;
    expect(importGame(JSON.stringify(withoutLayout))).toEqual({ ok: false, reason: 'invalidSchema' });
    expect(importGame(JSON.stringify({ ...withoutLayout, layout: 'lanes' }))).toEqual({ ok: false, reason: 'invalidSchema' });
  });

  test('раскладка с гиперпутями сохраняется при экспорте', () => {
    const lanes = { ...game, layout: 'hyperlanes' as const };
    expect(importGame(exportGame(lanes))).toEqual({ ok: true, game: lanes });
  });
});

test('seats, colours and points survive export and import', () => {
  const game = sampleGame();
  const moved = { ...game, seat: 3, color: 1, vp: 2, opponents: game.opponents.map((o, i) => ({ ...o, seat: i === 1 ? 1 : i + 2, color: 8 - i })) };
  const result = importGame(exportGame(moved));
  expect(result.ok && result.game.seat).toBe(3);
  expect(result.ok && result.game.vp).toBe(2);
  expect(result.ok && result.game.opponents.map(o => [o.seat, o.color])).toEqual(moved.opponents.map(o => [o.seat, o.color]));
});

test('a seat or a count of players that is no number is refused', () => {
  const doc = JSON.parse(exportGame(sampleGame()));
  doc.opponents[0].seat = 'two';
  expect(importGame(JSON.stringify(doc))).toEqual({ ok: false, reason: 'invalidSchema' });
  expect(importGame(JSON.stringify({ ...sampleGame(), playerCount: 'four' }))).toEqual({ ok: false, reason: 'invalidSchema' });
});

test('owners of enemy units and planets survive export and import', () => {
  const owned = { ...game, planetOwner: { arc: game.opponents[1].id }, planetControl: { arc: 'enemy' as const } };
  expect(importGame(exportGame(owned))).toEqual({ ok: true, game: owned });
});

test('holdings survive a round trip, entries included, and a bad leader state is refused', () => {
  const game = sampleGame();
  const opponent = game.opponents[0].id;
  const marked = { ...game, start: { me: { technologies: ['technology:cv2'], hand: ['actionCard:bribery', 'actionCard:bribery'], leaders: { 'leader:solagent': 'exhausted' as const }, breakthrough: 'held' as const }, opponents: { [opponent]: { technologies: ['technology:ff2'], relics: ['relic:nanoforge'] } } } };
  marked.plans[0].rounds[0].entries[1] = { id: 'e2', phase: 'strategy', status: 'done', type: 'strategic', effects: { researched: ['technology:cr2'] }, gains: ['actionCard:abs'], spends: ['actionCard:bribery'] };
  marked.plans[0].rounds[0].entries[2] = { id: 'e3', phase: 'action', status: 'planned', type: 'component', componentId: 'leader:solagent', note: '', choices: { planet: 'jord', count: 2 } };
  marked.plans[0].rounds[0].entries[3] = { id: 'e4', phase: 'status', status: 'planned', type: 'statusTokens', tactic: 1, fleet: 1, strategy: 0, scored: ['publicObjective:corner'] };
  expect(importGame(exportGame(marked))).toEqual({ ok: true, game: marked });
  expect(importGame(JSON.stringify({ ...game, start: { me: { leaders: { 'leader:solagent': 'asleep' } }, opponents: {} } })).ok).toBe(false);
  expect(importGame(JSON.stringify({ ...game, start: undefined })).ok).toBe(false);
});

test('a card entry with its effects and a free tactical survive export and import', () => {
  const game = sampleGame();
  game.plans[0].rounds[0].entries.push({
    id: 'card', phase: 'action', status: 'planned', type: 'strategic', card: 6, forToken: true,
    effects: {
      tokens: { tactic: -1, fleet: 1 }, boughtTokens: 1, systemId: '1,0', readied: ['jord'], speaker: 'a', freeSecondary: ['a'], mecatol: true,
      production: { systemId: '1,0', units: { cruiser: 1 } }, structures: [{ kind: 'pds', planetId: 'jord' }], payment: { planets: ['jord'], tradeGoods: 1 },
    },
  }, {
    id: 'free', phase: 'action', status: 'planned', type: 'tactical', systemId: '1,0', moves: [], landings: [], production: {},
    payment: { planets: [], tradeGoods: 0 }, free: true, fromCard: 'card',
  });
  expect(importGame(exportGame(game))).toEqual({ ok: true, game });
});

test('the acts of a turn survive export and import', () => {
  const game = sampleGame();
  const rival = game.opponents[0].id;
  game.plans[0].rounds[0].entries = [{
    id: 'c', phase: 'action', status: 'planned', type: 'component', note: '',
    acts: [{ kind: 'transaction', with: rival, give: { tradeGoods: 2 }, get: { components: ['promissory:war_funding'] } }, { kind: 'expedition', sliceId: 'tg3', payment: { planets: [], tradeGoods: 0 } }],
  }];
  expect(importGame(exportGame(game))).toEqual({ ok: true, game });
});

test('the points of a status entry survive export and import', () => {
  const game = sampleGame();
  const opponent = game.opponents[0].id;
  game.plans[0].rounds[0].entries = [{
    id: 's', phase: 'status', status: 'planned', type: 'statusTokens', tactic: 1, fleet: 0, strategy: 0, vp: 2, opponentVp: { [opponent]: 1 },
  }];
  const result = importGame(exportGame(game));
  expect(result.ok && result.game.plans[0].rounds[0].entries[0]).toMatchObject({ vp: 2, opponentVp: { [opponent]: 1 } });
});

describe('PDS in saved games', () => {
  test('a file with PDS keeps them', () => {
    const game = { ...sampleGame(), pds: { jord: 2 } };
    expect(importGame(exportGame(game))).toEqual({ ok: true, game });
  });

  test('a bad PDS count is refused', () => {
    expect(importGame(JSON.stringify({ ...sampleGame(), pds: { jord: -1 } })).ok).toBe(false);
  });

  test('an adjustment may hold negative units and ground by planet, and its kind stays', () => {
    const game = sampleGame();
    game.plans[0].rounds[0].entries.push({
      id: 'e9', phase: 'action', status: 'planned', type: 'adjustment', label: '', kind: 'losses',
      delta: { units: { systemId: '1,0', units: { carrier: -1 } }, ground: { jord: { infantry: -2 } } },
    });
    expect(importGame(exportGame(game))).toEqual({ ok: true, game });
  });

  test('an adjustment by hand has no kind, and an unknown kind is refused', () => {
    const game = sampleGame();
    expect(importGame(exportGame(game)).ok).toBe(true);
    const bad = structuredClone(game) as unknown as { plans: { rounds: { entries: Record<string, unknown>[] }[] }[] };
    bad.plans[0].rounds[0].entries.find(e => e.type === 'adjustment')!.kind = 'magic';
    expect(importGame(JSON.stringify(bad)).ok).toBe(false);
  });
});

describe('enemy ground units by planet', () => {
  test('a file with them is left alone, and a bad count refused', () => {
    const game = { ...sampleGame(), enemyGround: { arc: { o: { infantry: 2 } } } };
    expect(importGame(exportGame(game))).toEqual({ ok: true, game });
    expect(importGame(JSON.stringify({ ...game, enemyGround: { arc: { o: { infantry: -1 } } } })).ok).toBe(false);
  });

  test('production on a planet stays through export', () => {
    const game = sampleGame();
    const first = game.plans[0].rounds[0].entries[0];
    if (first.type === 'tactical') first.productionGround = { a: { infantry: 1 } };
    expect(importGame(exportGame(game))).toEqual({ ok: true, game });
  });
});

describe('routes in a saved game', () => {
  const withMoves = (moves: unknown[]) => {
    const doc = structuredClone(game) as unknown as { plans: { rounds: { entries: unknown[] }[] }[] };
    doc.plans[0].rounds[0].entries = [{ id: 'r', phase: 'action', status: 'planned', type: 'tactical', systemId: '0,1', moves, landings: [], production: {}, payment: { planets: [], tradeGoods: 0 } }];
    return JSON.stringify(doc);
  };
  const movesOf = (result: ReturnType<typeof importGame>) => {
    if (!result.ok) throw new Error('not imported');
    return (result.game.plans[0].rounds[0].entries[0] as { moves: unknown[] }).moves;
  };

  test('a move from a neighbour has no way written down', () => {
    const moves = [{ from: '1,0', units: { carrier: 1 } }];
    expect(movesOf(importGame(withMoves(moves)))).toEqual(moves);
  });

  test('the way and the pickups of a route survive saving', () => {
    const moves = [{ from: '1,0', units: { carrier: 1 }, via: ['1,1'] }, { from: '1,1', units: { fighter: 1 }, pickupOf: '1,0' }];
    expect(movesOf(importGame(withMoves(moves)))).toEqual(moves);
  });
});

test('an open Fracture with its systems survives export and import', () => {
  const open = { ...sampleGame(), fracture: { active: true, ingress: ['1,0'], seat: 2, tiles: { '5,-5': 'fracture1' } } };
  expect(importGame(exportGame(open))).toEqual({ ok: true, game: open });
  const { seat, ...noSeat } = open.fracture;
  void seat;
  expect(importGame(JSON.stringify({ ...open, fracture: noSeat }))).toEqual({ ok: false, reason: 'invalidSchema' });
});
