/** LRR 63 PDS. Source: tirules2 rules-reference/pds.md. */
import { describe, expect, test } from 'vitest';
import { CARD } from '../../strategy';
import type { Game } from '../../types';
import { codesOf, forecast, HOME, NEAR, primary, rulesGame, rulesPack, tactical, TARGET } from '../kit';
import { planetStructureWarnings } from '../../../testing/old/domain/replay/structures';

const pack = rulesPack();

/** One opponent, whose home tile is an empty system: they hold no planets until a test gives them some. */
const RIVAL = 'rival';
const rivalPack = rulesPack(p => {
  p.factions['rules-rival'] = { id: 'rules-rival', name: 'Rules Rival', homeTile: 'r-empty', startUnits: {}, startingTech: [], commodities: 3, abilities: [] };
});
const withRival = (extra: Partial<Game> = {}): Partial<Game> => ({
  opponents: [{ id: RIVAL, faction: 'rules-rival', vp: 0, seat: 2, color: 2 }], ...extra,
});

describe('LRR 63 PDS', () => {
  test.todo('63.1: each PDS has Space Cannon — not modelled: structures carry no statistics in the pack, and space cannon rolls are not planned');

  test('63.2: the Construction primary places a PDS on a planet', () => {
    const play = primary(CARD.construction, { structures: [{ kind: 'pds', planetId: 'h1' }] });
    expect(forecast(rulesGame({ entries: [play] }), pack).state.pds.h1).toBe(1);
  });

  test('63.3 / 85.5: a planet holds at most two PDS', () => {
    const play = primary(CARD.construction, { structures: [{ kind: 'pds', planetId: 'h1' }] });
    expect(codesOf(rulesGame({ entries: [play], game: { pds: { h1: 2 } } }), pack, play)).toContain('structureLimit');
  });

  test('63.3: the board itself warns about a third PDS on a planet, mine or an opponent’s, and allows two', () => {
    const state = forecast(rulesGame({ game: { pds: { h1: 3 } } }), pack).state;
    expect(planetStructureWarnings(state, ['h1']).map(w => w.code)).toEqual(['structureLimit']);
    expect(planetStructureWarnings({ ...state, pds: { h1: 2 } }, ['h1'])).toEqual([]);
    expect(planetStructureWarnings({ ...state, pds: {}, rivals: { [RIVAL]: { ...state, pds: { h1: 3 } } } }, ['h1'])).toHaveLength(1);
  });

  test('63.3: two PDS on one planet are allowed', () => {
    const play = primary(CARD.construction, { structures: [{ kind: 'pds', planetId: 'h1' }] });
    const game = rulesGame({ entries: [play], game: { pds: { h1: 1 } } });
    expect(codesOf(game, pack, play)).toEqual([]);
    expect(forecast(game, pack).state.pds.h1).toBe(2);
  });

  test('63.4: my PDS on a planet without my ground forces is destroyed when an opponent lands there', () => {
    const landing = tactical(HOME, { landings: [{ planetId: 'h1', units: { infantry: 1 } }] }, { owner: RIVAL });
    const game = rulesGame({ entries: [landing], game: withRival({ pds: { h1: 1 }, enemyUnits: { [HOME]: { [RIVAL]: { carrier: 1, infantry: 1 } } } }) });
    const { state } = forecast(game, rivalPack);
    expect(state.control.h1).toBe('enemy');
    expect(state.pds.h1 ?? 0).toBe(0);
  });

  test('63.4: an opponent\'s PDS is destroyed when I land on its planet with none of their ground forces, so it does not become mine', () => {
    const invade = tactical(TARGET, {
      moves: [{ from: NEAR, units: { carrier: 1, infantry: 1 } }], landings: [{ planetId: 't1', units: { infantry: 1 } }],
    });
    const game = rulesGame({
      units: { [NEAR]: { carrier: 1, infantry: 1 } }, entries: [invade],
      game: withRival({ pds: { t1: 1 }, planetControl: { t1: 'enemy' }, planetOwner: { t1: RIVAL } }),
    });
    const { state } = forecast(game, rivalPack);
    expect(state.control.t1).toBe('me');
    expect(state.pds.t1 ?? 0).toBe(0);
  });

  test.todo('63 note 1: a PDS is both a structure and a unit — not modelled: structures are kept apart from units and nothing refers to the distinction');
  test.todo('63 note 2: a PDS has Planetary Shield — not modelled: bombardment is not planned');
});
