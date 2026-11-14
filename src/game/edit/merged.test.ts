/** The taps of the big hex against the old edit of entries: the round they make is the round the old edit makes. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import type { MergedChange } from '../../domain/losses';
import { changeOnBoard as oldChange } from '../../testing/oldMerged';
import { createGame } from '../../testing/old/domain/newGame';
import type { AdjustmentKind, Phase, UnitId } from '../../domain/types';
import type { Entry, EntryBody, Game } from '../../testing/old/domain/types';
import { savedOf } from '../../testing/legacySave';
import { boardOf, planOf, tableOf } from '../../testing/old/game/fromLegacy';
import { changeOnBoard, mergedTurn } from './merged';

const pack = loadPack(['pok']);
const SLOT = '1,0';
const FROM = '0,1';
const noPay = { planets: [], tradeGoods: 0 };
let ids = 0;
const newId = () => `id${(ids += 1)}`;
const entry = (body: EntryBody, phase: Phase, id: string): Entry => ({ ...body, id, phase, status: 'planned' }) as Entry;

function game(entries: Entry[]): Game {
  const g = createGame({ expansions: ['pok'], playerCount: 4, faction: 'sol' }, pack);
  g.map[SLOT] = '25';
  g.map[FROM] = '26';
  g.plans[0].rounds[0] = { ...g.plans[0].rounds[0], entries };
  return g;
}

/** Both edits of the same tap: the old one on the game's entries, the new one on its turns. */
function tap(g: Game, change: MergedChange) {
  const saved = savedOf(g);
  ids = 0;
  const old = oldChange(g, g.plans[0].rounds[0], change, pack, newId);
  ids = 0;
  const table = tableOf(g);
  const made = changeOnBoard(table, boardOf(g, pack), pack, saved.plans[0].rounds, 1, change, newId)!;
  const expected = planOf(table, { rounds: [old] } as Parameters<typeof planOf>[1], pack)[0];
  expect(made).toEqual({ ...expected, held: saved.plans[0].rounds[0].held });
  return { made, same: made === saved.plans[0].rounds[0] };
}
const remove = (g: Game, unit: UnitId, planetId: string | null = null, kind: AdjustmentKind = 'losses') =>
  tap(g, { kind, systemId: SLOT, unit, planetId, amount: -1 });

const startFleet = entry({ type: 'adjustment', label: '', delta: { units: { systemId: FROM, units: { carrier: 1 } } } }, 'strategy', 'fleet');
const tacticalIn = entry({ type: 'tactical', systemId: SLOT, moves: [{ from: FROM, units: { carrier: 1 } }], landings: [], production: {}, payment: noPay }, 'action', 'move');
const earlier = entry({ type: 'adjustment', label: '', kind: 'losses', delta: { units: { systemId: SLOT, units: { fighter: -1 } } } }, 'action', 'merged');
const fighters = entry({ type: 'adjustment', label: '', delta: { units: { systemId: SLOT, units: { fighter: 2 } } } }, 'strategy', 'fighters');
const later = entry({ type: 'adjustment', label: '', delta: { units: { systemId: SLOT, units: { carrier: 1 } } } }, 'status', 'later');

describe('a tap on the big hex', () => {
  test('the first tap makes a turn, the next go into it, one that nets to nothing goes', () => {
    const g = game([]);
    const [made] = tap(g, { kind: 'setup', systemId: SLOT, unit: 'cruiser', planetId: null, amount: 1 }).made.turns;
    expect(made.status).toBe('done');
    tap(game([earlier]), { kind: 'losses', systemId: SLOT, unit: 'carrier', planetId: null, amount: 1 });
    tap(game([earlier]), { kind: 'losses', systemId: SLOT, unit: 'fighter', planetId: null, amount: 1 });
    tap(game([earlier]), { kind: 'losses', systemId: SLOT, unit: 'infantry', planetId: 'quann', amount: -1 });
  });

  test('a unit that arrives by a later tactical action: the turn moves behind it', () => {
    const { made } = remove(game([startFleet, fighters, earlier, tacticalIn]), 'carrier');
    expect(made.turns.map(t => t.id)).toEqual(['fleet', 'fighters', 'move', 'merged']);
    expect(mergedTurn(made, 'losses', SLOT)).toBeDefined();
  });

  test('a unit added by an adjustment of a later phase: the turn follows it there', () => {
    const { made } = remove(game([fighters, earlier, later]), 'carrier');
    expect(mergedTurn(made, 'losses', SLOT)?.phase).toBe('status');
  });

  test('a new turn too, and a ground unit landed later', () => {
    remove(game([later]), 'carrier');
    const planet = pack.tiles['25'].planetIds[0];
    const fleet = entry({ type: 'adjustment', label: '', delta: { units: { systemId: FROM, units: { carrier: 1, infantry: 1 } } } }, 'strategy', 'fleet');
    const land = entry({ type: 'tactical', systemId: SLOT, moves: [{ from: FROM, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: planet, units: { infantry: 1 } }], production: {}, payment: noPay }, 'action', 'move');
    remove(game([fleet, fighters, earlier, land]), 'infantry', planet);
  });

  test('a removal that already counts leaves the turn where it is, one of what nobody has writes no ghost', () => {
    remove(game([startFleet, fighters, earlier, tacticalIn]), 'fighter');
    expect(remove(game([fighters]), 'dreadnought').same).toBe(true);
  });

  test('taking a purchase back that nets to nothing removes the turn', () => {
    const g = game([]);
    tap(g, { kind: 'build', systemId: SLOT, unit: 'carrier', planetId: null, amount: 1 });
    const bought = game([entry({ type: 'adjustment', label: '', kind: 'build', delta: { units: { systemId: SLOT, units: { carrier: 1 } } } }, 'action', 'bought')]);
    expect(remove(bought, 'carrier', null, 'build').made.turns).toEqual([]);
  });

  test('a removal with no place of its own turn that reproduces the board gets a turn at the end of the action phase', () => {
    const a = entry({ type: 'adjustment', label: '', delta: { units: { systemId: SLOT, units: { carrier: 1 } } } }, 'action', 'a');
    remove(game([a, tacticalIn]), 'carrier');
  });
});
