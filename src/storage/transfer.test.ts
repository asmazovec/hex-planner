import { describe, expect, test } from 'vitest';
import { CURRENT_SCHEMA, exportGame, importGame, migrate } from './transfer';
import { gameOfSchema1, sampleGame } from './fixture';

const game = sampleGame();

test('экспорт и импорт туда и обратно', () => {
  expect(importGame(exportGame(game))).toEqual({ ok: true, game });
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
