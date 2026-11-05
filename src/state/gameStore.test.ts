import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
}));

import { loadPack } from '../data/loadPack';
import { project } from '../domain/project';
import type { Game } from '../domain/types';
import { loadGame, saveGame } from '../storage/db';
import { useGame } from './gameStore';

const pack = loadPack(['pok']);
const act = () => useGame.getState();
const game = (): Game => act().game!;
const plan = () => game().plans.find(p => p.id === game().activePlanId)!;
const plans = () => game().plans;
const round = () => plan().rounds[0];

beforeEach(() => {
  vi.mocked(saveGame).mockReset().mockResolvedValue(undefined);
  vi.mocked(loadGame).mockReset().mockResolvedValue(null);
  act().newGame({ expansions: ['pok'], playerCount: 4, faction: Object.keys(pack.factions)[0] }, pack);
});

describe('gameStore', () => {
  test('цикл карты: основная, запасная, снято', () => {
    act().setStrategyCard(1, 6); expect(round().strategyCard).toBe(6);
    act().setStrategyCard(1, 6); expect(round()).toMatchObject({ strategyCard: null, backupCard: 6 });
    act().setStrategyCard(1, 6); expect(round().backupCard).toBeNull();
  });

  test('копия плана независима', () => {
    const originalId = plan().id;
    act().addEntry(1, { type: 'pass' }, 'action');
    act().copyPlan();
    expect(plans()).toHaveLength(2);
    expect(plan().id).not.toBe(originalId);
    expect(plan().rounds[0].entries[0].id).not.toBe(plans()[0].rounds[0].entries[0].id);
    act().removeEntry(plan().rounds[0].entries[0].id);
    expect(plan().rounds[0].entries).toHaveLength(0);
    expect(plans()[0].rounds[0].entries).toHaveLength(1);
  });

  test('выполненная запись учитывается только в своём плане', () => {
    const first = plan().id;
    const id = act().addEntry(1, { type: 'adjustment', label: 'x', delta: { tradeGoods: 2 } }, 'action');
    act().setEntryStatus(id, 'done');
    act().copyPlan();
    const copyId = plan().id;
    act().setEntryStatus(plan().rounds[0].entries[0].id, 'planned');
    const tg = (planId: string) => project(game(), plans().find(p => p.id === planId)!, 'now', pack).state.tradeGoods;
    expect(tg(first)).toBe(2);
    expect(tg(copyId)).toBe(0);
  });

  test('единственный план удалить нельзя', () => {
    act().deletePlan(plans()[0].id);
    expect(plans()).toHaveLength(1);
  });

  test('удаление активного плана выбирает другой', () => {
    const first = plan().id;
    act().copyPlan();
    act().deletePlan(plan().id);
    expect(plans()).toHaveLength(1);
    expect(game().activePlanId).toBe(first);
  });

  test('пустое название заменяется значением по умолчанию', () => {
    act().renamePlan('  '); expect(plan().name).not.toBe('');
    act().renamePlan(' Мой план '); expect(plan().name).toBe('Мой план');
  });

  test('undo возвращает предыдущее состояние', () => {
    const id = act().addEntry(1, { type: 'pass' }, 'action');
    expect(act().canUndo).toBe(true);
    act().removeEntry(id);
    expect(round().entries).toHaveLength(0);
    act().undo();
    expect(round().entries.map(e => e.id)).toEqual([id]);
  });

  test('canUndo ложно после новой партии, история ограничена 50 состояниями', () => {
    expect(act().canUndo).toBe(false);
    for (let i = 0; i < 60; i++) act().addRound();
    let steps = 0;
    while (act().canUndo) { act().undo(); steps++; }
    expect(steps).toBe(50);
  });

  test('moveEntry переносит запись в другую фазу на позицию', () => {
    const a = act().addEntry(1, { type: 'pass' }, 'action');
    const b = act().addEntry(1, { type: 'secondary' }, 'action');
    const c = act().addEntry(1, { type: 'strategic' }, 'strategy');
    act().moveEntry(c, 'action', 1);
    expect(round().entries.filter(e => e.phase === 'action').map(e => e.id)).toEqual([a, c, b]);
    expect(round().entries.find(e => e.id === c)!.phase).toBe('action');
  });

  test('карта, юниты и контроль меняются точечно', () => {
    act().setTile('1,0', '25'); expect(game().map['1,0']).toBe('25');
    act().setTile('1,0', null); expect(game().map['1,0']).toBeUndefined();
    act().setEnemyUnits('1,0', { cruiser: 2 }); expect(game().enemyUnits['1,0']).toEqual({ cruiser: 2 });
    act().setEnemyUnits('1,0', {}); expect(game().enemyUnits['1,0']).toBeUndefined();
    act().setPlanetControl('p', 'enemy'); expect(game().planetControl.p).toBe('enemy');
    act().setPlanetControl('p', null); expect(game().planetControl.p).toBeUndefined();
    act().setOpponent(0, { vp: 3 }); expect(game().opponents[0].vp).toBe(3);
    act().setSlice('res5', 'other'); expect(game().expedition.slices.res5).toBe('other');
    act().setThundersEdge('1,0'); expect(game().expedition.thundersEdgeSystem).toBe('1,0');
    act().setFractureActive(true); expect(game().fracture.active).toBe(true);
    act().toggleIngress('1,0'); expect(game().fracture.ingress).toEqual(['1,0']);
    act().toggleIngress('1,0'); expect(game().fracture.ingress).toEqual([]);
  });

  test('автосохранение вызывается после действия', async () => {
    act().addRound();
    await vi.waitFor(() => expect(saveGame).toHaveBeenLastCalledWith(game()));
  });

  test('автосохранение: сбой записи выставляет saveError и не теряет состояние', async () => {
    vi.mocked(saveGame).mockRejectedValue(new Error('quota'));
    act().addRound();
    await vi.waitFor(() => expect(act().saveError).not.toBeNull());
    expect(plan().rounds).toHaveLength(2);
    vi.mocked(saveGame).mockResolvedValue(undefined);
    act().addRound();
    await vi.waitFor(() => expect(act().saveError).toBeNull());
    expect(plan().rounds).toHaveLength(3);
  });

  test('openGame загружает партию и сбрасывает историю', async () => {
    const other = structuredClone(game());
    vi.mocked(loadGame).mockResolvedValue(other);
    act().addRound();
    await act().openGame('x');
    expect(loadGame).toHaveBeenCalledWith('x');
    expect(game()).toBe(other);
    expect(act().canUndo).toBe(false);
  });
});
