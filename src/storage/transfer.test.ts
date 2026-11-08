import { describe, expect, test } from 'vitest';
import { loadPack } from '../data/loadPack';
import { CURRENT_SCHEMA, exportGame, importGame, migrate } from './transfer';
import { gameOfSchema1, sampleGame } from './fixture';

const game = sampleGame();

test('экспорт и импорт туда и обратно', () => {
  expect(importGame(exportGame(game))).toEqual({ ok: true, game });
});

test('a file a migration chokes on is refused as damaged, the import does not throw', () => {
  for (const opponents of [[null], [1, 'x'], [[]]]) {
    const text = JSON.stringify({ ...gameOfSchema1(), opponents });
    expect(() => importGame(text)).not.toThrow();
    expect(importGame(text)).toEqual({ ok: false, reason: 'invalidSchema' });
  }
});

test('отказ на повреждённом файле и файле новее схемы', () => {
  expect(importGame('{oops')).toEqual({ ok: false, reason: 'invalidJson' });
  expect(importGame('{"schemaVersion":1}')).toEqual({ ok: false, reason: 'invalidSchema' });
  expect(importGame(exportGame({ ...game, schemaVersion: 99 }))).toEqual({ ok: false, reason: 'newerVersion' });
});

describe('схема', () => {
  test.each(['null', '[]', '"x"', '{}'])('не-игра %s отклоняется', text => {
    expect(importGame(text)).toEqual({ ok: false, reason: 'invalidSchema' });
  });

  test.each([-3, 0.5])('недопустимая версия схемы %s отклоняется', v => {
    expect(importGame(JSON.stringify({ ...game, schemaVersion: v }))).toEqual({ ok: false, reason: 'invalidSchema' });
  });

  test('запись неизвестного вида отклоняется', () => {
    const bad = structuredClone(game);
    (bad.plans[0].rounds[0].entries[0] as { type: string }).type = 'bogus';
    expect(importGame(JSON.stringify(bad))).toEqual({ ok: false, reason: 'invalidSchema' });
  });

  test('неизвестный юнит и отрицательное число отклоняются', () => {
    const bad = structuredClone(game);
    bad.enemyUnits = { '1,0': { o: { spaceship: 1 } as never } };
    expect(importGame(JSON.stringify(bad)).ok).toBe(false);
    const neg = structuredClone(game);
    neg.enemyUnits = { '1,0': { o: { fighter: -1 } } };
    expect(importGame(JSON.stringify(neg)).ok).toBe(false);
  });
});

test('миграция применяется к старой схеме', () => {
  const old = { ...gameOfSchema1(), schemaVersion: 0 };
  expect(migrate(old)).toMatchObject({ schemaVersion: CURRENT_SCHEMA });
  expect(importGame(JSON.stringify(old))).toMatchObject({ ok: true, game: { schemaVersion: CURRENT_SCHEMA } });
});

describe('раскладка карты', () => {
  test('файл без раскладки читается как обычная, а неизвестная раскладка отклоняется', () => {
    const withoutLayout = JSON.parse(exportGame(game)) as Record<string, unknown>;
    delete withoutLayout.layout;
    expect(importGame(JSON.stringify(withoutLayout))).toMatchObject({ ok: true, game: { layout: 'standard' } });
    expect(importGame(JSON.stringify({ ...withoutLayout, layout: 'lanes' })).ok).toBe(false);
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

test('a file from before seats gets them in list order', () => {
  const { seat, color, vp, opponents, ...rest } = gameOfSchema1();
  void seat; void color; void vp;
  const old = { ...rest, opponents: (opponents as { faction: string; vp: number }[]).map(({ faction, vp: points }) => ({ faction, vp: points })) };
  const result = importGame(JSON.stringify(old));
  expect(result.ok && [result.game.seat, result.game.color, result.game.vp]).toEqual([1, 1, 0]);
  expect(result.ok && result.game.opponents.map(o => [o.seat, o.color])).toEqual([[2, 2], [3, 3], [4, 4]]);
});

describe('owners of enemy units and planets', () => {
  const imported = (file: unknown) => {
    const result = importGame(JSON.stringify(file));
    if (!result.ok) throw new Error(result.reason);
    return result.game;
  };

  test('a new game is written at the current schema', () => {
    expect(sampleGame().schemaVersion).toBe(CURRENT_SCHEMA);
  });

  test('a version 1 file: opponents get ids, old units and enemy planets go to the first opponent', () => {
    const { opponents, enemyUnits, planetControl, planetOwner, schemaVersion } = imported(gameOfSchema1());
    expect(schemaVersion).toBe(CURRENT_SCHEMA);
    const ids = opponents.map(o => o.id);
    expect(new Set(ids).size).toBe(3);
    expect(ids.every(id => id.length > 0)).toBe(true);
    expect(enemyUnits).toEqual({ '1,0': { [ids[0]]: { dreadnought: 2 } }, '0,1': { [ids[0]]: { fighter: 3 } } });
    expect(planetControl).toEqual({ jord: 'me', arc: 'enemy', lazar: 'enemy' });
    expect(planetOwner).toEqual({ arc: ids[0], lazar: ids[0] });
  });

  test('the ids come out the same every time, because a migrated game is only saved after its next edit', () => {
    expect(imported(gameOfSchema1()).opponents).toEqual(imported(gameOfSchema1()).opponents);
  });

  test('a version 1 game without opponents drops its enemy units', () => {
    const game = imported({ ...gameOfSchema1(), opponents: [] });
    expect(game.enemyUnits).toEqual({});
    expect(game.planetOwner).toEqual({});
  });

  test('a current file is left alone by the migration', () => {
    const owned = { ...game, planetOwner: { arc: game.opponents[1].id }, planetControl: { arc: 'enemy' as const } };
    expect(importGame(exportGame(owned))).toEqual({ ok: true, game: owned });
  });

  test('a version 1 file with a bad unit is still refused after the move', () => {
    expect(importGame(JSON.stringify({ ...gameOfSchema1(), enemyUnits: { '1,0': { spaceship: 1 } } })).ok).toBe(false);
    expect(importGame(JSON.stringify({ ...gameOfSchema1(), enemyUnits: { '1,0': { fighter: -1 } } })).ok).toBe(false);
    expect(importGame(JSON.stringify({ ...gameOfSchema1(), enemyUnits: 5 })).ok).toBe(false);
  });
});

describe('upgrades in saved games', () => {
  test('a version 2 file gets empty upgrades', () => {
    const { upgrades: dropped, ...rest } = sampleGame();
    void dropped;
    const result = importGame(JSON.stringify({ ...rest, schemaVersion: 2 }));
    expect(result).toMatchObject({ ok: true, game: { schemaVersion: CURRENT_SCHEMA, upgrades: { me: [], opponents: {} } } });
  });

  test('a version 1 file goes all the way', () => {
    const { upgrades: dropped, ...rest } = gameOfSchema1();
    void dropped;
    expect(importGame(JSON.stringify(rest))).toMatchObject({ ok: true, game: { schemaVersion: CURRENT_SCHEMA, upgrades: { me: [], opponents: {} } } });
  });

  test('upgrades survive a round trip, entries included, and a bad unit is refused', () => {
    const game = sampleGame();
    const opponent = game.opponents[0].id;
    const marked = { ...game, upgrades: { me: ['carrier' as const], opponents: { [opponent]: ['fighter' as const] } } };
    marked.plans[0].rounds[0].entries[1] = { id: 'e2', phase: 'strategy', status: 'done', type: 'strategic', upgrades: ['cruiser'] };
    expect(importGame(exportGame(marked))).toEqual({ ok: true, game: marked });
    expect(importGame(JSON.stringify({ ...game, upgrades: { me: ['spaceship'], opponents: {} } })).ok).toBe(false);
  });
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
  const version3 = () => {
    const { pds: dropped, ...rest } = sampleGame();
    void dropped;
    return { ...rest, schemaVersion: 3 };
  };

  test('a version 3 file gets no PDS and comes up to the current schema', () => {
    expect(CURRENT_SCHEMA).toBe(5);
    expect(importGame(JSON.stringify(version3()))).toMatchObject({ ok: true, game: { schemaVersion: CURRENT_SCHEMA, pds: {} } });
  });

  test('a version 1 file goes all the way', () => {
    expect(importGame(JSON.stringify(gameOfSchema1()))).toMatchObject({ ok: true, game: { pds: {} } });
  });

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

  test('an old adjustment without a kind stays valid, and an unknown kind is refused', () => {
    const game = sampleGame();
    expect(importGame(exportGame(game)).ok).toBe(true);
    const bad = structuredClone(game) as unknown as { plans: { rounds: { entries: Record<string, unknown>[] }[] }[] };
    bad.plans[0].rounds[0].entries.find(e => e.type === 'adjustment')!.kind = 'magic';
    expect(importGame(JSON.stringify(bad)).ok).toBe(false);
  });
});


describe('enemy ground units by planet', () => {
  const tile = '26';
  const planetOf = (id: string) => loadPack(['pok']).tiles[id].planetIds[0];
  const version = (schemaVersion: number) => {
    const { pds, enemyGround, ...rest } = sampleGame();
    void enemyGround;
    const opponent = rest.opponents[0].id;
    return {
      ...rest, schemaVersion, opponent,
      ...(schemaVersion === 4 ? { pds } : {}),
      map: { ...rest.map, '1,0': tile, '0,1': '39' },
      enemyUnits: { '1,0': { [opponent]: { cruiser: 1, infantry: 2, mech: 1 } }, '0,1': { [opponent]: { infantry: 3 } } },
    };
  };

  test.each([3, 4])('a version %i file moves them to the first planet of the system, or leaves them in space without one', v => {
    const doc = version(v);
    const result = importGame(JSON.stringify(doc));
    if (!result.ok) throw new Error(result.reason);
    expect(result.game.schemaVersion).toBe(CURRENT_SCHEMA);
    expect(result.game.enemyGround).toEqual({ [planetOf(tile)]: { [doc.opponent]: { infantry: 2, mech: 1 } } });
    expect(result.game.enemyUnits).toEqual({ '1,0': { [doc.opponent]: { cruiser: 1 } }, '0,1': { [doc.opponent]: { infantry: 3 } } });
  });

  test('a version 1 file goes all the way', () => {
    const doc = { ...gameOfSchema1(), map: { '1,0': tile }, enemyUnits: { '1,0': { infantry: 2 } } };
    const result = importGame(JSON.stringify(doc));
    if (!result.ok) throw new Error(result.reason);
    expect(result.game.enemyGround).toEqual({ [planetOf(tile)]: { [result.game.opponents[0].id]: { infantry: 2 } } });
    expect(result.game.enemyUnits).toEqual({});
  });

  test('a current file with them is left alone, and a bad count refused', () => {
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

  test('a save from before routes loads as it is', () => {
    const moves = [{ from: '1,0', units: { carrier: 1 } }];
    expect(movesOf(importGame(withMoves(moves)))).toEqual(moves);
  });

  test('the way and the pickups of a route survive saving', () => {
    const moves = [{ from: '1,0', units: { carrier: 1 }, via: ['1,1'] }, { from: '1,1', units: { fighter: 1 }, pickupOf: '1,0' }];
    expect(movesOf(importGame(withMoves(moves)))).toEqual(moves);
  });
});

describe('seats of an imported file', () => {
  const withSeats = (me: number, others: number[]) => {
    const doc = structuredClone(sampleGame());
    const template = doc.opponents[0] ?? { id: '', faction: '', vp: 0, seat: 2, color: 2 };
    doc.seat = me;
    doc.opponents = others.map((seat, i) => ({ ...template, id: `o${i}`, color: i + 2, seat }));
    return JSON.stringify(doc);
  };
  const seatsOf = (text: string) => {
    const result = importGame(text);
    if (!result.ok) throw new Error(result.reason);
    return [result.game.seat, ...result.game.opponents.map(o => o.seat)];
  };

  test('valid seats stay as they are', () => {
    expect(seatsOf(withSeats(3, [1, 2]))).toEqual([3, 1, 2]);
  });

  test('a duplicate takes the lowest free seat, the first holder keeps it', () => {
    expect(seatsOf(withSeats(2, [2, 3]))).toEqual([2, 1, 3]);
  });

  test('a seat out of range takes a free one', () => {
    expect(seatsOf(withSeats(1, [9, 0]))).toEqual([1, 2, 3]);
  });

  test('a seat that is no number stays invalid', () => {
    const doc = JSON.parse(withSeats(1, [2, 3]));
    doc.opponents[0].seat = 'two';
    expect(importGame(JSON.stringify(doc))).toEqual({ ok: false, reason: 'invalidSchema' });
  });
});

describe('player count of an imported file', () => {
  test('is set from the opponents, however the file states it', () => {
    const doc = structuredClone(sampleGame());
    doc.playerCount = doc.opponents.length + 4;
    const result = importGame(JSON.stringify(doc));
    expect(result.ok && result.game.playerCount).toBe(doc.opponents.length + 1);
  });

  test('a count that is no number stays invalid', () => {
    const doc = { ...structuredClone(sampleGame()), playerCount: 'four' };
    expect(importGame(JSON.stringify(doc))).toEqual({ ok: false, reason: 'invalidSchema' });
  });
});

describe('the seven-player map without hyperlanes, gone in version 5', () => {
  const pok = loadPack(['pok']);
  /** A version 4 file of a seven-player game on the retired four-ring map, with a tile where 85A now lies. */
  const version4 = () => {
    const opponents = ['hacan', 'arborec', 'jolnar', 'naalu', 'xxcha', 'yin']
      .map((faction, i) => ({ id: `o${i + 2}`, faction, vp: 0, seat: i + 2, color: i + 2 }));
    return {
      ...sampleGame(), schemaVersion: 4, expansions: ['pok'], playerCount: 7, layout: 'standard', faction: 'sol', seat: 1, opponents,
      map: { '0,0': '18', '0,-4': pok.factions.sol.homeTile, '3,-3': pok.factions.hacan.homeTile, '0,4': '25', '1,0': '26' },
      enemyUnits: {}, enemyGround: {}, planetControl: {}, planetOwner: {}, upgrades: { me: [], opponents: {} },
    };
  };

  test('such a file opens on the rulebook map: hyperlanes placed, homes at the new seats, the tile under a lane gone', () => {
    const result = importGame(JSON.stringify(version4()));
    if (!result.ok) throw new Error(result.reason);
    expect(result.game.schemaVersion).toBe(5);
    expect(result.game.layout).toBe('hyperlanes');
    expect(result.game.map['0,4']).toBe('85A@0');
    expect(result.game.map['3,-4']).toBe(pok.factions.hacan.homeTile);
    expect(result.game.map['1,0']).toBe('26');
    expect(Object.values(result.game.map)).not.toContain('25');
  });

  test('other layouts keep their value', () => {
    const eight = { ...version4(), playerCount: 8, opponents: [...version4().opponents, { id: 'o8', faction: 'winnu', vp: 0, seat: 8, color: 8 }] };
    expect(migrate(eight)).toMatchObject({ schemaVersion: 5, layout: 'standard' });
  });
});
