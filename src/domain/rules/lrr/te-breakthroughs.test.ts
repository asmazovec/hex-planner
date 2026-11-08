/** Thunder's Edge: Breakthroughs. Source: tirules2 rules-reference/breakthroughs.md (Notes; no LRR section). */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../../data/loadPack';
import { factionSheet } from '../../factionSheet';

describe("Thunder's Edge: Breakthroughs", () => {
  test('breakthroughs 1: a breakthrough is a card of one faction, present only with Thunder\'s Edge', () => {
    const pack = loadPack(['pok', 'te']);
    const withSheets = Object.values(pack.factions).filter(f => f.sheet?.breakthrough);
    expect(withSheets.length).toBeGreaterThan(0);
    // The three Keleres sheets are one faction and share theirs; no two other factions do.
    const ids = withSheets.filter(f => !f.id.startsWith('keleres')).map(f => f.sheet!.breakthrough!.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const faction of withSheets) {
      expect(factionSheet(faction, ['pok', 'te']).breakthrough?.id).toBe(faction.sheet!.breakthrough!.id);
      expect(factionSheet(faction, ['pok']).breakthrough).toBeUndefined();
    }
  });

  test.todo('breakthroughs 1: players start the game without their breakthrough — not modelled: whether a breakthrough is held is not tracked');
  test.todo('breakthroughs 2: a breakthrough is gained through an expedition, the Thunder\'s Edge ability or other effects — not modelled: gaining it is not tracked');
  test.todo('breakthroughs 3: gaining the breakthrough makes a roll that may bring in the Fracture — not modelled: the Fracture is opened by hand');
  test.todo('breakthroughs 4: a breakthrough has abilities and a synergy, except Nekro\'s — not modelled: abilities and synergies are shown only');
  test.todo('breakthroughs 4.1: a passive ability works while the breakthrough is exhausted — not modelled: breakthroughs are not exhausted');
  test.todo('breakthroughs 4.2: the synergy works while the breakthrough is exhausted — not modelled: synergies are not counted');
  test.todo('breakthroughs 5: a breakthrough is no technology for prerequisites or objectives — not modelled: prerequisites and objectives are not checked');
  test.todo('breakthroughs 6: faction pages hold notes on each breakthrough — not modelled: a pointer, no rule of its own');
});
