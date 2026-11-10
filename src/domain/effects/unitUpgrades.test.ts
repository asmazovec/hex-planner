/**
 * Unit upgrades through the effects engine: one test per upgrade technology, named by its component id, with the
 * numbers of the unit before and after as the faction sheet prints them. The modifiers themselves hold no number:
 * they read `UnitDef.levels`, the faction's own ships and `StructureDef.levels`.
 */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../data/loadPack';
import { holdingsOf } from '../holdings';
import { shipSpeed } from '../movement';
import { createGame } from '../newGame';
import { capacity } from '../replay/transport';
import type { Holdings, StructureKind, UnitId } from '../types';
import { productionCost } from '../unitStats';
import { applied } from './apply';
import { effectOf } from './registry';

const pack = loadPack(['pok', 'te']);
type Numbers = [move: number | null, capacity: number, cost: number];

/** What the steps of the count give for one unit of a faction: its move, its capacity, and its cost, counted over a pair. */
const numbers = (faction: string, kind: UnitId, held: Holdings): Numbers => {
  const game = createGame({ expansions: ['pok', 'te'], playerCount: 6, faction }, pack);
  return [shipSpeed(game, kind, held, pack), capacity(game, { [kind]: 1 }, held, pack).capacity, productionCost({ [kind]: 2 }, faction, held, pack) / 2];
};

/** The unit has `one` without the technology and `two` with it; another unit of the faction is left alone. */
function unit(id: string, faction: string, kind: UnitId, one: Numbers, two: Numbers): void {
  expect(effectOf(pack, id)).toMatchObject({ tier: 'passive', rule: '97.4' });
  const held = holdingsOf({ technologies: [id] });
  expect(numbers(faction, kind, holdingsOf())).toEqual(one);
  expect(numbers(faction, kind, held)).toEqual(two);
  const other: UnitId = kind === 'cruiser' ? 'carrier' : 'cruiser';
  expect(numbers(faction, other, held)).toEqual(numbers(faction, other, holdingsOf()));
  // The point names the technology only where it changed the number.
  const changed = one[0] !== two[0];
  expect(applied(pack, held, 'speed', one[0] ?? 0, { faction, unit: kind }).by).toEqual(changed ? [id] : []);
}

function dock(id: string, one: number, two: number): void {
  expect(effectOf(pack, id)).toMatchObject({ tier: 'passive', rule: '97.4' });
  const planetId = Object.keys(pack.planets)[0];
  const resources = pack.planets[planetId].resources;
  const ctx = { structure: 'spacedock' as const, planetId };
  expect(applied(pack, holdingsOf(), 'productionValue', resources + one, ctx)).toEqual({ value: resources + one, by: [] });
  expect(applied(pack, holdingsOf({ technologies: [id] }), 'productionValue', resources + one, ctx)).toEqual({ value: resources + two, by: [id] });
}

function shownOnly(id: string, kind: StructureKind): void {
  expect(effectOf(pack, id)).toEqual({ tier: 'passive', rule: '97.4', modify: {} });
  expect(pack.technologies[id.slice('technology:'.length)].upgrade).toBe(kind);
}

describe('unit upgrades as passive effects (LRR 97.4)', () => {
  test('technology:lw2 — Letani Warrior II: the infantry of arborec goes from move null, capacity 0, cost 0.5 to move null, capacity 0, cost 0.5', () => unit('technology:lw2', 'arborec', 'infantry', [null, 0, 0.5], [null, 0, 0.5]));
  test('technology:sdn2 — Super Dreadnought II: the dreadnought of l1z1x goes from move 1, capacity 2, cost 4 to move 2, capacity 2, cost 4', () => unit('technology:sdn2', 'l1z1x', 'dreadnought', [1, 2, 4], [2, 2, 4]));
  test('technology:pws2 — Prototype War Sun II: the warsun of muaat goes from move 1, capacity 6, cost 12 to move 3, capacity 6, cost 10', () => unit('technology:pws2', 'muaat', 'warsun', [1, 6, 12], [3, 6, 10]));
  test('technology:hcf2 — Hybrid Crystal Fighter II: the fighter of naalu goes from move null, capacity 0, cost 0.5 to move 2, capacity 0, cost 0.5', () => unit('technology:hcf2', 'naalu', 'fighter', [null, 0, 0.5], [2, 0, 0.5]));
  test('technology:ffac2 — Floating Factory II: a dock\'s Production is its planet\'s resources plus 4 instead of plus 2', () => dock('technology:ffac2', 2, 4));
  test('technology:exo2 — Exotrireme II: the dreadnought of sardakk goes from move 1, capacity 1, cost 4 to move 2, capacity 1, cost 4', () => unit('technology:exo2', 'sardakk', 'dreadnought', [1, 1, 4], [2, 1, 4]));
  test('technology:so2 — Spec Ops II: the infantry of sol goes from move null, capacity 0, cost 0.5 to move null, capacity 0, cost 0.5', () => unit('technology:so2', 'sol', 'infantry', [null, 0, 0.5], [null, 0, 0.5]));
  test('technology:ac2 — Advanced Carrier II: the carrier of sol goes from move 1, capacity 6, cost 3 to move 2, capacity 8, cost 3', () => unit('technology:ac2', 'sol', 'carrier', [1, 6, 3], [2, 8, 3]));
  test('technology:ws — War Sun: the warsun of arborec goes from move 2, capacity 6, cost 12 to move 2, capacity 6, cost 12', () => unit('technology:ws', 'arborec', 'warsun', [2, 6, 12], [2, 6, 12]));
  test('technology:sd2 — Space Dock II: a dock\'s Production is its planet\'s resources plus 4 instead of plus 2', () => dock('technology:sd2', 2, 4));
  test('technology:cr2 — Cruiser II: the cruiser of arborec goes from move 2, capacity 0, cost 2 to move 3, capacity 1, cost 2', () => unit('technology:cr2', 'arborec', 'cruiser', [2, 0, 2], [3, 1, 2]));
  test('technology:dn2 — Dreadnought II: the dreadnought of arborec goes from move 1, capacity 1, cost 4 to move 2, capacity 1, cost 4', () => unit('technology:dn2', 'arborec', 'dreadnought', [1, 1, 4], [2, 1, 4]));
  test('technology:dd2 — Destroyer II: the destroyer of arborec goes from move 2, capacity 0, cost 1 to move 2, capacity 0, cost 1', () => unit('technology:dd2', 'arborec', 'destroyer', [2, 0, 1], [2, 0, 1]));
  test('technology:pds2 — PDS II: passive with no count to change; the numbers of a PDS are only shown', () => shownOnly('technology:pds2', 'pds'));
  test('technology:cv2 — Carrier II: the carrier of arborec goes from move 1, capacity 4, cost 3 to move 2, capacity 6, cost 3', () => unit('technology:cv2', 'arborec', 'carrier', [1, 4, 3], [2, 6, 3]));
  test('technology:ff2 — Fighter II: the fighter of arborec goes from move null, capacity 0, cost 0.5 to move 2, capacity 0, cost 0.5', () => unit('technology:ff2', 'arborec', 'fighter', [null, 0, 0.5], [2, 0, 0.5]));
  test('technology:inf2 — Infantry II: the infantry of arborec goes from move null, capacity 0, cost 0.5 to move null, capacity 0, cost 0.5', () => unit('technology:inf2', 'arborec', 'infantry', [null, 0, 0.5], [null, 0, 0.5]));
  test('technology:swa2 — Strike Wing Alpha II: the destroyer of argent goes from move 2, capacity 1, cost 1 to move 2, capacity 1, cost 1', () => unit('technology:swa2', 'argent', 'destroyer', [2, 1, 1], [2, 1, 1]));
  test('technology:dt2 — Dimensional Tear II: a dock\'s Production is its planet\'s resources plus 4 instead of plus 2', () => dock('technology:dt2', 2, 4));
  test('technology:cl2 — Crimson Legionnaire II: the infantry of mahact goes from move null, capacity 0, cost 0.5 to move null, capacity 0, cost 0.5', () => unit('technology:cl2', 'mahact', 'infantry', [null, 0, 0.5], [null, 0, 0.5]));
  test('technology:m2 — Memoria II: the flagship of nomad goes from move 1, capacity 3, cost 8 to move 2, capacity 6, cost 8', () => unit('technology:m2', 'nomad', 'flagship', [1, 3, 8], [2, 6, 8]));
  test('technology:ht2 — Hel-Titan II: passive with no count to change; the numbers of a PDS are only shown', () => shownOnly('technology:ht2', 'pds'));
  test('technology:se2 — Saturn Engine II: the cruiser of titans goes from move 2, capacity 1, cost 2 to move 3, capacity 2, cost 2', () => unit('technology:se2', 'titans', 'cruiser', [2, 1, 2], [3, 2, 2]));
  test('technology:helios2 — 4X41C "Helios" V2: a dock\'s Production is its planet\'s resources plus 4 instead of plus 2', () => dock('technology:helios2', 2, 4));
  test('technology:exile2 — Exile II: the destroyer of crimson goes from move 2, capacity 0, cost 1 to move 2, capacity 0, cost 1', () => unit('technology:exile2', 'crimson', 'destroyer', [2, 0, 1], [2, 0, 1]));
  test('technology:linkship2 — Linkship II: the destroyer of ralnel goes from move 3, capacity 0, cost 1 to move 4, capacity 0, cost 1', () => unit('technology:linkship2', 'ralnel', 'destroyer', [3, 0, 1], [4, 0, 1]));
});
