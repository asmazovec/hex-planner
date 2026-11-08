/** Thunder's Edge: Entropic Scars. Source: tirules2 rules-reference/entropic-scars.md (Notes; no LRR section). */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../../data/loadPack';
import { FAR, HOME, NEAR, TARGET, codesOf, primary, rulesGame, rulesPack, secondary, tactical } from '../kit';

const te = loadPack(['pok', 'te']);
const tePack = () => rulesPack(p => { Object.assign(p.tiles, te.tiles); Object.assign(p.planets, te.planets); });

/** Tile 114 is an empty entropic scar, 116 a scar with the planet Lemox. */
const SCAR_PLANET = 'lemox';

describe("Thunder's Edge: Entropic Scars", () => {
  test('entropic scars 1: a scar is an anomaly that leaves movement alone', () => {
    const pack = tePack();
    expect(pack.tiles['114'].anomaly).toBe('scar');
    const go = tactical(TARGET, { moves: [{ from: HOME, units: { cruiser: 1 }, via: [NEAR] }] });
    const game = rulesGame({ map: { [HOME]: 'r-home', [NEAR]: '114', [TARGET]: 'r-target', [FAR]: '114' }, units: { [HOME]: { cruiser: 1 } }, entries: [go] });
    expect(codesOf(game, pack, go)).toEqual([]);
    // Starting in a scar does not slow a ship, unlike a nebula.
    const out = tactical(NEAR, { moves: [{ from: FAR, units: { cruiser: 1 }, via: [TARGET] }] });
    const back = rulesGame({ map: { [HOME]: 'r-home', [NEAR]: 'r-empty', [TARGET]: 'r-empty', [FAR]: '114' }, units: { [FAR]: { cruiser: 1 } }, entries: [out] });
    expect(codesOf(back, pack, out)).not.toContain('speedShort');
  });

  test('entropic scars 2: units in a scar cannot use Production', () => {
    const pack = tePack();
    const build = tactical(TARGET, { production: { destroyer: 1 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const game = rulesGame({
      map: { [HOME]: 'r-home', [TARGET]: '116' }, entries: [build],
      game: { expansions: ['pok', 'te'], planetControl: { [SCAR_PLANET]: 'me' }, docks: [SCAR_PLANET] },
    });
    expect(codesOf(game, pack, build)).toContain('scarProduction');
  });

  test.todo('entropic scars 2.1: only unit abilities are lost, text abilities stay — not modelled: abilities are not counted');

  test('entropic scars 2.2: a space dock in a scar produces nothing, so a strategy card cannot produce there either', () => {
    const pack = tePack();
    const build = primary(4, { production: { systemId: TARGET, units: { destroyer: 1 } }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const home = secondary(6, { production: { systemId: TARGET, units: { destroyer: 1 } }, payment: { planets: ['h2'], tradeGoods: 0 } });
    const game = rulesGame({
      map: { [HOME]: 'r-home', [TARGET]: '116' }, entries: [build, home],
      game: { expansions: ['pok', 'te'], planetControl: { [SCAR_PLANET]: 'me' }, docks: [SCAR_PLANET] },
    });
    expect(codesOf(game, pack, build)).toContain('scarProduction');
    expect(codesOf(game, pack, home)).toContain('scarProduction');
  });

  test.todo('entropic scars 2.3: a unit that lost Deploy cannot use the text describing it — not modelled: Deploy is not counted');
  test.todo('entropic scars 3: units outside cannot use unit abilities against units in a scar — not modelled: combat abilities are not counted');
  test.todo('entropic scars 4: wormhole tokens placed in a scar go back — not modelled: wormhole tokens are not tracked');
  test.todo('entropic scars 5: at the start of the status phase ships in a scar let a strategy token buy a faction technology — not modelled: faction technologies other than unit upgrades are not tracked');
  test.todo('entropic scars 5.1: no prerequisites are needed for that technology — not modelled: prerequisites are not checked');
  test.todo('entropic scars 5.2: ground forces in a scar do not qualify — not modelled: see 5');
  test.todo('entropic scars 5.3: ships in two scars allow two tokens for both faction technologies — not modelled: see 5');
});
