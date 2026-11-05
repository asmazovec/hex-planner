import { describe, expect, test } from 'vitest';
import { CURRENT_SCHEMA, exportGame, importGame, migrate } from './transfer';
import { sampleGame } from './fixture';

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
    bad.enemyUnits = { '1,0': { spaceship: 1 } as never };
    expect(importGame(JSON.stringify(bad)).ok).toBe(false);
    const neg = structuredClone(game);
    neg.enemyUnits = { '1,0': { fighter: -1 } };
    expect(importGame(JSON.stringify(neg)).ok).toBe(false);
  });
});

test('миграция применяется к старой схеме', () => {
  const old = { ...JSON.parse(exportGame(game)), schemaVersion: 0 };
  expect(migrate(old)).toMatchObject({ schemaVersion: CURRENT_SCHEMA });
  expect(importGame(JSON.stringify(old))).toEqual({ ok: true, game });
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
