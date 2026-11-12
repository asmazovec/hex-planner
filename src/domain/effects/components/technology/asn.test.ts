import { describe, expect, test } from 'vitest';
import { bench, effect, expectStanding, quote, TARGET, tactical, warningsOf } from '../kit';
import { id } from './asn';

describe('technology:asn Agency Supply Network', () => {
  // LRR 67.1 / 89.4: during a tactical action the active player produces with the PRODUCTION of their units in the
  //  active system only.
  // Checks: production entered in a system without a dock of mine is warned of, ASN held or not.
  // Why the check is NOT redundant here: ASN gives a second production in another system beside one resolved; it
  // does not let the active system produce without a unit that has PRODUCTION.
  test('technology:asn does not let a system without a dock of mine produce', () => {
    const build = tactical(TARGET, { production: { cruiser: 1 } });
    const table = bench({ faction: 'keleresm', expansions: ['pok'], start: { technologies: [id] }, entries: [build], game: { docks: ['h1'] } });
    quote(table.pack, id, 'you may resolve another of your unit\'s PRODUCTION abilities in any system');
    expectStanding(warningsOf(table, build), 'noProduction');
  });

  test.todo('technology:asn a second PRODUCTION in any system, once per action: a tactical entry produces in its active system only and has no field for a production elsewhere (pass 2: a field of the entry, the units placed there, the limit of that unit, the cost added to the payment)');

  // "Once per action, when you resolve a unit's PRODUCTION ability, you may resolve another"
  // Checks: the technology will be played by naming it with the action whose production it extends.
  test.fails('technology:asn is a play effect', () => {
    const { pack } = bench({ faction: 'keleresm', expansions: ['pok'] });
    expect(effect(pack, id).tier).toBe('play');
  });
});
