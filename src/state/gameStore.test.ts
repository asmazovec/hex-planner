import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
}));

import { loadPack } from '../data/loadPack';
import { seatSlots } from '../domain/mapBuilder';
import { project } from '../domain/project';
import type { Game } from '../domain/types';
import { loadGame, saveGame } from '../storage/db';
import { flushSaves, useGame } from './gameStore';

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
  test('цикл карты: запасная, основная, снято', () => {
    act().setStrategyCard(1, 6); expect(round()).toMatchObject({ strategyCard: null, backupCard: 6 });
    act().setStrategyCard(1, 6); expect(round()).toMatchObject({ strategyCard: 6, backupCard: null });
    act().setStrategyCard(1, 6); expect(round()).toMatchObject({ strategyCard: null, backupCard: null });
  });

  test('запись статуса одна на раунд: повторный вызов возвращает её же', () => {
    act().addRound();
    const id = act().addStatusEntry(1);
    expect(round().entries).toEqual([expect.objectContaining({ id, type: 'statusTokens', phase: 'status', tactic: 0, fleet: 0, strategy: 0 })]);
    const before = game();
    expect(act().addStatusEntry(1)).toBe(id);
    expect(game()).toBe(before);
    expect(act().addStatusEntry(2)).not.toBe(id);
    expect(plan().rounds[1].entries).toHaveLength(1);
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

  test('бесплатная тактика уходит вместе со своей картой за один шаг отмены и следует за ней в копию плана', () => {
    const card = act().addEntry(1, { type: 'strategic', card: 6 }, 'action');
    const free = act().addEntry(1, { type: 'tactical', systemId: '1,0', moves: [], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 }, free: true, fromCard: card }, 'action');
    const other = act().addEntry(1, { type: 'tactical', systemId: '1,0', moves: [], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 } }, 'action');
    act().copyPlan();
    const [copiedCard, copiedFree] = round().entries;
    expect(copiedCard.id).not.toBe(card);
    expect(copiedFree).toMatchObject({ fromCard: copiedCard.id });
    act().undo();

    act().removeEntry(card);
    expect(round().entries.map(e => e.id)).toEqual([other]);
    act().undo();
    expect(round().entries.map(e => e.id)).toEqual([card, free, other]);

    act().removeEntry(free);
    expect(round().entries.map(e => e.id)).toEqual([card, other]);
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
    const [a, b] = game().opponents.map(o => o.id);
    act().setEnemyUnits('1,0', a, { cruiser: 2 }); expect(game().enemyUnits['1,0']).toEqual({ [a]: { cruiser: 2 } });
    act().setEnemyUnits('1,0', b, { cruiser: 1 }); expect(game().enemyUnits['1,0']).toEqual({ [a]: { cruiser: 2 }, [b]: { cruiser: 1 } });
    act().setEnemyUnits('1,0', a, {}); expect(game().enemyUnits['1,0']).toEqual({ [b]: { cruiser: 1 } });
    act().setEnemyUnits('1,0', b, {}); expect(game().enemyUnits['1,0']).toBeUndefined();
    act().setPlanetControl('p', b); expect(game().planetControl.p).toBe('enemy'); expect(game().planetOwner.p).toBe(b);
    act().setPlanetControl('p', a); expect(game().planetControl.p).toBe('enemy'); expect(game().planetOwner.p).toBe(a);
    act().setPlanetControl('p', 'me'); expect(game().planetControl.p).toBe('me'); expect(game().planetOwner.p).toBeUndefined();
    act().setPlanetControl('p', b); act().setPlanetControl('p', null);
    expect(game().planetControl.p).toBeUndefined(); expect(game().planetOwner.p).toBeUndefined();
    act().setDock('p', true); expect(game().docks).toContain('p');
    act().setDock('p', false); expect(game().docks).not.toContain('p');
    act().setOpponent(0, { faction: 'hacan' }); expect(game().opponents[0].faction).toBe('hacan');
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

describe('действия без изменений', () => {
  test('неизвестный id и то же значение не создают шаг отмены и не сохраняют', async () => {
    const id = act().addEntry(1, { type: 'pass' }, 'action');
    act().setEntryStatus(id, 'done');
    act().setOpponent(0, { faction: 'hacan' });
    const opponent = game().opponents[0].id;
    act().setEnemyUnits('1,0', opponent, { cruiser: 2 });
    act().setPlanetControl('p', opponent);
    const before = game();
    await vi.waitFor(() => expect(saveGame).toHaveBeenLastCalledWith(before));
    vi.mocked(saveGame).mockClear();
    const noops = [
      () => act().removeEntry('nope'),
      () => act().updateEntry('nope', { type: 'pass' }),
      () => act().moveEntry('nope', 'status', 0),
      () => act().setEntryStatus('nope', 'done'),
      () => act().setEntryStatus(id, 'done'),
      () => act().moveEntry(id, 'action', 0),
      () => act().setStrategyCard(99, 3),
      () => act().renamePlan(plan().name),
      () => act().setFractureActive(false),
      () => act().setTile('9,9', null),
      () => act().setEnemyUnits('9,9', opponent, {}),
      () => act().setPlanetControl('nope', null),
      () => act().setPlanetControl('p', opponent),
      () => act().setSlice('res5', null),
      () => act().setDock('nope', false),
      () => act().setDock(game().docks[0], true),
      () => act().setThundersEdge(null),
      () => act().setOpponent(99, { faction: 'sol' }),
      () => act().setOpponent(0, { faction: 'hacan' }),
      () => act().setEnemyUnits('1,0', opponent, { cruiser: 2 }),
      () => act().setEnemyUnits('1,0', opponent, { cruiser: 2, fighter: 0 }),
      () => act().setActivePlan(game().activePlanId),
    ];
    for (const run of noops) {
      run();
      expect(game()).toBe(before);
    }
    await Promise.resolve();
    expect(saveGame).not.toHaveBeenCalled();
    // History holds only the five real edits.
    act().undo(); act().undo(); act().undo(); act().undo(); act().undo();
    expect(act().canUndo).toBe(false);
    expect(round().entries).toHaveLength(0);
  });
});

describe('setMap', () => {
  test('replaces the map in one undo step and keeps the centre', () => {
    const before = game().map;
    act().setMap({ '1,0': '25', '0,0': '99' });
    expect(game().map).toEqual({ '0,0': before['0,0'], '1,0': '25' });
    act().undo();
    expect(game().map).toEqual(before);
  });

  test('an identical map leaves no undo step', () => {
    act().setMap({ '1,0': '25' });
    act().setMap({ '1,0': '25' });
    act().undo();
    expect(game().map['1,0']).toBeUndefined();
  });
});

describe('layout', () => {
  test('a new game of four players starts with the standard layout', () => {
    expect(game().layout).toBe('standard');
  });

  test('setLayout switches the template in one undo step, keeping the tiles of shared slots', async () => {
    act().setTile('0,-1', '25');
    const before = game();
    act().setLayout('hyperlanes');
    expect(game().layout).toBe('hyperlanes');
    expect(game().map['0,-1']).toBe('25');
    expect(game().map['-2,-1']).toBe('83A@0');
    await flushSaves();
    expect(saveGame).toHaveBeenLastCalledWith(game());
    act().undo();
    expect(game()).toEqual(before);
  });

  test('setLayout to the same layout leaves no undo step', () => {
    act().setLayout('standard');
    expect(act().canUndo).toBe(false);
  });

  test('a layout the expansions lack changes nothing', () => {
    act().newGame({ expansions: [], playerCount: 4, faction: Object.keys(loadPack([]).factions)[0] }, loadPack([]));
    act().setLayout('hyperlanes');
    expect(game().layout).toBe('standard');
    expect(act().canUndo).toBe(false);
  });

  test('setMap with a layout replaces the map and the layout in one undo step', () => {
    act().setMap({ '1,0': '25', '-2,-1': '83A@0' }, 'hyperlanes');
    expect(game().layout).toBe('hyperlanes');
    expect(game().map['-2,-1']).toBe('83A@0');
    act().undo();
    expect(game().layout).toBe('standard');
    expect(game().map['-2,-1']).toBeUndefined();
  });
});

describe('players', () => {
  const pok = loadPack(['pok']);
  const open = () => useGame.getState().newGame({ expansions: ['pok'], playerCount: 4, faction: 'sol' }, pok);

  test('edits go to the draft while no game is open, without saving or undo', () => {
    useGame.getState().closeGame();
    const before = useGame.getState().draft.opponents.length;
    useGame.getState().addOpponent();
    expect(useGame.getState().draft.opponents).toHaveLength(before + 1);
    expect(useGame.getState().game).toBeNull();
    expect(useGame.getState().canUndo).toBe(false);
    useGame.getState().removeOpponent(before);
    expect(useGame.getState().draft.opponents).toHaveLength(before);
  });

  test('starting turns the draft into the game and leaves a fresh draft', () => {
    useGame.getState().closeGame();
    useGame.getState().setFaction('sol');
    const { draft } = useGame.getState();
    useGame.getState().startGame();
    expect(useGame.getState().game!.id).toBe(draft.id);
    expect(useGame.getState().game!.faction).toBe('sol');
    expect(useGame.getState().draft.faction).toBe('');
    expect(useGame.getState().draft.id).not.toBe(draft.id);
  });

  test('in an open game the player actions can be undone and the starting points count in the projection', () => {
    open();
    useGame.getState().addOpponent();
    expect(useGame.getState().game!.playerCount).toBe(5);
    useGame.getState().undo();
    expect(useGame.getState().game!.playerCount).toBe(4);
    const game = { ...useGame.getState().game!, vp: 3 };
    expect(project(game, game.plans[0], 'now', pok).state.vp).toBe(3);
  });

  test('an opponent faction goes through the home tile rule, a seat swap moves the tile', () => {
    open();
    useGame.getState().setOpponent(0, { faction: 'hacan' });
    const slots = seatSlots(4, pok, useGame.getState().game!.layout);
    expect(useGame.getState().game!.map[slots[1]]).toBe('16');
    useGame.getState().swapSeats(1, 2);
    expect(useGame.getState().game!.map[slots[2]]).toBe('16');
    expect(useGame.getState().game!.map[slots[1]]).toBeUndefined();
  });
});

describe('addExpansion', () => {
  test('adds an expansion to the open game in one undo step', () => {
    act().addExpansion('te');
    expect(game().expansions).toEqual(['pok', 'te']);
    act().undo();
    expect(game().expansions).toEqual(['pok']);
  });

  test("Thunder's Edge puts its Mecatol Rex in the centre, undo brings the old one back", () => {
    expect(game().map['0,0']).toBe('18');
    act().addExpansion('te');
    expect(game().map['0,0']).toBe('112');
    act().undo();
    expect(game().map['0,0']).toBe('18');
  });

  test('an expansion already on leaves no undo step', () => {
    act().addExpansion('pok');
    expect(game().expansions).toEqual(['pok']);
    expect(act().canUndo).toBe(false);
  });

  test('keeps the order of the expansions', () => {
    act().newGame({ expansions: ['te'], playerCount: 4, faction: Object.keys(loadPack(['te']).factions)[0] }, loadPack(['te']));
    act().addExpansion('pok');
    expect(game().expansions).toEqual(['pok', 'te']);
  });
});

describe('removing an opponent in a game', () => {
  test('units, planets and owners go in one undo step', () => {
    const [a, b] = game().opponents.map(o => o.id);
    act().setEnemyUnits('1,0', a, { cruiser: 2 });
    act().setEnemyUnits('1,0', b, { fighter: 1 });
    act().setPlanetControl('p', a);
    const before = game();
    act().removeOpponent(0);
    expect(game().enemyUnits).toEqual({ '1,0': { [b]: { fighter: 1 } } });
    expect(game().planetControl.p).toBeUndefined();
    expect(game().planetOwner).toEqual({});
    act().undo();
    expect(game()).toBe(before);
  });
});

describe("Thunder's Edge turned on in a game in progress", () => {
  test('the owner of an enemy Mecatol moves with it', () => {
    const [, b] = game().opponents.map(o => o.id);
    act().setPlanetControl('mr', b);
    act().addExpansion('te');
    expect(game().planetControl).toMatchObject({ mrte: 'enemy' });
    expect(game().planetOwner).toEqual({ mrte: b });
  });

  test('Mecatol records move from mr to mrte in one undo step', () => {
    const entry = {
      type: 'tactical' as const, systemId: '0,0', moves: [{ from: 'mr', units: {} }],
      landings: [{ planetId: 'mr', units: { infantry: 1 } }], production: {}, payment: { planets: ['mr'], tradeGoods: 0 },
    };
    act().setPlanetControl('mr', 'me');
    act().setDock('mr', true);
    const id = act().addEntry(1, entry, 'action');
    act().setEntryStatus(id, 'done');
    const before = project(game(), plan(), 'forecast', pack).state;
    expect(before.exhausted).toContain('mr');
    const old = game();

    act().addExpansion('te');
    const next = game();
    const after = project(next, next.plans.find(p => p.id === next.activePlanId)!, 'forecast', loadPack(['pok', 'te'])).state;
    expect(after.control.mrte).toBe(before.control.mr);
    expect(after.exhausted).toContain('mrte');
    expect(after.ground.mrte).toEqual(before.ground.mr);
    expect(after.control.mr).toBeUndefined();
    expect(next.docks).toContain('mrte');
    expect(next.docks).not.toContain('mr');
    expect(Object.keys(next.planetControl)).toContain('mrte');
    expect(Object.keys(next.planetControl)).not.toContain('mr');
    const body = next.plans[0].rounds[0].entries[0] as typeof entry;
    expect(body.moves[0].from).toBe('mrte');
    expect(body.landings[0].planetId).toBe('mrte');
    expect(body.payment.planets).toEqual(['mrte']);

    act().undo();
    expect(game()).toEqual(old);
  });

  test('a tap on a ship upgrade is one undo step', () => {
    act().toggleUpgrade('me', 'carrier');
    expect(game().upgrades.me).toEqual(['carrier']);
    const id = game().opponents[0].id;
    act().toggleUpgrade(id, 'fighter');
    expect(game().upgrades.opponents[id]).toEqual(['fighter']);
    act().undo();
    expect(game().upgrades.opponents[id]).toBeUndefined();
    act().undo();
    expect(game().upgrades.me).toEqual([]);
  });

  test('removing an opponent through the store removes their upgrades, and undo brings them back', () => {
    const id = game().opponents[0].id;
    act().toggleUpgrade(id, 'fighter');
    act().removeOpponent(0);
    expect(game().upgrades.opponents).toEqual({});
    act().undo();
    expect(game().upgrades.opponents[id]).toEqual(['fighter']);
  });

  test('a copied plan has entry upgrades of its own', () => {
    const id = act().addEntry(1, { type: 'strategic', upgrades: ['carrier'] }, 'action');
    act().copyPlan();
    const copy = round().entries[0];
    expect(copy).toMatchObject({ upgrades: ['carrier'] });
    act().updateEntry(copy.id, { upgrades: [] });
    expect(plans()[0].rounds[0].entries.find(e => e.id === id)).toMatchObject({ upgrades: ['carrier'] });
  });
});

describe('merged adjustments and structures', () => {
  const lose = (unit: 'carrier' | 'infantry', amount: number, planetId: string | null = null) =>
    act().changeAdjustment(1, { kind: 'losses', systemId: '1,0', unit, planetId, amount });

  test('each tap is one undo step, and undo brings the entry back', () => {
    lose('carrier', -1);
    lose('carrier', 1);
    expect(round().entries).toEqual([]);
    act().undo();
    expect(round().entries).toHaveLength(1);
    act().undo();
    expect(round().entries).toEqual([]);
    expect(act().canUndo).toBe(false);
  });

  test('a PDS count goes up and down with undo, and zero leaves the record', () => {
    act().setPds('p', 2);
    expect(game().pds).toEqual({ p: 2 });
    act().setPds('p', 0);
    expect(game().pds).toEqual({});
    act().undo();
    expect(game().pds).toEqual({ p: 2 });
  });

  test('setting the same PDS count leaves no undo step', () => {
    act().setPds('p', 0);
    expect(act().canUndo).toBe(false);
  });

  test('a PDS on Mecatol Rex follows the planet to Thunder\'s Edge, and so does a loss recorded there', () => {
    act().setPds('mr', 1);
    lose('infantry', -1, 'mr');
    act().addExpansion('te');
    expect(game().pds).toEqual({ mrte: 1 });
    expect(round().entries[0]).toMatchObject({ delta: { ground: { mrte: { infantry: -1 } } } });
  });

  test('an opponent who leaves takes the PDS of their planets along', () => {
    const [first] = game().opponents;
    act().setPlanetControl('p', first.id);
    act().setPds('p', 1);
    act().setPds('q', 1);
    act().removeOpponent(0);
    expect(game().pds).toEqual({ q: 1 });
  });
});
