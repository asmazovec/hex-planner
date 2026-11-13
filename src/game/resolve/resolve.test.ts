/** The resolver on the rules test board: events and violations of a tactical turn, step by step. */
import { describe, expect, test } from 'vitest';
import { FAR, HOME, NEAR, rulesGame, rulesPack, tactical, TARGET } from '../../domain/rules/kit';
import type { Entry } from '../../domain/types';
import { applyAll } from '../apply';
import { emptyBoard } from '../board';
import type { GameEvent } from '../events';
import { tableOf, turnOf } from '../fromLegacy';
import { groundOn, ownerOf, poolsOf, shipsIn, tokensOnMap } from '../queries';
import { resolveTurn } from './index';

const pack = rulesPack();
const game = rulesGame({
  game: { opponents: [{ id: 'o1', faction: 'rules-tester', vp: 0, seat: 2, color: 2 }] },
});
const table = tableOf(game);
const [me, rival] = table.players.map(p => p.id);

/** A board with some units, the tokens of a pool and planets, as events say it. */
function boardWith(events: GameEvent[]) {
  return applyAll(emptyBoard(table), [
    { type: 'TokensChanged', player: me, delta: { tactic: 3, fleet: 3, strategy: 2 } },
    { type: 'TokensChanged', player: rival, delta: { tactic: 3, fleet: 3, strategy: 2 } },
    { type: 'PlanetGained', player: me, planet: 'h1' },
    ...events,
  ]);
}

const resolve = (board: ReturnType<typeof boardWith>, entry: Entry) => resolveTurn(table, board, turnOf(table, entry, pack), pack);
const codes = (r: ReturnType<typeof resolve>) => r.steps.flatMap(s => s.violations.map(v => v.code));

describe('a tactical turn on the kernel', () => {
  test('activation puts a token in the system and takes one from the pool', () => {
    const r = resolve(boardWith([]), tactical(TARGET));
    expect(tokensOnMap(r.board, me)).toEqual([TARGET]);
    expect(poolsOf(r.board, me).tactic).toBe(2);
    expect(r.steps[0].step).toBe('activation');
  });

  test('a second activation of the same system warns and an empty pool is reported, as the replay words them', () => {
    const board = applyAll(boardWith([]), [{ type: 'SystemActivated', player: me, system: TARGET }, { type: 'TokensChanged', player: me, delta: { tactic: -3 } }]);
    expect(codes(resolve(board, tactical(TARGET)))).toEqual(expect.arrayContaining(['systemHasToken', 'poolNegative']));
  });

  test('a flight carries the units and reports what the source did not hold; what was entered arrives all the same', () => {
    const board = boardWith([{ type: 'UnitsPlaced', player: me, at: { slot: NEAR }, units: { cruiser: 1 } }]);
    const r = resolve(board, tactical(TARGET, { moves: [{ from: NEAR, units: { cruiser: 2 } }] }));
    expect(shipsIn(r.board, TARGET, me)).toEqual({ cruiser: 2 });
    expect(shipsIn(r.board, NEAR, me)).toEqual({});
    const missing = r.steps.flatMap(s => s.violations).filter(v => v.code === 'unitsMissing');
    expect(missing.map(v => v.params)).toEqual([{ where: NEAR, unit: 'cruiser', missing: 1 }]);
  });

  test('the losses of both sides leave the active system', () => {
    const board = boardWith([
      { type: 'UnitsPlaced', player: me, at: { slot: TARGET }, units: { cruiser: 2 } },
      { type: 'UnitsPlaced', player: rival, at: { slot: TARGET }, units: { destroyer: 2 } },
    ]);
    const r = resolveTurn(table, board, { ...turnOf(table, tactical(TARGET), pack), action: {
      kind: 'tactical', system: TARGET, movement: [], invasion: [], spaceCombat: { [me]: { cruiser: 1 }, [rival]: { destroyer: 2 } },
    } }, pack);
    expect(shipsIn(r.board, TARGET, me)).toEqual({ cruiser: 1 });
    expect(shipsIn(r.board, TARGET, rival)).toEqual({});
  });

  test('a landing that holds a planet takes it exhausted, and the structures of its old owner go', () => {
    const board = boardWith([
      { type: 'UnitsPlaced', player: me, at: { slot: TARGET }, units: { infantry: 2 } },
      { type: 'PlanetGained', player: rival, planet: 't1' },
      { type: 'StructurePlaced', player: rival, at: { planet: 't1' }, structures: { pds: 1 } },
    ]);
    const r = resolve(board, tactical(TARGET, { landings: [{ planetId: 't1', units: { infantry: 2 } }] }));
    expect(ownerOf(r.board, 't1')).toBe(me);
    expect(r.board.planets.t1.exhausted).toBe(true);
    expect(r.board.planets.t1.structures).toEqual({});
    expect(groundOn(r.board, 't1', me)).toEqual({ infantry: 2 });
  });

  test('landing more than stands in the space area lands all the same and warns', () => {
    const r = resolve(boardWith([{ type: 'UnitsPlaced', player: me, at: { slot: TARGET }, units: { infantry: 1 } }]),
      tactical(TARGET, { landings: [{ planetId: 't2', units: { infantry: 3 } }] }));
    expect(groundOn(r.board, 't2', me)).toEqual({ infantry: 3 });
    expect(codes(r)).toContain('landingOverLimit');
  });

  test('production places ships in the system and ground forces on the planet of the dock, and is paid', () => {
    const board = boardWith([{ type: 'StructurePlaced', player: me, at: { planet: 'h1' }, structures: { spacedock: 1 } }]);
    const r = resolve(board, tactical(HOME, { production: { cruiser: 1, infantry: 2 }, payment: { planets: ['h1'], tradeGoods: 0 } }));
    expect(shipsIn(r.board, HOME, me)).toEqual({ cruiser: 1 });
    expect(groundOn(r.board, 'h1', me)).toEqual({ infantry: 2 });
    expect(r.board.planets.h1.exhausted).toBe(true);
    expect(codes(r)).not.toContain('shortResources');
  });

  test('every step reports its own events and violations in the order of the rules', () => {
    const r = resolve(boardWith([{ type: 'UnitsPlaced', player: me, at: { slot: HOME }, units: { carrier: 1 } }]),
      tactical(TARGET, { moves: [{ from: HOME, units: { carrier: 1 }, via: [NEAR] }] }));
    const order = r.steps.map(s => s.step);
    expect(order.indexOf('activation')).toBeLessThan(order.indexOf('movement'));
    expect(r.steps.find(s => s.step === 'movement')!.events[0]).toMatchObject({ type: 'UnitsMoved', from: { slot: HOME }, to: { slot: TARGET } });
  });

  test('a pass has no tactical step: it records the pass', () => {
    const board = boardWith([]);
    const turn = { ...turnOf(table, tactical(TARGET), pack), action: { kind: 'pass' as const } };
    expect(resolveTurn(table, board, turn, pack).board.players[me].passed).toBe(true);
  });

  test('the rival\'s turn is resolved for the rival', () => {
    const entry = tactical(TARGET, { moves: [{ from: FAR, units: { cruiser: 1 } }] }, { owner: 'o1' });
    const r = resolve(boardWith([{ type: 'UnitsPlaced', player: rival, at: { slot: FAR }, units: { cruiser: 1 } }]), entry);
    expect(shipsIn(r.board, TARGET, rival)).toEqual({ cruiser: 1 });
    expect(tokensOnMap(r.board, rival)).toEqual([TARGET]);
    expect(tokensOnMap(r.board, me)).toEqual([]);
  });
});

describe('the resolver\'s place in the layers', () => {
  const raw = import.meta.glob<string>(['./*.ts', '../*.ts'], { query: '?raw', import: 'default', eager: true });
  test('nothing in the kernel or the resolver imports the interface, the stores or React, and only apply.ts writes a board', () => {
    for (const [file, text] of Object.entries(raw)) {
      const imports = [...text.matchAll(/from '([^']+)'/g)].map(m => m[1]);
      for (const path of imports) expect(path, `${file} imports ${path}`).not.toMatch(/^(\.\.\/)+(ui|state|storage)(\/|$)|^react/);
      if (!file.endsWith('apply.ts')) expect(imports.filter(p => /(^|\/)draft$/.test(p)), `${file} imports draft`).toEqual([]);
    }
  });
});
