/** LRR 54 Mecatol Rex. Source: tirules2 rules-reference/mecatol-rex.md. */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../../data/loadPack';
import { MECATOL_PLANET, MECATOL_PLANET_TE, MECATOL_TILE, MECATOL_TILE_TE } from '../../mecatol';
import { codesOf, HOME, rulesGame, rulesPack, tactical } from '../kit';

const pack = rulesPack();
const MECATOL = '0,-1';

describe('LRR 54 Mecatol Rex', () => {
  test('54 (intro): Mecatol Rex stands at the centre of every map template', () => {
    for (const template of loadPack(['pok']).templates) expect(template.slots.find(s => s.q === 0 && s.r === 0)?.fixed).toBe(MECATOL_TILE);
    for (const template of loadPack(['pok', 'te']).templates) expect(template.slots.find(s => s.q === 0 && s.r === 0)?.fixed).toBe(MECATOL_TILE_TE);
  });

  test('54.1: committing ground forces to Mecatol Rex with the custodians token still on it is warned about', () => {
    const land = tactical(MECATOL, {
      moves: [{ from: HOME, units: { carrier: 1, infantry: 1 } }],
      landings: [{ planetId: MECATOL_PLANET, units: { infantry: 1 } }],
    });
    const game = rulesGame({ map: { ...rulesGame().map, [MECATOL]: MECATOL_TILE }, units: { [HOME]: { carrier: 1, infantry: 1 } }, entries: [land] });
    expect(codesOf(game, pack, land)).toContain('custodians');
  });


  test('54 note 1: Mecatol Rex of tile 18 is not legendary, that of tile 112 is', () => {
    const te = loadPack(['pok', 'te']);
    expect(te.planets[MECATOL_PLANET]?.legendary).toBeUndefined();
    expect(te.planets[MECATOL_PLANET_TE]?.legendary).toBeDefined();
    expect(te.tiles[MECATOL_TILE_TE]?.planetIds).toEqual([MECATOL_PLANET_TE]);
  });
});
