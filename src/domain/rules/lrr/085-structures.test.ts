/** LRR 85 Structures. Source: tirules2 rules-reference/structures.md. */
import { describe, expect, test } from 'vitest';
import { CARD } from '../../strategy';
import { codesOf, forecast, HOME, primary, rulesGame, rulesPack, secondary } from '../kit';

const pack = rulesPack();

describe('LRR 85 Structures', () => {
  test('85 (intro): PDS and space docks are the structures, kept apart from the units that move', () => {
    expect(pack.structures.map(s => s.id).sort()).toEqual(['pds', 'spacedock']);
  });

  test('85.1: structures stand on planets: what Construction builds is counted by planet', () => {
    const play = primary(CARD.construction, { structures: [{ kind: 'spacedock', planetId: 'h2' }, { kind: 'pds', planetId: 'h1' }] });
    const { state } = forecast(rulesGame({ entries: [play] }), pack);
    expect(state.docks).toContain('h2');
    expect(state.pds).toEqual({ h1: 1 });
  });

  test.todo('85.1.1: the Saar Floating Factory stands in space — not modelled: docks are kept by planet only');

  test('85.2: the Construction secondary places a structure too', () => {
    const play = secondary(CARD.construction, { systemId: HOME, structures: [{ kind: 'pds', planetId: 'h2' }] });
    expect(forecast(rulesGame({ entries: [play] }), pack).state.pds).toEqual({ h2: 1 });
  });

  test('85.3: structures cannot move or be carried: they are no unit a move can name', () => {
    expect(Object.keys(pack.units)).not.toContain('pds');
    expect(Object.keys(pack.units)).not.toContain('spacedock');
  });

  test('85.4: a second space dock on a planet, built later in the plan, is warned about', () => {
    const second = secondary(CARD.construction, { systemId: HOME, structures: [{ kind: 'spacedock', planetId: 'h1' }] });
    const game = rulesGame({ entries: [primary(CARD.construction, { structures: [{ kind: 'spacedock', planetId: 'h1' }] }), second] });
    expect(codesOf(game, pack, second)).toContain('structureLimit');
  });

  test('85.5: a third PDS on a planet, built later in the plan, is warned about', () => {
    const third = secondary(CARD.construction, { systemId: HOME, structures: [{ kind: 'pds', planetId: 'h1' }] });
    const game = rulesGame({ entries: [primary(CARD.construction, { structures: [{ kind: 'pds', planetId: 'h1' }, { kind: 'pds', planetId: 'h1' }] }), third] });
    expect(codesOf(game, pack, third)).toContain('structureLimit');
  });

  test('85.6: a structure that would exceed the limit within one entry is warned about', () => {
    const play = primary(CARD.construction, { structures: [{ kind: 'pds', planetId: 'h1' }, { kind: 'pds', planetId: 'h1' }] });
    expect(codesOf(rulesGame({ entries: [play], game: { pds: { h1: 1 } } }), pack, play)).toContain('structureLimit');
  });
});
