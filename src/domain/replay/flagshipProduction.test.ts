import { describe, expect, test } from 'vitest';
import { bench, TARGET, tactical, warningsOf } from '../effects/components/kit';

// Duha Menaimon (Arborec flagship): "After you activate this system, you may produce up to 5 units in this system."
// Checks: the flagship stands in the active system, which holds no dock; five units are produced and placed on the planet there.
// Why the check is redundant here: the flagship is the producer, so neither "no producing unit" nor "no dock for the infantry" is a breach.
describe('the Arborec flagship produces in its own system', () => {
  const build = (count: number) => tactical(TARGET, { production: { infantry: count }, productionGround: { t1: { infantry: count } } });
  const table = (count: number, flagship: number) => {
    const entry = build(count);
    return { entry, ...bench({ faction: 'arborec', units: { [TARGET]: { flagship } }, game: { planetControl: { t1: 'me' } }, entries: [entry] }) };
  };
  const codes = (t: ReturnType<typeof table>) => warningsOf(t, t.entry).map(w => w.code);

  test('five units next to the flagship: no noProduction, no productionOver, no productionPlace', () => {
    const t = table(5, 1);
    for (const code of ['noProduction', 'productionOver', 'productionPlace']) expect(codes(t), code).not.toContain(code);
  });

  test('six units are over its 5', () => {
    expect(codes(table(6, 1))).toContain('productionOver');
  });

  test('without the flagship there is still no producer', () => {
    expect(codes(table(1, 0))).toContain('noProduction');
  });
});
