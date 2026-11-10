/** Thunder's Edge: Expeditions. Source: tirules2 rules-reference/expedition.md (Notes; no LRR section). */
import { describe, expect, test } from 'vitest';
import { loadPack } from '../../../data/loadPack';
import { systemPlanets } from '../../project';
import { validThundersEdgeSystem } from '../../thundersEdge';
import type { Entry, Payment } from '../../types';
import { HOME, NO_PAYMENT, TARGET, adjust, codesOf, forecast, rulesGame, rulesPack, tactical } from '../kit';

let next = 0;
/** A turn (a component action) that ends with an expedition: the expedition is an act of the turn (expedition 2). */
const expedition = (sliceId: string, payment: Payment = NO_PAYMENT, extra: Partial<Entry> = {}): Entry =>
  ({ id: `x${(next += 1)}`, phase: 'action', status: 'planned', type: 'component', note: '', acts: [{ kind: 'expedition', sliceId, payment }], ...extra } as Entry);

const RIVAL = { id: 'o1', faction: 'rules-tester', vp: 0, seat: 2, color: 2 };
const te = loadPack(['pok', 'te']);
const tePack = () => rulesPack(p => {
  Object.assign(p.tiles, te.tiles);
  Object.assign(p.planets, te.planets);
});

describe("Thunder's Edge: Expeditions", () => {
  test.todo('expedition 1: an expedition unlocks the breakthrough and may bring in the Fracture and Thunder\'s Edge — not modelled: breakthroughs are not tracked, both are put in play by hand');

  test('expedition 2: claiming a slice nobody holds is allowed', () => {
    const pack = rulesPack();
    const claim = expedition('tg3');
    const game = rulesGame({ entries: [adjust({ tradeGoods: 3 }), claim] });
    expect(codesOf(game, pack, claim)).toEqual([]);
  });

  test('expedition 2: a slice another player already claimed cannot be claimed', () => {
    const pack = rulesPack();
    const claim = expedition('tg3');
    const game = rulesGame({ entries: [adjust({ tradeGoods: 3 }), claim], game: { expedition: { slices: { tg3: 'other' }, thundersEdgeSystem: null } } });
    expect(codesOf(game, pack, claim)).toContain('sliceTaken');
  });

  test.todo('expedition 3: performing an expedition gains the breakthrough and makes a breakthrough roll — not modelled: breakthroughs and the roll are not tracked');

  test('expedition 4.1: the five-resource slice is paid from planets and trade goods, and the planets are exhausted', () => {
    const pack = rulesPack();
    const claim = expedition('res5', { planets: ['h1', 'h2'], tradeGoods: 1 });
    const later = tactical(TARGET, { production: { fighter: 2 }, payment: { planets: ['h1'], tradeGoods: 0 } });
    const game = rulesGame({ entries: [adjust({ tradeGoods: 1 }), claim, later] });
    expect(codesOf(game, pack, claim)).toEqual([]);
    expect(codesOf(game, pack, later)).toContain('planetExhausted');
  });

  test('expedition 4.1: less than five resources is short', () => {
    const pack = rulesPack();
    const claim = expedition('res5', { planets: ['h1', 'h2'], tradeGoods: 0 });
    expect(codesOf(rulesGame({ entries: [claim] }), pack, claim)).toContain('shortResources');
  });

  test.todo('expedition 4.2: one slice costs two discarded action cards — not modelled: action cards are not tracked');

  test('expedition 4.3: the five-influence slice counts influence, not resources', () => {
    const pack = rulesPack();
    // h1 3/1 and h2 1/2: four resources but only three influence.
    const short = expedition('inf5', { planets: ['h1', 'h2'], tradeGoods: 1 });
    expect(codesOf(rulesGame({ entries: [adjust({ tradeGoods: 1 }), short] }), pack, short)).toContain('shortInfluence');
    const paid = expedition('inf5', { planets: ['h1', 'h2'], tradeGoods: 2 });
    expect(codesOf(rulesGame({ entries: [adjust({ tradeGoods: 2 }), paid] }), pack, paid)).toEqual([]);
  });

  test.todo('expedition 4.4: one slice costs an unscored secret objective — not modelled: secret objectives are not tracked');

  test('expedition 4.5: the technology slice exhausts one of my planets with a technology specialty', () => {
    const pack = rulesPack(p => { p.planets.t1 = { ...p.planets.t1, tech: ['biotic'] }; });
    const claim = expedition('tech', { planets: ['t1'], tradeGoods: 0 });
    const later = tactical(TARGET, { production: { fighter: 2 }, payment: { planets: ['t1'], tradeGoods: 0 } });
    const game = rulesGame({ entries: [claim, later], game: { planetControl: { t1: 'me' } } });
    expect(codesOf(game, pack, claim)).toEqual([]);
    expect(codesOf(game, pack, later)).toContain('planetExhausted');
  });

  test('expedition 4.5: the technology slice without a planet exhausted is unpaid', () => {
    const pack = rulesPack(p => { p.planets.t1 = { ...p.planets.t1, tech: ['biotic'] }; });
    const claim = expedition('tech');
    const game = rulesGame({ entries: [claim], game: { planetControl: { t1: 'me' } } });
    // The editor offers no planet for this slice, so the planet that pays it stays ready for the rest of the round.
    expect(codesOf(game, pack, claim)).toContain('expeditionUnpaid');
  });

  test('expedition 4.5: a planet without a technology specialty cannot pay the technology slice', () => {
    const pack = rulesPack();
    const claim = expedition('tech', { planets: ['h1'], tradeGoods: 0 });
    expect(codesOf(rulesGame({ entries: [claim] }), pack, claim)).toContain('expeditionUnpaid');
  });

  test('expedition 4.5: a planet I do not control cannot pay the technology slice', () => {
    const pack = rulesPack(p => { p.planets.t1 = { ...p.planets.t1, tech: ['biotic'] }; });
    const claim = expedition('tech', { planets: ['t1'], tradeGoods: 0 });
    expect(codesOf(rulesGame({ entries: [claim] }), pack, claim)).toContain('expeditionUnpaid');
  });

  test('expedition 4.6: the trade good slice takes exactly three trade goods and no planet', () => {
    const pack = rulesPack();
    const claim = expedition('tg3', { planets: ['h1'], tradeGoods: 0 });
    const game = rulesGame({ entries: [adjust({ tradeGoods: 4 }), claim] });
    expect(codesOf(game, pack, claim)).toEqual([]);
    const { state } = forecast(game, pack);
    expect(state.tradeGoods).toBe(1);
    expect(state.exhausted).not.toContain('h1');
  });

  test('expedition 4.6: fewer than three trade goods is short', () => {
    const pack = rulesPack();
    const claim = expedition('tg3');
    expect(codesOf(rulesGame({ entries: [adjust({ tradeGoods: 2 }), claim] }), pack, claim)).toContain('shortTradeGoods');
  });

  test('expedition 5: I cannot claim the same slice twice, even in a later round', () => {
    const pack = rulesPack();
    const again = expedition('tg3');
    const game = rulesGame({ rounds: [[adjust({ tradeGoods: 6 }), expedition('tg3')], [again]] });
    expect(codesOf(game, pack, again)).toContain('sliceTaken');
  });

  test('expedition 5: a rival cannot claim a slice I claimed', () => {
    const pack = rulesPack();
    const theirs = expedition('res5', NO_PAYMENT, { owner: 'o1' });
    const game = rulesGame({ entries: [adjust({ tradeGoods: 3 }), expedition('tg3'), expedition('res5', { planets: ['h1', 'h2'], tradeGoods: 1 }), theirs], game: { opponents: [RIVAL] } });
    expect(codesOf(game, pack, theirs)).toContain('sliceTaken');
  });

  test('expedition 5: a slice recorded as mine in the game cannot be claimed again by the plan', () => {
    const pack = rulesPack();
    const claim = expedition('tg3');
    const game = rulesGame({ entries: [adjust({ tradeGoods: 3 }), claim], game: { expedition: { slices: { tg3: 'me' }, thundersEdgeSystem: null } } });
    expect(codesOf(game, pack, claim)).toContain('sliceTaken');
  });

  test('expedition 5: no more than one slice per turn: two expedition acts in one turn warn', () => {
    const pack = rulesPack();
    const turn = tactical(HOME, { acts: [
      { kind: 'expedition', sliceId: 'tg3', payment: NO_PAYMENT },
      { kind: 'expedition', sliceId: 'res5', payment: { planets: ['h1', 'h2'], tradeGoods: 1 } },
    ] });
    const game = rulesGame({ units: { [HOME]: { carrier: 1 } }, entries: [adjust({ tradeGoods: 4 }), turn] });
    expect(codesOf(game, pack, turn)).toContain('expeditionTwicePerTurn');
  });

  test('expedition 5: one slice in each of two turns is allowed', () => {
    const pack = rulesPack();
    const second = expedition('res5', { planets: ['h1', 'h2'], tradeGoods: 1 });
    const game = rulesGame({ entries: [adjust({ tradeGoods: 4 }), expedition('tg3'), second] });
    expect(codesOf(game, pack, second)).not.toContain('expeditionTwicePerTurn');
  });

  test('expedition 4: what an expedition act fails to pay is said by the expedition, not by the payment of the action', () => {
    const pack = rulesPack();
    const claim = expedition('res5', { planets: ['h1'], tradeGoods: 0 });
    const game = rulesGame({ entries: [claim] });
    const warning = forecast(game, pack).warnings[claim.id].find(w => w.code === 'shortResources');
    expect(warning?.step).toBe('expedition');
  });

  test.todo('expedition 5.1: with the breakthrough already held a slice triggers nothing but the last one — not modelled: breakthroughs are not tracked');

  test('expedition 6: once Thunder\'s Edge is placed its system holds the Thunder\'s Edge planet', () => {
    const pack = tePack();
    const game = rulesGame({ map: { [HOME]: 'r-home', [TARGET]: '46' }, game: { expansions: ['pok', 'te'], expedition: { slices: {}, thundersEdgeSystem: TARGET } } });
    expect(systemPlanets(game, TARGET, pack).map(p => p.id)).toEqual(['thundersedge']);
  });

  test.todo('expedition 6.1: the tokens on the expedition go back to reinforcements, noting who claimed most — not modelled: control tokens on the expedition are not tracked');

  test('expedition 6.2: Thunder\'s Edge goes in a system with no planet, supernova or printed wormhole', () => {
    const tile = (id: string) => te.tiles[id];
    expect(validThundersEdgeSystem(tile('46'))).toBe(true);
    // Other anomalies are allowed.
    expect(validThundersEdgeSystem(tile('41'))).toBe(true);
    expect(validThundersEdgeSystem(tile('42'))).toBe(true);
    expect(validThundersEdgeSystem(tile('44'))).toBe(true);
    expect(validThundersEdgeSystem(tile('114'))).toBe(true);
    expect(validThundersEdgeSystem(tile('109'))).toBe(false);
    expect(validThundersEdgeSystem(tile('43'))).toBe(false);
    expect(validThundersEdgeSystem(tile('39'))).toBe(false);
    expect(validThundersEdgeSystem(tile('113'))).toBe(false);
  });

  test('expedition 6.2: Thunder\'s Edge cannot go in a system of the Fracture, empty ones included', () => {
    const empty = Object.values(te.tiles).filter(t => t.kind === 'fracture' && t.planetIds.length === 0);
    expect(empty.length).toBeGreaterThan(0);
    for (const tile of empty) expect(validThundersEdgeSystem(tile)).toBe(false);
  });

  test.todo('expedition 6.3: the player with most slices puts that many infantry on Thunder\'s Edge and gains control of it — not modelled: placing Thunder\'s Edge sets no units or control');
  test.todo('expedition 6.4: a frontier token under Thunder\'s Edge stays — not modelled: frontier tokens and exploration are not tracked');
  test.todo('expedition 7: once Thunder\'s Edge is placed an expedition no longer gives the breakthrough — not modelled: breakthroughs are not tracked');
});
