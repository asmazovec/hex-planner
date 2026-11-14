import { beforeEach, describe, expect, test, vi } from 'vitest';
import * as edits from '../testing/entries';

vi.mock('../storage/db', () => ({
  saveGame: vi.fn(async () => undefined),
  loadGame: vi.fn(async () => null),
  listGames: vi.fn(async () => []),
}));

import { loadPack } from '../data/loadPack';
import { seatSlots } from '../domain/mapBuilder';
import { opponentHoldings } from '../domain/players';
import { project } from '../domain/project';
import type { Game } from '../domain/types';
import { listGames, loadGame, saveGame } from '../storage/db';
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
    const id = edits.addStatusEntry(1);
    expect(round().entries).toEqual([expect.objectContaining({ id, type: 'statusTokens', phase: 'status', tactic: 0, fleet: 0, strategy: 0 })]);
    const before = game();
    expect(edits.addStatusEntry(1)).toBe(id);
    expect(game()).toBe(before);
    expect(edits.addStatusEntry(2)).not.toBe(id);
    expect(plan().rounds[1].entries).toHaveLength(1);
  });

  test('копия плана независима', () => {
    const originalId = plan().id;
    edits.addEntry(1, { type: 'pass' }, 'action');
    act().copyPlan();
    expect(plans()).toHaveLength(2);
    expect(plan().id).not.toBe(originalId);
    expect(plan().rounds[0].entries[0].id).not.toBe(plans()[0].rounds[0].entries[0].id);
    edits.removeEntry(plan().rounds[0].entries[0].id);
    expect(plan().rounds[0].entries).toHaveLength(0);
    expect(plans()[0].rounds[0].entries).toHaveLength(1);
  });

  test('выполненная запись учитывается только в своём плане', () => {
    const first = plan().id;
    const id = edits.addEntry(1, { type: 'adjustment', label: 'x', delta: { tradeGoods: 2 } }, 'action');
    edits.setEntryStatus(id, 'done');
    act().copyPlan();
    const copyId = plan().id;
    edits.setEntryStatus(plan().rounds[0].entries[0].id, 'planned');
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
    const id = edits.addEntry(1, { type: 'pass' }, 'action');
    expect(act().canUndo).toBe(true);
    edits.removeEntry(id);
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
    const card = edits.addEntry(1, { type: 'strategic', card: 6 }, 'action');
    const free = edits.addEntry(1, { type: 'tactical', systemId: '1,0', moves: [], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 }, free: true, fromCard: card }, 'action');
    const other = edits.addEntry(1, { type: 'tactical', systemId: '1,0', moves: [], landings: [], production: {}, payment: { planets: [], tradeGoods: 0 } }, 'action');
    act().copyPlan();
    const [copiedCard, copiedFree] = round().entries;
    expect(copiedCard.id).not.toBe(card);
    expect(copiedFree).toMatchObject({ fromCard: copiedCard.id });
    act().undo();

    edits.removeEntry(card);
    expect(round().entries.map(e => e.id)).toEqual([other]);
    act().undo();
    expect(round().entries.map(e => e.id)).toEqual([card, free, other]);

    edits.removeEntry(free);
    expect(round().entries.map(e => e.id)).toEqual([card, other]);
  });

  test('moveEntry переносит запись в другую фазу на позицию', () => {
    const a = edits.addEntry(1, { type: 'pass' }, 'action');
    const b = edits.addEntry(1, { type: 'secondary' }, 'action');
    const c = edits.addEntry(1, { type: 'strategic' }, 'strategy');
    edits.moveEntry(c, 'action', 1);
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
    await vi.waitFor(() => expect(saveGame).toHaveBeenLastCalledWith(act().saved));
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
    const other = structuredClone(act().saved!);
    vi.mocked(loadGame).mockResolvedValue(other);
    act().addRound();
    await act().openGame('x');
    expect(loadGame).toHaveBeenCalledWith('x');
    expect(act().saved).toEqual(other);
    expect(act().canUndo).toBe(false);
  });
});

describe('a save that does not load', () => {
  beforeEach(() => {
    vi.mocked(listGames).mockReset().mockResolvedValue([]);
    useGame.setState({ loadFailure: null, brokenSaves: {} });
  });

  test('openGame of a broken save tells why, marks it, and leaves the open game alone', async () => {
    const before = game();
    vi.mocked(loadGame).mockRejectedValue(new Error('plans: expected array'));
    await expect(act().openGame('broken')).resolves.toBeUndefined();
    expect(game()).toBe(before);
    expect(act().loadFailure).toEqual({ id: 'broken', error: 'plans: expected array' });
    expect(act().brokenSaves).toEqual({ broken: 'plans: expected array' });
  });

  test('a save of an earlier version is told apart from a damaged one, and nothing is saved over it', async () => {
    await flushSaves();
    vi.mocked(saveGame).mockClear();
    const before = game();
    vi.mocked(loadGame).mockRejectedValue(Object.assign(new Error('no format'), { kind: 'oldFormat' }));
    await act().openGame('old');
    expect(game()).toBe(before);
    expect(act().loadFailure).toEqual({ id: 'old', error: 'no format', oldFormat: true });
    expect(act().brokenSaves).toEqual({ old: 'no format' });
    await flushSaves();
    expect(saveGame).not.toHaveBeenCalled();
  });

  test('a save that opens after all clears the failure and its mark', async () => {
    vi.mocked(loadGame).mockRejectedValueOnce(new Error('busy'));
    await act().openGame('x');
    vi.mocked(loadGame).mockResolvedValue(structuredClone(act().saved!));
    await act().openGame('x');
    expect(act().loadFailure).toBeNull();
    expect(act().brokenSaves).toEqual({});
  });

  test('a crash of the open game closes it without saving, and marks it as failed', async () => {
    await flushSaves();
    vi.mocked(saveGame).mockClear();
    const { id } = game();
    act().crashGame('replay failed');
    expect(act().game).toBeNull();
    expect(act().canUndo).toBe(false);
    expect(act().loadFailure).toEqual({ id, error: 'replay failed' });
    expect(act().brokenSaves[id]).toBe('replay failed');
    await flushSaves();
    expect(saveGame).not.toHaveBeenCalled();
    act().crashGame('again');
    expect(act().loadFailure?.error).toBe('replay failed');
  });

  test('a link to a broken save tells so and starts nothing under its name', async () => {
    act().closeGame();
    await flushSaves();
    vi.mocked(saveGame).mockClear();
    vi.mocked(listGames).mockResolvedValue([{ id: 'friday', name: 'Friday', faction: 'sol', playerCount: 4, updatedAt: 1, broken: true }]);
    vi.mocked(loadGame).mockRejectedValue(new Error('damaged'));
    await act().openShareLink('?name=Friday&me=1');
    expect(act().game).toBeNull();
    expect(act().loadFailure).toEqual({ id: 'friday', error: 'damaged' });
    await flushSaves();
    expect(saveGame).not.toHaveBeenCalled();
  });

  test('a link while the saves cannot be listed only fills the draft and tells so', async () => {
    act().closeGame();
    vi.mocked(listGames).mockRejectedValue(new Error('no IndexedDB'));
    await act().openShareLink('?name=Friday&exp=pok');
    expect(act().game).toBeNull();
    expect(act().draft.expansions).toEqual(['pok']);
    expect(act().loadFailure).toEqual({ id: null, error: 'no IndexedDB' });
    expect(act().brokenSaves).toEqual({});
  });
});

describe('the kept timelines', () => {
  test('closing or crashing the game forgets them', async () => {
    const projection = await import('./projection');
    const forget = vi.spyOn(projection, 'forgetTimelines');
    act().closeGame();
    expect(forget).toHaveBeenCalledTimes(1);
    act().newGame({ expansions: ['pok'], playerCount: 4, faction: Object.keys(pack.factions)[0] }, pack);
    act().crashGame('replay failed');
    expect(forget).toHaveBeenCalledTimes(2);
    forget.mockRestore();
  });
});

describe('действия без изменений', () => {
  test('неизвестный id и то же значение не создают шаг отмены и не сохраняют', async () => {
    const id = edits.addEntry(1, { type: 'pass' }, 'action');
    edits.setEntryStatus(id, 'done');
    act().setOpponent(0, { faction: 'hacan' });
    const opponent = game().opponents[0].id;
    act().setEnemyUnits('1,0', opponent, { cruiser: 2 });
    act().setPlanetControl('p', opponent);
    const before = game();
    await vi.waitFor(() => expect(saveGame).toHaveBeenLastCalledWith(act().saved));
    vi.mocked(saveGame).mockClear();
    const noops = [
      () => edits.removeEntry('nope'),
      () => edits.updateEntry('nope', { type: 'pass' }),
      () => edits.moveEntry('nope', 'status', 0),
      () => edits.setEntryStatus('nope', 'done'),
      () => edits.setEntryStatus(id, 'done'),
      () => edits.moveEntry(id, 'action', 0),
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
    const home = Object.entries(before).find(([slot]) => slot === seatSlots(4, pack, game().layout)[0])!;
    expect(game().map).toEqual({ '0,0': before['0,0'], '1,0': '25', [home[0]]: home[1] });
    act().undo();
    expect(game().map).toEqual(before);
  });

  test('a 0 on a home slot of the string leaves the home system of the seated faction there (naalu: pasting a Milty string erased it)', () => {
    const [mine] = seatSlots(4, pack, game().layout);
    const tile = game().map[mine];
    expect(tile).toBeTruthy();
    act().setMap({ '1,0': '25' });
    expect(game().map[mine]).toBe(tile);
    expect(game().map['1,0']).toBe('25');
  });

  test('a tile the string puts on a seat slot stays', () => {
    const [mine] = seatSlots(4, pack, game().layout);
    act().setMap({ [mine]: '25' });
    expect(game().map[mine]).toBe('25');
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
    expect(saveGame).toHaveBeenLastCalledWith(act().saved);
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

  test('a draft without my faction does not start', () => {
    useGame.getState().closeGame();
    const { draft } = useGame.getState();
    useGame.getState().startGame();
    expect(useGame.getState().game).toBeNull();
    expect(useGame.getState().draft).toBe(draft);
  });

  test('the dock standing for my absent home comes off, and goes back', () => {
    const pack = loadPack(['pok']);
    useGame.getState().newGame({ expansions: ['pok'], playerCount: 6, faction: 'sol' }, pack);
    const seat = Object.keys(useGame.getState().game!.map).find(slot => useGame.getState().game!.map[slot] === pack.factions.sol.homeTile)!;
    useGame.getState().setTile(seat, '4');
    const planet = pack.tiles['4'].planetIds[0];
    useGame.getState().setDock(planet, false);
    expect(useGame.getState().game!.docks).toEqual([]);
    useGame.getState().setDock(planet, true);
    expect(useGame.getState().game!.docks).toEqual([planet]);
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

  test('an opponent faction goes through the home tile rule, and in a started game the seats stay', () => {
    open();
    useGame.getState().setOpponent(0, { faction: 'hacan' });
    const slots = seatSlots(4, pok, useGame.getState().game!.layout);
    expect(useGame.getState().game!.map[slots[1]]).toBe('16');
    const before = useGame.getState().game;
    useGame.getState().swapSeats(1, 2);
    expect(useGame.getState().game).toBe(before);
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
    const id = edits.addEntry(1, entry, 'action');
    edits.setEntryStatus(id, 'done');
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

  test('a mark of a start holding is one undo step, for me and for an opponent', () => {
    const mine = game().start.me;
    act().setStartHolding('me', 'technology:cv2', true);
    expect(game().start.me.technologies).toEqual([...(mine.technologies ?? []), 'technology:cv2']);
    const id = game().opponents[0].id;
    const theirs = game().start.opponents[id];
    act().setStartHolding(id, 'technology:ff2', true);
    expect(game().start.opponents[id]).toEqual({ ...theirs, technologies: ['technology:ff2'] });
    act().undo();
    expect(game().start.opponents[id]).toEqual(theirs);
    act().undo();
    expect(game().start.me).toEqual(mine);
  });

  test('a leader\'s state set by hand is one undo step; null locks it again', () => {
    const id = game().opponents[0].id;
    act().setLeader(id, 'leader:solagent', 'exhausted');
    act().setLeader('me', 'leader:solhero', 'unlocked');
    expect(game().start.opponents[id].leaders).toEqual({ 'leader:solagent': 'exhausted' });
    act().setLeader('me', 'leader:solhero', null);
    // My own agent has been unlocked since the game began.
    expect(game().start.me.leaders).toEqual({ 'leader:arborecagent': 'unlocked' });
    act().undo();
    expect(game().start.me.leaders).toEqual({ 'leader:arborecagent': 'unlocked', 'leader:solhero': 'unlocked' });
  });

  test('removing an opponent through the store removes their start holdings, and undo brings them back', () => {
    const id = game().opponents[0].id;
    const theirs = game().start.opponents[id];
    act().setStartHolding(id, 'technology:ff2', true);
    act().removeOpponent(0);
    expect(game().start.opponents[id]).toBeUndefined();
    act().undo();
    expect(game().start.opponents[id]).toEqual({ ...theirs, technologies: ['technology:ff2'] });
  });

  test('a copied plan has entry research of its own', () => {
    const id = edits.addEntry(1, { type: 'strategic', effects: { researched: ['technology:cv2'] } }, 'action');
    act().copyPlan();
    const copy = round().entries[0];
    expect(copy).toMatchObject({ effects: { researched: ['technology:cv2'] } });
    edits.updateEntry(copy.id, { effects: {} });
    expect(plans()[0].rounds[0].entries.find(e => e.id === id)).toMatchObject({ effects: { researched: ['technology:cv2'] } });
  });
});

describe('merged adjustments and structures', () => {
  const lose = (unit: 'carrier' | 'infantry', amount: number, planetId: string | null = null) =>
    act().changeAdjustment(1, { kind: 'losses', systemId: '1,0', unit, planetId, amount });

  test('each tap is one undo step, and undo brings the entry back', () => {
    act().changeAdjustment(1, { kind: 'setup', systemId: '1,0', unit: 'carrier', planetId: null, amount: 1 });
    lose('carrier', -1);
    lose('carrier', 1);
    expect(round().entries).toHaveLength(1);
    act().undo();
    expect(round().entries).toHaveLength(2);
    act().undo();
    expect(round().entries).toHaveLength(1);
    act().undo();
    expect(round().entries).toEqual([]);
    expect(act().canUndo).toBe(false);
  });

  test('a PDS count goes up and down with undo, and zero leaves the record', () => {
    const start = { ...game().pds }; // the PDS of the faction's sheet stand from the start
    act().setPds('p', 2);
    expect(game().pds).toEqual({ ...start, p: 2 });
    act().setPds('p', 0);
    expect(game().pds).toEqual(start);
    act().undo();
    expect(game().pds).toEqual({ ...start, p: 2 });
  });

  test('setting the same PDS count leaves no undo step', () => {
    act().setPds('p', 0);
    expect(act().canUndo).toBe(false);
  });

  test('a PDS on Mecatol Rex follows the planet to Thunder\'s Edge, and so does a loss recorded there', () => {
    const start = { ...game().pds };
    act().setPds('mr', 1);
    act().changeAdjustment(1, { kind: 'setup', systemId: '0,0', unit: 'infantry', planetId: 'mr', amount: 1 });
    act().addExpansion('te');
    expect(game().pds).toEqual({ ...start, mrte: 1 });
    expect(round().entries[0]).toMatchObject({ delta: { ground: { mrte: { infantry: 1 } } } });
  });

  test('an opponent who leaves takes the PDS of their planets along', () => {
    const [first] = game().opponents;
    const start = { ...game().pds };
    act().setPlanetControl('p', first.id);
    act().setPds('p', 1);
    act().setPds('q', 1);
    act().removeOpponent(0);
    expect(game().pds).toEqual({ ...start, q: 1 });
  });
});


describe('enemy ground units by planet', () => {
  test('they are set with undo, and nothing left leaves no record', () => {
    const [{ id }] = game().opponents;
    act().setEnemyGround('p', id, { infantry: 2 });
    expect(game().enemyGround).toEqual({ p: { [id]: { infantry: 2 } } });
    act().setEnemyGround('p', id, {});
    expect(game().enemyGround).toEqual({});
    act().undo();
    expect(game().enemyGround).toEqual({ p: { [id]: { infantry: 2 } } });
  });

  test('the same counts leave no undo step', () => {
    act().setEnemyGround('p', game().opponents[0].id, {});
    expect(act().canUndo).toBe(false);
  });

  test('on Mecatol Rex they follow the planet, and so does production on it', () => {
    const [{ id }] = game().opponents;
    act().setEnemyGround('mr', id, { mech: 1 });
    edits.addEntry(1, { type: 'tactical', systemId: '0,0', moves: [], landings: [], production: { infantry: 1 }, payment: { planets: [], tradeGoods: 0 }, productionGround: { mr: { infantry: 1 } } }, 'action');
    act().addExpansion('te');
    expect(game().enemyGround).toEqual({ mrte: { [id]: { mech: 1 } } });
    expect(round().entries[0]).toMatchObject({ productionGround: { mrte: { infantry: 1 } } });
  });

  test('an opponent who leaves takes them along, and they count as holdings', () => {
    const [{ id }, other] = game().opponents;
    act().setEnemyGround('p', id, { infantry: 2 });
    act().setEnemyGround('p', other.id, { mech: 1 });
    expect(opponentHoldings(game(), id).units).toBe(2);
    act().removeOpponent(0);
    expect(game().enemyGround).toEqual({ p: { [other.id]: { mech: 1 } } });
  });
});

describe('the store holds the saved game', () => {
  const saved = () => act().saved!;
  const rounds = () => saved().plans.find(p => p.id === saved().activePlanId)!.rounds;
  const pass = (): import('../game/actions').Turn => ({ id: '', player: saved().table.viewer, status: 'planned', action: { kind: 'pass' }, acts: [], used: [] });

  test('turns are added, replaced, moved and removed in the rounds of the open plan, and the old view follows', () => {
    const id = act().addTurn(1, pass());
    expect(rounds()[0].turns).toMatchObject([{ id, phase: 'action', action: { kind: 'pass' } }]);
    act().updateTurn(id, { ...rounds()[0].turns[0], gains: ['relic:shard'] });
    expect(round().entries[0]).toMatchObject({ id, type: 'pass', gains: ['relic:shard'] });
    const before = saved();
    act().updateTurn(id, rounds()[0].turns[0]);
    expect(saved()).toBe(before);
    act().setStatus(id, 'done');
    expect(round().entries[0].status).toBe('done');
    act().removeTurn(id);
    expect(rounds()[0].turns).toEqual([]);
    act().undo();
    expect(rounds()[0].turns).toHaveLength(1);
  });

  test('an edit of one round keeps the other rounds as they were', () => {
    act().addRound();
    const second = rounds()[1];
    act().addTurn(1, pass());
    expect(rounds()[1]).toBe(second);
  });

  test('a free action is nested in its card and a copy of the plan gives both fresh ids', () => {
    const card = act().addTurn(1, { ...pass(), action: { kind: 'strategic', card: 6 } });
    const free = act().addTurn(1, { ...pass(), action: { kind: 'tactical', system: 'B', movement: [], invasion: [], free: true } }, card);
    expect(rounds()[0].turns).toHaveLength(1);
    expect(round().entries.map(e => e.id)).toEqual([card, free]);
    act().copyPlan();
    const copy = rounds()[0].turns[0];
    expect(copy.id).not.toBe(card);
    expect((copy.action as { nested: { id: string }[] }).nested[0].id).not.toBe(free);
  });

  test('a game set by hand on the old view becomes the saved game', () => {
    const other = structuredClone(game());
    other.plans[0].rounds[0].strategyCard = 5;
    useGame.setState({ game: other });
    expect(rounds()[0].strategyCard).toBe(5);
    useGame.setState({ game: null });
    expect(act().saved).toBeNull();
  });
});
