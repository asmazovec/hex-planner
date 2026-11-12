/** LRR 24 Construction. Source: tirules2 rules-reference/construction.md. */
import { describe, expect, test } from 'vitest';
import { CARD } from '../../strategy';
import { codesOf, forecast, HOME, primary, rulesGame, rulesPack, secondary, tactical, TARGET } from '../kit';

const pack = rulesPack();

describe('LRR 24 Construction', () => {
  test('24.1: the primary is played as a strategic action and costs no token on one\'s own card', () => {
    const play = primary(CARD.construction, { structures: [{ kind: 'pds', planetId: 'h1' }] });
    const game = rulesGame({ entries: [play] });
    expect(forecast(game, pack).state.strategy).toBe(2);
    expect(codesOf(game, pack, play)).toEqual([]);
  });

  test('24.2: the primary places one PDS or space dock, then may place one more PDS', () => {
    const play = primary(CARD.construction, { structures: [{ kind: 'spacedock', planetId: 'h1' }, { kind: 'pds', planetId: 'h1' }] });
    const game = rulesGame({ entries: [play] });
    const { state } = forecast(game, pack);
    expect(state.docks).toContain('h1');
    expect(state.pds.h1).toBe(1);
    expect(codesOf(game, pack, play)).toEqual([]);
  });

  test('24.2: the primary cannot place two space docks', () => {
    const play = primary(CARD.construction, { structures: [{ kind: 'spacedock', planetId: 'h1' }, { kind: 'spacedock', planetId: 'h2' }] });
    expect(codesOf(rulesGame({ entries: [play] }), pack, play)).toContain('structureLimit');
  });

  test('24.2: the primary places at most two structures', () => {
    const play = primary(CARD.construction, {
      structures: [{ kind: 'pds', planetId: 'h1' }, { kind: 'pds', planetId: 'h2' }, { kind: 'pds', planetId: 'h2' }],
    });
    expect(codesOf(rulesGame({ entries: [play] }), pack, play)).toContain('structureLimit');
  });

  test('24.2.1: both structures of the primary may go on the same planet', () => {
    const play = primary(CARD.construction, { structures: [{ kind: 'pds', planetId: 'h1' }, { kind: 'pds', planetId: 'h1' }] });
    const game = rulesGame({ entries: [play] });
    expect(forecast(game, pack).state.pds.h1).toBe(2);
    expect(codesOf(game, pack, play)).toEqual([]);
  });

  test('24.2.2: the primary builds in a system holding the player\'s command token as in any other', () => {
    const activate = tactical(TARGET);
    const play = primary(CARD.construction, { structures: [{ kind: 'pds', planetId: 't1' }] });
    const game = rulesGame({ entries: [activate, play], game: { planetControl: { t1: 'me' } } });
    expect(codesOf(game, pack, play)).toEqual([]);
  });

  test('24.2 / 24.3: structures go on planets the player controls', () => {
    const play = primary(CARD.construction, { structures: [{ kind: 'pds', planetId: 't1' }] });
    expect(codesOf(rulesGame({ entries: [play] }), pack, play)).toContain('structureNotControlled');
  });

  test('24.3: the secondary places its token in the chosen system before Thunder\'s Edge', () => {
    const play = secondary(CARD.construction, { systemId: HOME, structures: [{ kind: 'pds', planetId: 'h1' }] });
    expect(forecast(rulesGame({ entries: [play] }), pack).state.tokensOnMap).toEqual([HOME]);
  });

  test('24.3: the secondary places exactly one structure', () => {
    const play = secondary(CARD.construction, { systemId: HOME, structures: [{ kind: 'pds', planetId: 'h1' }, { kind: 'pds', planetId: 'h2' }] });
    expect(codesOf(rulesGame({ entries: [play] }), pack, play)).toContain('structureLimit');
  });

  test('24.3: the secondary spends a strategy token, which goes back to reinforcements when the system already holds one', () => {
    const activate = tactical(HOME);
    const play = secondary(CARD.construction, { systemId: HOME, structures: [{ kind: 'pds', planetId: 'h1' }] });
    const { state } = forecast(rulesGame({ entries: [activate, play] }), pack);
    expect(state.strategy).toBe(1);
    expect(state.tokensOnMap).toEqual([HOME]);
  });

  test('24.3: the secondary\'s structure stands on a planet in the system that got the token', () => {
    const play = secondary(CARD.construction, { systemId: HOME, structures: [{ kind: 'pds', planetId: 't1' }] });
    const game = rulesGame({ entries: [play], game: { planetControl: { t1: 'me' } } });
    expect(codesOf(game, pack, play)).toContain('structureOutsideSystem');
  });

  test('24.3: with Thunder\'s Edge the secondary places no token', () => {
    const play = secondary(CARD.construction, { systemId: HOME, structures: [{ kind: 'pds', planetId: 'h1' }] });
    const game = rulesGame({ entries: [play], game: { expansions: ['pok', 'te'] } });
    expect(forecast(game, pack).state.tokensOnMap).toEqual([]);
  });

  test('24.4: structures come from reinforcements: a seventh PDS is warned about', () => {
    const play = primary(CARD.construction, { structures: [{ kind: 'pds', planetId: 'h1' }] });
    const game = rulesGame({ entries: [play], game: { pds: { h2: 2, t1: 2, t2: 2 }, planetControl: { t1: 'me', t2: 'me' } } });
    expect(codesOf(game, pack, play)).toContain('structureLimit');
  });

  test.todo('24.4.1: with none in reinforcements a structure may be taken from a system without the player\'s command token — not modelled: structures off the board are not counted');

  test('24 note 1: a planet holds at most one space dock', () => {
    const play = primary(CARD.construction, { structures: [{ kind: 'spacedock', planetId: 'h1' }] });
    expect(codesOf(rulesGame({ entries: [play], game: { docks: ['h1'] } }), pack, play)).toContain('structureLimit');
  });

  test('24 note 2: a planet holds at most two PDS', () => {
    const play = primary(CARD.construction, { structures: [{ kind: 'pds', planetId: 'h1' }] });
    expect(codesOf(rulesGame({ entries: [play], game: { pds: { h1: 2 } } }), pack, play)).toContain('structureLimit');
  });

  test('24.3: the secondary places a structure, never units: units built through it are warned about', () => {
    const play = secondary(CARD.construction, { structures: [{ kind: 'pds', planetId: 'h1' }], production: { systemId: HOME, units: { cruiser: 1 } } });
    expect(codesOf(rulesGame({ entries: [play] }), pack, play)).toContain('constructionUnits');
  });

  test('24.2, 67.1, 89.5: units entered on the primary, which produces nothing, are warned of and limited by the Production of their system', () => {
    const play = primary(CARD.construction, { structures: [{ kind: 'spacedock', planetId: 'h2' }], production: { systemId: HOME, units: { fighter: 4 } } });
    const codes = codesOf(rulesGame({ entries: [play] }), pack, play);
    expect(codes).toContain('productionNotAllowed');
    expect(codes).toContain('productionOver');
  });

  test('24.2: a primary without units is not warned of that', () => {
    const play = primary(CARD.construction, { structures: [{ kind: 'pds', planetId: 'h1' }] });
    expect(codesOf(rulesGame({ entries: [play] }), pack, play)).not.toContain('productionNotAllowed');
  });

  test.todo('24 note 3: no structure on a planet with Demilitarized Zone attached — not modelled: attachments are not in the data');
});
