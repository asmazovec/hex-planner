/** Thunder's Edge: The Fracture. Source: tirules2 rules-reference/fracture.md (Notes; no LRR section). */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../../data/loadPack';
import { slotsFor } from '../../mapBuilder';
import { routeDistances, routeReach, systemsAdjacent } from '../../../testing/old/domain/project';
import { fractureSlots } from '../../thundersEdge';
import type { Game } from '../../types';
import { FAR, FARTHER, NEAR, rulesGame, rulesPack } from '../kit';

const te = loadPack(['pok', 'te']);
const tePack = () => rulesPack(p => { Object.assign(p.tiles, te.tiles); Object.assign(p.planets, te.planets); });

const FRACTURE_IDS = Object.values(te.tiles).filter(t => t.kind === 'fracture').map(t => t.id).sort();

/** The test row with the seven Fracture systems continuing it beyond FARTHER, on slots 5,0 to 11,0. */
function fractureGame(ingress: string[] = []): Game {
  const tiles = Object.fromEntries(FRACTURE_IDS.map((id, i) => [`${5 + i},0`, id]));
  return rulesGame({ game: { expansions: ['pok', 'te'], fracture: { active: true, ingress, seat: null, tiles } } });
}

const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1]];

describe("Thunder's Edge: The Fracture", () => {
  test('fracture 1: the Fracture systems lie beyond the regular map', () => {
    const template = new Set(slotsFor(6, te).map(s => `${s.q},${s.r}`));
    const slots = fractureSlots(1, 6, te);
    expect(slots).toHaveLength(FRACTURE_IDS.length);
    for (const slot of slots) expect(template.has(`${slot.q},${slot.r}`)).toBe(false);
  });

  test.todo('fracture 2: gaining a breakthrough makes a roll, and a 1 or 10 brings in the Fracture — not modelled: the Fracture is opened by hand');
  test.todo('fracture 2.1: the 0 face of the d10 reads as 10 — not modelled: no roll is made');

  test('fracture 3: the Fracture is placed against the edge of the map', () => {
    const template = new Set(slotsFor(6, te).map(s => `${s.q},${s.r}`));
    const slots = fractureSlots(null, 6, te);
    const touches = slots.some(s => DIRECTIONS.some(([dq, dr]) => template.has(`${s.q + dq},${s.r + dr}`)));
    expect(touches).toBe(true);
  });

  test('fracture 3.1: where the Fracture lies has no effect: a Fracture system does not neighbour the map tile beside it', () => {
    const game = fractureGame();
    const pack = tePack();
    expect(systemsAdjacent(game)(FARTHER, '5,0')).toBe(false);
    expect(systemsAdjacent(game)('5,0', '6,0')).toBe(true);
    expect(routeReach(game, [FARTHER], 3, '9,0', pack).has('5,0')).toBe(false);
  });

  test.todo('fracture 3.2: Fracture systems and the map systems they touch are on the edge of the board — not modelled: the board edge is not used by any rule the app counts');
  test.todo('fracture 4: neutral units go on the Fracture planets and in their systems — not modelled: neutral units are not placed or tracked');

  test('fracture 5: each ingress is adjacent to each egress: a ship at an ingress reaches the Fracture in one step', () => {
    const game = fractureGame([NEAR]);
    const steps = routeDistances(game, NEAR, tePack());
    const oneStep = Object.keys(game.fracture.tiles ?? {}).filter(slot => steps.get(slot) === 1);
    expect(oneStep.length).toBeGreaterThan(0);
  });

  test('fracture 5: an ingress is not adjacent to another ingress', () => {
    const game = rulesGame({ game: { fracture: { active: true, ingress: [NEAR, FAR], seat: null, tiles: {} } } });
    expect(routeDistances(game, NEAR, rulesPack()).get(FAR)).toBe(2);
  });

  test('fracture 5.1: a ship can go from one ingress through an egress to another ingress', () => {
    // NEAR and FARTHER are three steps apart on the row; ingress, egress, ingress takes two.
    const game = fractureGame([NEAR, FARTHER]);
    expect(routeDistances(game, NEAR, tePack()).get(FARTHER)).toBe(2);
  });

  test.todo('fracture 6: a breakthrough roll places three ingress per synergy colour, on planets of that specialty — not modelled: ingress tokens are marked by hand');
  test.todo('fracture 6.1: with fewer than three such planets as many as possible are chosen — not modelled: ingress tokens are marked by hand');
  test.todo('fracture 7: other causes, and the Nekro breakthrough, place one ingress per technology colour — not modelled: ingress tokens are marked by hand');
  test.todo('fracture 8: of two specialty planets in one system only one may be chosen — not modelled: ingress tokens are marked by hand');
  test.todo('fracture 9: one more ingress goes to Thunder\'s Edge, or to Mecatol Rex without it — not modelled: ingress tokens are marked by hand');
  test.todo('fracture 10: a system holds at most one ingress — not modelled in the domain: the store toggles a mark per system (gameStore.test covers it)');
  test.todo('fracture 11: taking an uncontrolled Fracture planet draws a relic — not modelled: relics are not tracked (the planet only shows the relic icon)');
});
